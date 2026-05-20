import { computed, inject, Injectable, signal } from '@angular/core';
import { Client, GatewayBalancesResponse } from 'xrpl';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { StorageService } from '../shared/local-storage/storage.service';
import { ConnectionStatus, MptInfoResponse, Token } from '../../models/interface-items.model';
import { ToastService } from '../utils/toast/toast.service';

@Injectable({
     providedIn: 'root',
})
export class XrplService {
     private readonly storageService = inject(StorageService);
     private readonly toastService = inject(ToastService);

     // Private signals (internal state)
     private readonly client = signal<Client | null>(null);
     private readonly connectionStatus = signal<ConnectionStatus>('disconnected');
     private readonly connectionMessage = signal<string>('Disconnected');
     private readonly tokens = signal<Token[]>([]);
     private connectingPromise: Promise<xrpl.Client> | null = null;
     private reconnectAttempts = 0;
     private reconnectTimeout: any = null;

     // Public readonly signals (exposed to components)
     readonly connectionStatus$ = this.connectionStatus.asReadonly();
     readonly connectionMessage$ = this.connectionMessage.asReadonly();
     readonly tokens$ = this.tokens.asReadonly();

     // Computed values
     readonly isConnected = computed(() => this.connectionStatus() === 'connected');
     readonly isConnecting = computed(() => this.connectionStatus() === 'connecting');
     readonly isDisconnected = computed(() => this.connectionStatus() === 'disconnected');
     readonly tokenCount = computed(() => this.tokens().length);
     readonly latestTokens = computed(() => this.tokens().slice(0, 10));

     async getClient(): Promise<xrpl.Client> {
          // CASE 1: Already connected → return immediately
          const currentClient = this.client();
          if (currentClient?.isConnected()) {
               return currentClient;
          }

          // CASE 2: Already trying to connect → return the existing promise
          if (this.connectingPromise) {
               return this.connectingPromise;
          }

          // CASE 3: Need to (re)connect
          this.connectingPromise = this.connectWithRetry();

          try {
               const newClient = await this.connectingPromise;
               this.client.set(newClient);
               return newClient;
          } finally {
               this.connectingPromise = null;
          }
     }

     private async connectWithRetry(): Promise<xrpl.Client> {
          const { net } = this.getNet();
          const maxRetries = 5;
          const baseDelay = 1000;

          console.log(`Attempting to connect to: ${net}`);
          this.setStatus('connecting', `Connecting to ${this.getNetworkName()}...`);

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
               const client = new xrpl.Client(net, {
                    connectionTimeout: 10000,
                    timeout: 10000,
                    headers: {
                         'User-Agent': 'Your-App-Name/1.0',
                    },
               });

               client.on('connected', () => {
                    console.log(`Connected to ${net}`);
               });

               client.on('error', error => {
                    console.error(`Client error on ${net}:`, error);
               });

               try {
                    console.log(`Connection attempt ${attempt}/${maxRetries} to ${net}`);

                    // Update status with retry count
                    if (attempt > 1) {
                         this.setStatus('connecting', `Connection attempt ${attempt}/${maxRetries} to ${this.getNetworkName()}...`);
                    }

                    const connectPromise = client.connect();
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 15_000));

                    await Promise.race([connectPromise, timeoutPromise]);

                    const serverInfo = await client.request({ command: 'server_info' });
                    console.log(`Connected successfully to ${net}`, {
                         version: serverInfo.result.info?.build_version,
                         ledger: serverInfo.result.info?.validated_ledger?.seq,
                    });

                    this.client.set(client);
                    this.setStatus('connected', `Connected to ${this.getNetworkName()}`);

                    client.on('disconnected', code => {
                         console.warn('XRPL client disconnected:', code);
                         this.setStatus('disconnected', 'Connection lost');
                         this.client.set(null);
                         this.scheduleReconnect();
                    });

                    return client;
               } catch (error: any) {
                    console.error(`XRPL connection attempt ${attempt}/${maxRetries} failed:`, {
                         message: error.message,
                         net: net,
                         attempt: attempt,
                    });

                    // Show retry warning toast
                    if (attempt < maxRetries) {
                         this.toastService.warn(`Connection attempt ${attempt}/${maxRetries} failed. Retrying...`, AppConstants.TOAST.WARN);
                    }

                    try {
                         await client.disconnect();
                    } catch (disconnectError: any) {
                         console.error(`Disconnection error: ${disconnectError.message}`);
                    }

                    if (attempt === maxRetries) {
                         const msg = `Failed to connect to ${this.getNetworkName()} after ${maxRetries} attempts`;
                         this.setStatus('disconnected', msg);
                         throw new Error(msg);
                    }

                    const delay = baseDelay * Math.pow(2, attempt - 1);
                    const jitter = Math.random() * 1000;
                    const totalDelay = delay + jitter;

                    console.log(`Retrying in ${Math.round(totalDelay)}ms...`);
                    await new Promise(resolve => setTimeout(resolve, totalDelay));
               }
          }

          throw new Error('Unexpected connection failure');
     }

     private scheduleReconnect() {
          if (this.reconnectTimeout) {
               clearTimeout(this.reconnectTimeout);
          }

          const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000);
          this.reconnectAttempts++;

          console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

          this.reconnectTimeout = setTimeout(async () => {
               try {
                    await this.getClient();
                    this.reconnectAttempts = 0;
               } catch (error) {
                    console.error('Reconnection failed:', error);
                    if (this.reconnectAttempts < 10) {
                         this.scheduleReconnect();
                    }
               }
          }, delay);
     }

     private setStatus(status: ConnectionStatus, message: string) {
          this.connectionStatus.set(status);
          this.connectionMessage.set(message);

          // Show toast for connection status changes
          if (status === 'connected') {
               this.toastService.success(`${message}`, AppConstants.TOAST.CONNECTION, false);
               console.warn('XRPL connection status:', message);
          } else if (status === 'disconnected') {
               console.warn('XRPL connection status:', message);
          } else if (status === 'connecting') {
               this.toastService.info(`${message}`, AppConstants.TOAST.INFO);
               console.warn('XRPL connection status:', message);
          }
     }

     async ensureConnection(): Promise<Client> {
          const client = await this.getClient();

          if (!client?.isConnected()) {
               throw new Error('No active connection to XRPL network. Please wait for connection to establish.');
          }

          return client;
     }

     isConnectionReady(): boolean {
          const client = this.client();
          return client?.isConnected() === true;
     }

     getConnectionStatus(): { isConnected: boolean; status: ConnectionStatus; message: string } {
          return {
               isConnected: this.isConnectionReady(),
               status: this.connectionStatus(),
               message: this.connectionMessage(),
          };
     }

     async disconnect() {
          const currentClient = this.client();
          if (currentClient) {
               await currentClient.disconnect();
               this.client.set(null);
          }
          this.setStatus('disconnected', 'Disconnected');
          if (this.reconnectTimeout) {
               clearTimeout(this.reconnectTimeout);
               this.reconnectTimeout = null;
          }
     }

     private getNetworkName(): string {
          const net = this.storageService.getNet().environment;
          return net.charAt(0).toUpperCase() + net.slice(1);
     }

     getCurrentStatus(): ConnectionStatus {
          return this.connectionStatus();
     }

     getCurrentMessage(): string {
          return this.connectionMessage();
     }

     getNet() {
          return this.storageService.getNet();
     }

     async getXrplServerInfo(client: Client, ledgerIndex: xrpl.LedgerIndex, type: string) {
          try {
               const response = await client.request({
                    command: 'server_info',
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error(`Error fetching ledger server info:: ${error}`);
               throw new Error(`Error fetching ledger server info:: ${error.message || 'Unknown error'}`);
          }
     }

     async getTxData(client: Client, transactionData: string) {
          try {
               const response = await client.request({
                    command: 'tx',
                    transaction: transactionData,
               });
               return response;
          } catch (error: any) {
               console.error(`Error fetching ${transactionData} data: ${error}`);
               throw new Error(`Failed to fetch trasnaction data: ${error.message || 'Unknown error'}`);
          }
     }

     async getXrplServerState(client: Client, ledgerIndex: xrpl.LedgerIndex, type: string) {
          try {
               const response = await client.request({
                    command: 'server_state',
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching xrpl server state:', error);
               throw new Error(`Failed to fetch Ripple server state: ${error.message || 'Unknown error'}`);
          }
     }

     async getLastLedgerIndex(client: Client): Promise<number> {
          try {
               const response = await client.request({
                    command: 'ledger',
                    ledger_index: 'validated',
               });
               return response.result.ledger_index;
          } catch (error: any) {
               console.error('Error fetching last ledger index:', error);
               throw new Error(`Failed to fetch Ripple last ledger index: ${error.message || 'Unknown error'}`);
          }
     }

     async getLedgerCloseTime(client: xrpl.Client): Promise<number> {
          try {
               const response = await client.request({
                    command: 'ledger',
                    ledger_index: 'current',
               });
               return response.result.ledger.close_time;
          } catch (error: any) {
               console.error('Error fetching ledger close time:', error);
               throw new Error(`Failed to fetch Ripple ledger close time: ${error.message || 'Unknown error'}`);
          }
     }

     async getXrplReserve(client: xrpl.Client) {
          try {
               const ledger_info = await this.getXrplServerState(client, 'current', '');
               const ledgerData = ledger_info.result.state.validated_ledger;
               if (!ledgerData) {
                    throw new Error('validated_ledger is undefined in server_state');
               }
               const reserveBaseXRP = ledgerData.reserve_base;
               const reserveIncrementXRP = ledgerData.reserve_inc;

               return { reserveBaseXRP, reserveIncrementXRP };
          } catch (error: any) {
               console.error('Error:', error);
               return undefined;
          }
     }

     async getAccountReserves(client: xrpl.Client, accountInfo: any, address: string): Promise<{ ownerCount: number; totalReserveXRP: number } | undefined> {
          try {
               const accountData = accountInfo.result.account_data;
               const ownerCount = Number(accountData.OwnerCount || 0);

               const reserveData = await this.getXrplReserve(client);
               if (!reserveData) {
                    throw new Error('Failed to fetch XRPL reserve data');
               }

               const { reserveBaseXRP, reserveIncrementXRP } = reserveData;

               // Calculate total in XRP units directly
               const totalReserveXRP = reserveBaseXRP + ownerCount * reserveIncrementXRP;

               return { ownerCount, totalReserveXRP };
          } catch (error: any) {
               console.error('Error in getAccountReserves:', error);
               return undefined;
          }
     }

     async updateOwnerCountAndReserves(client: xrpl.Client, accountInfo: any, address: string): Promise<{ ownerCount: string; totalXrpReserves: string }> {
          const reserves = await this.getAccountReserves(client, accountInfo, address);
          let ownerCount = '0';
          let totalXrpReserves = '0';
          if (reserves) {
               ownerCount = reserves.ownerCount.toString();
               totalXrpReserves = String(xrpl.dropsToXrp(reserves.totalReserveXRP));
               console.debug(`Owner Count: ${ownerCount} Total XRP Reserves: ${totalXrpReserves}`);
          }
          return { ownerCount, totalXrpReserves };
     }

     async getCurrentRippleTime(client: Client): Promise<number> {
          try {
               // Fetch the latest validated ledger info
               const ledgerResponse = await client.request({
                    command: 'ledger',
                    ledger_index: 'validated',
               });

               // Extract the ledger close time (in Ripple time)
               return ledgerResponse.result.ledger.close_time;
          } catch (error: any) {
               console.error('Error fetching Ripple time:', error);
               throw new Error(`Failed to fetch Ripple time: ${error.message || 'Unknown error'}`);
          }
     }

     async getLedgerInfo(client: Client): Promise<any> {
          try {
               // Make parallel requests for different ledger types
               const [validatedResponse, currentResponse] = await Promise.all([
                    client.request({
                         command: 'ledger',
                         ledger_index: 'validated',
                    }),
                    client.request({
                         command: 'ledger',
                         ledger_index: 'current',
                    }),
               ]);

               return {
                    lastIndex: validatedResponse.result.ledger_index,
                    closeTime: currentResponse.result.ledger.close_time,
                    currentRippleTime: validatedResponse.result.ledger.close_time,
               };
          } catch (error: any) {
               console.error(`Error fetching LedgerInfo:`, error);
               throw new Error(`Failed to fetch LedgerInfo: ${error.message || 'Unknown error'}`);
          }
     }

     async getTransactionFee(client: Client): Promise<string> {
          try {
               const response = await client.request({
                    command: 'fee',
                    ledger_index: 'closed',
               });
               return response.result.drops.open_ledger_fee;
          } catch (error: any) {
               console.error('Error fetching fee:', error);
               throw new Error(`Failed to fetch Ripple fee: ${error.message || 'Unknown error'}`);
          }
     }

     async calculateTransactionFee(client: xrpl.Client) {
          try {
               const feeResponse = await this.getTransactionFee(client);
               const baseFee = feeResponse || AppConstants.MIN_FEE;
               const fee = Math.min(Number.parseInt(baseFee) * 1.5, Number.parseInt(AppConstants.MAX_FEE)).toString();
               if (fee === '1.5') {
                    return AppConstants.MIN_FEE;
               }
               console.log(`Calculated transaction fee: ${fee} drops`);
               return fee;
          } catch (error: any) {
               console.error('Error calculating transaction fee:', error);
               return AppConstants.MIN_FEE; // Fallback to minimum fee in case of error
          }
     }

     async getAccountInfo(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string): Promise<any> {
          try {
               if (type) {
                    const response = await client.request({
                         command: 'account_info',
                         account: address,
                         ledger_index: ledgerIndex,
                         type: type,
                    });
                    return response;
               } else {
                    const response = await client.request({
                         command: 'account_info',
                         account: address,
                         ledger_index: ledgerIndex,
                    });
                    return response;
               }
          } catch (error: any) {
               console.error('Error fetching account info:', error);
               throw new Error(`Failed to fetch account info: ${error.message || 'Unknown error'}`);
          }
     }

     async getAMMInfo(client: Client, asset: any, asset2: any, account: string, ledgerIndex: xrpl.LedgerIndex): Promise<any> {
          try {
               const response = await client.request({
                    command: 'amm_info',
                    asset: asset,
                    asset2: asset2,
                    account: account,
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               if (error.data && error.data?.error === 'actNotFound') {
                    return []; // no AMM created
               }
               console.error('Error fetching amm info:', error);
               throw new Error(`Failed to fetch amm info: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountNFTs(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string): Promise<any> {
          try {
               if (type) {
                    const response = await client.request({
                         command: 'account_nfts',
                         account: address,
                         ledger_index: ledgerIndex,
                         type: type,
                    });
                    return response;
               } else {
                    const response = await client.request({
                         command: 'account_nfts',
                         account: address,
                         ledger_index: ledgerIndex,
                    });
                    return response;
               }
          } catch (error: any) {
               console.error('Error fetching account nft info:', error);
               throw new Error(`Failed to fetch account nft info: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountNFTOffers(client: Client, address: string, ledgerIndex: string, type: string): Promise<any> {
          try {
               const response = await client.request({
                    command: 'account_objects',
                    account: address,
                    ledger_index: 'validated',
                    type: 'nft_offer',
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching account nft offers:', error);
               throw new Error(`Failed to fetch account nft offers: ${error.message || 'Unknown error'}`);
          }
     }

     async getNFTBuyOffers(client: Client, nftId: string): Promise<any> {
          try {
               const response = await client.request({
                    command: 'nft_buy_offers',
                    nft_id: nftId,
               });
               return response;
          } catch (error: any) {
               if (error.data?.error === 'objectNotFound') {
                    return []; // no offers exist
               }
               throw error;
          }
     }

     async getNFTSellOffers(client: Client, nftId: string): Promise<any> {
          try {
               const response = await client.request({
                    command: 'nft_sell_offers',
                    nft_id: nftId,
               });
               return response;
          } catch (error: any) {
               if (error.data?.error === 'objectNotFound') {
                    return []; // no offers exist
               }
               throw error;
          }
     }

     async fetchAllOffersSafe(client: any, method: string, nftId: string): Promise<any[]> {
          let marker: string | undefined = undefined;
          const offers: any[] = [];

          try {
               do {
                    const req: any = { command: method, nft_id: nftId, limit: 200 };
                    if (marker) req.marker = marker;

                    const resp = await client.request(req);
                    if (resp.result.offers) offers.push(...resp.result.offers);

                    marker = resp.result.marker;
               } while (marker);
          } catch (err: any) {
               if (err.data?.error === 'objectNotFound') {
                    return []; // no offers exist
               }
               throw err;
          }

          return offers;
     }

     async getNFTHistory(client: Client, ledgerIndex: xrpl.LedgerIndex, nft_id: string) {
          try {
               const response = await client.request({
                    command: 'nft_history',
                    nft_id: nft_id,
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching gateway_balances:', error);
               throw new Error(`Failed to fetch gateway_balances: ${error.message || 'Unknown error'}`);
          }
     }

     async getNFTsByIssuer(client: Client, ledgerIndex: xrpl.LedgerIndex, nft_id: string, issuer: string) {
          try {
               const response = await client.request({
                    command: 'nfts_by_issuer',
                    nft_id: nft_id,
                    issuer: issuer,
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching gateway_balances:', error);
               throw new Error(`Failed to fetch gateway_balances: ${error.message || 'Unknown error'}`);
          }
     }

     async getChannelVerifiy(client: Client, channelId: string, amount: string, publicKey: string, signature: string): Promise<any> {
          try {
               const response = await client.request({
                    command: 'channel_verify',
                    amount: xrpl.xrpToDrops(amount),
                    public_key: publicKey,
                    signature: signature,
                    channel_id: channelId,
               });
               return response;
          } catch (error: any) {
               console.error('Error verifying channel:', error);
               throw new Error(`Failed to verifying channel: ${error.message || 'Unknown error'}`);
          }
     }

     async getPaymentChannelAuthorized(client: Client, channelId: string, amount: string, wallet: xrpl.Wallet): Promise<any> {
          try {
               const channelAuthorize = await client.request({
                    id: 'channel_authorize_example_id1',
                    command: 'channel_authorize' as any,
                    channel_id: channelId,
                    seed: wallet.seed,
                    key_type: this.storageService.getInputValue('encryptionType') ? AppConstants.ENCRYPTION.ED25519 : AppConstants.ENCRYPTION.SECP256K1,
                    amount: xrpl.xrpToDrops(amount),
               });
               return channelAuthorize;
          } catch (error: any) {
               console.error('Error verifying channel:', error);
               throw new Error(`Failed to verifying channel: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountObjects(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string) {
          try {
               if (type) {
                    const response = await client.request({
                         command: 'account_objects',
                         account: address,
                         ledger_index: ledgerIndex,
                         type: type as xrpl.AccountObjectType,
                    });
                    return response;
               } else {
                    const response = await client.request({
                         command: 'account_objects',
                         account: address,
                         ledger_index: ledgerIndex,
                    });
                    return response;
               }
          } catch (error: any) {
               console.error('Error fetching account objects:', error);
               throw new Error(`Failed to fetch account objects: ${error.message || 'Unknown error'}`);
          }
     }

     async checkAccountObjectsForDeletion(client: Client, address: string) {
          try {
               const response = await client.request({
                    command: 'account_objects',
                    account: address,
                    deletion_blockers_only: true,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching account objects:', error);
               throw new Error(`Failed to fetch account objects: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountLines(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string) {
          try {
               if (type) {
                    const response = await client.request({
                         command: 'account_lines',
                         account: address,
                         ledger_index: ledgerIndex,
                         type: type as xrpl.AccountObjectType,
                    });
                    return response;
               } else {
                    const response = await client.request({
                         command: 'account_lines',
                         account: address,
                         ledger_index: ledgerIndex,
                    });
                    return response;
               }
          } catch (error: any) {
               console.error('Error fetching account lines:', error);
               throw new Error(`Failed to fetch account lines: ${error.message || 'Unknown error'}`);
          }
     }

     async getTokenBalance(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string): Promise<GatewayBalancesResponse> {
          try {
               const response = await client.request({
                    command: 'gateway_balances',
                    account: address,
                    ledger_index: ledgerIndex,
                    // hotwallet: ['rLAm8JW7rmFhMNGW9AbviLh22Pn9oHdU3F'],
               });

               const result = response.result;
               const hasData = (result?.obligations && Object.keys(result.obligations).length > 0) || (result?.balances && Object.keys(result.balances).length > 0) || (result?.assets && Object.keys(result.assets).length > 0);

               if (!hasData) {
                    // Return an empty GatewayBalancesResponse instead of []
                    return {
                         id: 0,
                         type: 'response',
                         result: {
                              account: address,
                              ledger_hash: '',
                              ledger_index: ledgerIndex,
                              obligations: {},
                              balances: {},
                              assets: {},
                         },
                    } as GatewayBalancesResponse;
               }

               return response;
          } catch (error: any) {
               console.warn('Error fetching gateway_balances:', error);
               // Still return a valid empty GatewayBalancesResponse
               return {
                    id: 0,
                    type: 'response',
                    result: {
                         account: address,
                         ledger_hash: '',
                         ledger_index: ledgerIndex,
                         obligations: {},
                         balances: {},
                         assets: {},
                    },
               } as GatewayBalancesResponse;
          }
     }

     async getAccountOffers(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string) {
          try {
               const response = await client.request({
                    command: 'account_offers',
                    account: address,
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching account offers:', error);
               throw new Error(`Failed to fetch account offers: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountChannels(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string) {
          try {
               const response = await client.request({
                    command: 'account_channels',
                    account: address,
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching account channels:', error);
               throw new Error(`Failed to fetch account channels: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountCurrencies(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string) {
          try {
               const response = await client.request({
                    command: 'account_currencies',
                    account: address,
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching account currencies:', error);
               throw new Error(`Failed to fetch account currencies: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountTrustlines(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, type: string) {
          try {
               const response = await client.request({
                    command: 'account_lines',
                    account: address,
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching account trustlines:', error);
               throw new Error(`Failed to fetch account trustlines: ${error.message || 'Unknown error'}`);
          }
     }

     async getMptByIssuanceId(client: Client, issuanceId: string, ledgerIndex: xrpl.LedgerIndex): Promise<MptInfoResponse> {
          try {
               // Cast to any to bypass xrpl's strict Request constraint
               const response = await client.request({
                    command: 'mpt_holders',
                    mpt_issuance_id: issuanceId,
                    ledger_index: ledgerIndex,
               } as any);

               return response;
          } catch (error: any) {
               console.error('Error fetching MPT info:', error);
               throw new Error(`Failed to fetch MPT info: ${error.message || 'Unknown error'}`);
          }
     }

     async doesMptExist(client: Client, mptIssuanceId: string): Promise<any> {
          try {
               const response = await client.request({
                    command: 'ledger_entry',
                    mpt_issuance: mptIssuanceId,
                    ledger_index: 'validated',
               } as any);

               console.log('MPT found:', response.result);

               // return true;
               return response.result;
          } catch (error: any) {
               if (error?.data?.error === 'objectNotFound' || error?.data?.error === 'entryNotFound') {
                    return [];
               }

               console.error('Error fetching MPT info:', error);
               throw new Error(`Failed to fetch MPT info: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountTransactions(client: Client, address: string, limit: any, marker: string) {
          try {
               const response = await client.request({
                    command: 'account_tx',
                    account: address,
                    limit,
                    marker,
                    ledger_index_min: -1, // From account creation (-1 means all history)
                    ledger_index_max: -1,
                    forward: false, // Newest first (easier for recent changes; reverse if needed)
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching account transactions:', error);
               throw new Error(`Failed to fetch account transactions: ${error.message || 'Unknown error'}`);
          }
     }

     async getAccountNoRippleCheck(client: Client, address: string, ledgerIndex: xrpl.LedgerIndex, role: string) {
          try {
               const response = await client.request({
                    command: 'noripple_check',
                    account: address,
                    role: 'gateway',
                    limit: 10,
                    ledger_index: ledgerIndex,
               });
               return response;
          } catch (error: any) {
               console.error('Error fetching account no ripple check:', error);
               throw new Error(`Failed to fetch account no ripple check: ${error.message || 'Unknown error'}`);
          }
     }

     async checkTicketExists(client: xrpl.Client, account: string, ticketSequence: number): Promise<boolean> {
          try {
               // Fetch account objects (tickets)
               const ticket_objects = await this.getAccountObjects(client, account, 'validated', 'ticket');
               console.debug(`Ticket Objects`, ticket_objects);

               // Check if the ticketSequence exists in the ticket_objects array
               const ticketExists = (ticket_objects.result.account_objects || []).some((ticket: any) => ticket.TicketSequence === ticketSequence);

               return ticketExists;
          } catch (error: any) {
               console.error('Error checking ticket: ', error);
               return false; // Return false if there's an error fetching tickets
          }
     }

     async getCheckByCheckId(client: Client, checkId: string, ledgerIndex: xrpl.LedgerIndex): Promise<any> {
          try {
               const response = await client.request({
                    command: 'ledger_entry',
                    index: checkId,
                    ledger_index: ledgerIndex,
               });

               if (response.result.node) {
                    console.log('Check found:', response.result.node);
                    return response.result.node;
               } else {
                    console.log('Check not found');
                    return null;
               }
          } catch (error: any) {
               console.error('Error fetching Check ID:', error);
               return null;
          }
     }

     async getEscrowBySequence(client: xrpl.Client, account: string, sequence: number): Promise<any | null> {
          try {
               const escrowObjects = await this.getAccountObjects(client, account, 'validated', 'escrow');
               for (const [, obj] of escrowObjects.result.account_objects.entries()) {
                    if (obj.PreviousTxnID) {
                         const sequenceTx = await this.getTxData(client, obj.PreviousTxnID);
                         if (sequenceTx.result.tx_json.Sequence === sequence || sequenceTx.result.tx_json.TicketSequence === sequence) {
                              return { ...obj, Sequence: sequenceTx.result.tx_json.Sequence };
                         }
                    }
               }
               return null;
          } catch (error) {
               console.error('Error fetching escrow by sequence nunber:', error);
               return null;
          }
     }

     async getOnlyTokenBalance(client: xrpl.Client, address: string, currency: string): Promise<string> {
          try {
               const response = await this.getAccountLines(client, address, 'validated', '');
               const lines = response.result.lines || [];
               let assetCurrency = currency.length > 3 ? this.decodeCurrencyCode(currency) : currency;
               const tokenLine = lines.find((line: any) => line.currency.toUpperCase() === assetCurrency.toUpperCase());
               return tokenLine ? tokenLine.balance : '0';
          } catch (error: any) {
               console.error('Error fetching token balance:', error);
               throw new Error(`Failed to fetch token balance: ${error.message || 'Unknown error'}`);
          }
     }

     getXrpReserveRequirements(accountInfo: any, server_info: any) {
          try {
               const currentReserve = accountInfo.result.account_data.Reserve;
               const ownerCount = accountInfo.result.account_data.OwnerCount;

               const reserveBaseXrp = server_info.result.info.validated_ledger?.reserve_base_xrp || 10;
               const reserveIncXrp = server_info.result.info.validated_ledger?.reserve_inc_xrp || 2;

               return {
                    baseReserve: reserveBaseXrp,
                    ownerReserve: reserveIncXrp,
                    currentReserve: currentReserve,
                    ownerCount: ownerCount,
               };
          } catch (error: any) {
               console.error('Error fetching XRP reserve requirements:', error);
               throw new Error(`Failed to fetch XRP reserve requirements: ${error.message || 'Unknown error'}`);
          }
     }

     async delay(ms: number) {
          return new Promise(resolve => setTimeout(resolve, ms));
     }

     decodeCurrencyCode(hexCode: string) {
          const buffer = Buffer.from(hexCode, 'hex');
          const trimmed = buffer.subarray(0, buffer.includes(0) ? buffer.indexOf(0) : 20);
          return new TextDecoder().decode(trimmed);
     }
}
