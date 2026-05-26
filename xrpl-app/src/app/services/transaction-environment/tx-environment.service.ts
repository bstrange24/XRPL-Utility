import { Injectable, inject, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { Wallet, WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { ToastService } from '../utils/toast/toast.service';
import { CreateNftStoreService } from '../nft/nft-store/nft-store.service';
import { AmmUtilsService } from '../amm/amm-utils/amm-utils.service';

export interface PrepareTxEnvironmentOptions {
     includeTickets?: boolean;
     includeEscrows?: boolean;
     includeEscrowBySequenceId?: boolean;
     includeChecks?: boolean;
     includeTrustlines?: boolean;
     includeDestinationAccountInfo?: boolean;
     includeDestinationAccountObject?: boolean;
     includeAccountInfo?: boolean;
     includeAccountObject?: boolean;
     includeLedgerIndex?: boolean;
     includeLedgerInfo?: boolean;
     includePaymentChannelObjects?: boolean;
     includeMptObjects?: boolean;
     includeGatewayBalance?: boolean;
     includeNftSellOffers?: boolean;
     includeNftBuyOffers?: boolean;
     includeAmmResponse?: boolean;
     includeParticipation?: boolean;
     includeFee?: boolean;
     includeServerInfo?: boolean;
     includeBlockingObjects?: boolean;
     forceRefresh?: boolean;
     destinationAddress?: string;
     escrowSequenceNumberField?: string;
     // ledgerInfoType?: 'lastIndex' | 'closeTime' | 'currentRippleTime';
     ledgerInfo?: {
          // Change from any to a structured object
          lastIndex: number;
          closeTime: number;
          currentRippleTime: number;
     };
     asset?: xrpl.IssuedCurrencyAmount | xrpl.Currency;
     asset2?: xrpl.IssuedCurrencyAmount | xrpl.Currency;
}

export interface PrepareTxEnvironmentResult {
     client: xrpl.Client;
     wallet: xrpl.Wallet;
     fee?: string;
     currentLedger?: number;
     ledgerInfo?: any;
     accountObjects?: xrpl.AccountObjectsResponse;
     ticketObjects?: xrpl.AccountObjectsResponse;
     escrowObjects?: xrpl.AccountObjectsResponse;
     escrowObjectsBySequenceId?: any;
     checkObjects?: xrpl.AccountObjectsResponse;
     mptObjects?: xrpl.AccountObjectsResponse;
     paymentChannelObjects?: xrpl.AccountObjectsResponse;
     trustlines?: xrpl.AccountLinesResponse;
     accountInfo?: xrpl.AccountInfoResponse;
     destinationAccountInfo?: xrpl.AccountInfoResponse;
     destinationAccountObject?: xrpl.AccountObjectsResponse;
     gatewayBalanceObject?: any;
     nftSellOffersObject?: any;
     nftBuyOffersObject?: any;
     ammResponse?: any;
     participation?: any;
     serverInfo?: any;
     blockingObjects?: any;
}

@Injectable({
     providedIn: 'root',
})
export class TxEnvironmentService {
     private readonly xrplCache = inject(XrplCacheService);
     private readonly xrplService = inject(XrplService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);
     private readonly nftCreateStoreService = inject(CreateNftStoreService);
     private readonly ammUtilsService = inject(AmmUtilsService);
     private readonly DEFAULT_ENV_CONFIG = { includeAccountInfo: true, includeAccountObject: true } as const;
     // private readonly currentEnv = signal<PrepareTxEnvironmentResult | null>(null);
     private readonly lastRefreshTime = signal(0);
     private readonly CACHE_MS = 5000; // 5 seconds -- wide enough to cover sequential async ops on slow connections

     private currentEnv = signal<{ env: PrepareTxEnvironmentResult | null; walletAddress: string; timestamp: number }>({
          env: null,
          walletAddress: '',
          timestamp: 0,
     });

     async refreshEnvironment(options: PrepareTxEnvironmentOptions = {}, force = false): Promise<PrepareTxEnvironmentResult> {
          const now = Date.now();
          const selectedWallet = this.getSelectedWallet();
          const currentWalletAddress = selectedWallet.classicAddress;

          const cached = this.currentEnv();
          const isCacheValid = !force && cached.env && cached.walletAddress === currentWalletAddress && now - cached.timestamp < this.CACHE_MS;

          if (isCacheValid) {
               console.log(`Using cached environment for wallet ${currentWalletAddress.slice(0, 8)}...`);
               // Make sure cached env has accountObjects
               if (!cached?.env?.accountObjects) {
                    console.log('Cached env missing accountObjects, fetching fresh');
                    return this.fetchFreshEnvironment(options, currentWalletAddress);
               }
               return cached.env;
          }

          return this.fetchFreshEnvironment(options, currentWalletAddress);
     }

     private async fetchFreshEnvironment(options: PrepareTxEnvironmentOptions, walletAddress: string): Promise<PrepareTxEnvironmentResult> {
          console.log(`Fetching fresh environment for wallet ${walletAddress.slice(0, 8)}...`);

          // Ensure accountObject is included if not specified
          const fullOptions = {
               ...options,
               includeAccountObject: options.includeAccountObject ?? true,
               includeAccountInfo: options.includeAccountInfo ?? true,
          };

          const env = await this.prepareTxEnvironment(fullOptions);
          this.currentEnv.set({
               env,
               walletAddress,
               timestamp: Date.now(),
          });
          return env;
     }

     // async refreshEnvironment(options: PrepareTxEnvironmentOptions = {}, force = false): Promise<PrepareTxEnvironmentResult> {
     //      // const now = Date.now();

     //      // if (!force && this.currentEnv() && now - this.lastRefreshTime() < this.CACHE_MS) {
     //      //      return this.currentEnv()!;
     //      // }

     //      const env = await this.prepareTxEnvironment(options);
     //      this.currentEnv.set(env);
     //      // this.lastRefreshTime.set(now);
     //      return env;
     // }

     async prepareTxEnvironmentWithWallet(selectedWallet: Wallet, options: PrepareTxEnvironmentOptions = {}): Promise<PrepareTxEnvironmentResult> {
          return this.buildEnvironment(selectedWallet, options);
     }

     async prepareTxEnvironment(options: PrepareTxEnvironmentOptions = {}): Promise<PrepareTxEnvironmentResult> {
          const selectedWallet = this.getSelectedWallet();
          return this.buildEnvironment(selectedWallet, options);
     }

     private async buildEnvironment(selectedWallet: Wallet, options: PrepareTxEnvironmentOptions = {}): Promise<PrepareTxEnvironmentResult> {
          const {
               includeTickets = false,
               includeEscrows = false,
               includeEscrowBySequenceId = false,
               includeChecks = false,
               includeTrustlines = false,
               includeDestinationAccountInfo = false,
               includeDestinationAccountObject = false,
               includeAccountInfo = false,
               includeAccountObject = false,
               includeLedgerIndex = false,
               includeServerInfo = false,
               includeLedgerInfo = false,
               includePaymentChannelObjects = false,
               includeMptObjects = false,
               includeGatewayBalance = false,
               includeNftSellOffers = false,
               includeNftBuyOffers = false,
               includeAmmResponse = false,
               includeParticipation = false,
               includeBlockingObjects = false,
               includeFee = false,
               forceRefresh = false,
               destinationAddress = '',
               escrowSequenceNumberField = '',
               asset,
               asset2,
          } = options;

          const client = await this.xrplCache.getClient(() => this.xrplService.getClient());

          const seed = this.getSeed(selectedWallet);
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(seed, selectedWallet.encryptionAlgorithm as 'ed25519' | 'secp256k1');
          const address = wallet.classicAddress;

          // Parallel promise collection
          const tasks: Partial<Record<keyof PrepareTxEnvironmentResult, Promise<any>>> = {};

          if (includeFee) {
               tasks.fee = this.xrplCache.getFee(this.xrplService, forceRefresh);
          }

          if (includeLedgerIndex) {
               tasks.currentLedger = this.xrplCache.getLedgerIndex(client, forceRefresh);
          }

          if (includeLedgerInfo) {
               tasks.ledgerInfo = this.xrplCache.getLedgerInfo(client, forceRefresh);
          }

          if (includeAccountInfo) {
               tasks.accountInfo = this.xrplCache.getAccountInfo(address, forceRefresh);
          }

          if (includeAccountObject) {
               tasks.accountObjects = this.xrplCache.getAccountObjects(client, address, forceRefresh);
          }

          if (includeTrustlines) {
               tasks.trustlines = this.xrplCache.getAccountLines(client, address, forceRefresh);
          }

          if (includeTickets) {
               tasks.ticketObjects = this.xrplCache.getAccountObjectsWithType(client, address, forceRefresh, 'ticket');
          }

          if (includeEscrows) {
               tasks.escrowObjects = this.xrplCache.getAccountObjectsWithType(client, address, forceRefresh, 'escrow');
          }

          if (includeChecks) {
               tasks.checkObjects = this.xrplCache.getAccountObjectsWithType(client, address, forceRefresh, 'check');
          }

          if (includeMptObjects) {
               tasks.mptObjects = this.xrplCache.getAccountObjectsWithType(client, address, forceRefresh, 'mpt');
          }

          if (includeServerInfo) {
               tasks.serverInfo = this.xrplCache.getServerInfo(this.xrplService);
          }

          if (includeBlockingObjects) {
               tasks.blockingObjects = this.xrplCache.getBlockingObjects(client, address, forceRefresh);
          }

          if (includePaymentChannelObjects) {
               tasks.paymentChannelObjects = this.xrplCache.getAccountObjectsWithType(client, address, forceRefresh, 'payment_channel');
          }

          if (includeGatewayBalance) {
               tasks.gatewayBalanceObject = this.xrplCache.getGatewayBalance(client, address, forceRefresh);
          }

          if (includeNftSellOffers) {
               tasks.nftSellOffersObject = this.xrplService.getNFTSellOffers(client, this.nftCreateStoreService.nftId());
          }

          if (includeNftBuyOffers) {
               tasks.nftBuyOffersObject = this.xrplService.getNFTBuyOffers(client, this.nftCreateStoreService.nftId());
          }

          if (includeAmmResponse) {
               const ammPromise = this.xrplService.getAMMInfo(client, asset, asset2, wallet.classicAddress, 'validated');

               tasks.ammResponse = ammPromise;

               if (includeParticipation) {
                    tasks.participation = ammPromise.then(ammResp => this.ammUtilsService.checkAmmParticipation(true, ammResp));
               }
          }

          if (includeEscrowBySequenceId && escrowSequenceNumberField) {
               tasks.escrowObjectsBySequenceId = this.xrplService.getEscrowBySequence(client, address, Number(escrowSequenceNumberField));
          }

          if (includeDestinationAccountInfo && destinationAddress) {
               tasks.destinationAccountInfo = this.xrplCache.getAccountInfo(destinationAddress, forceRefresh);
          }

          if (includeDestinationAccountObject && destinationAddress) {
               tasks.destinationAccountObject = this.xrplCache.getAccountObjects(client, destinationAddress, forceRefresh);
          }

          // Execute all tasks in parallel
          const resolved = await this.resolveTasks(tasks);

          return {
               client,
               wallet,
               ...resolved,
          };
     }

     async getValidatedEnvironment(forceRefresh: boolean): Promise<PrepareTxEnvironmentResult | null> {
          try {
               const env = await this.prepareTxEnvironment({
                    ...this.DEFAULT_ENV_CONFIG,
                    forceRefresh,
               });

               // Single validation point
               if (!env?.accountInfo || !env?.accountObjects) {
                    throw new Error('Failed to fetch account information');
               }

               return env;
          } catch (error: any) {
               throw new Error(`Error preparing transaction environment: ${error.message}`);
          }
     }

     private async resolveTasks(tasks: Partial<Record<keyof PrepareTxEnvironmentResult, Promise<any>>>): Promise<Partial<PrepareTxEnvironmentResult>> {
          const entries = Object.entries(tasks) as [keyof PrepareTxEnvironmentResult, Promise<any>][];

          const results = await Promise.all(entries.map(([_, promise]) => promise));

          const resolved: Partial<PrepareTxEnvironmentResult> = {};

          entries.forEach(([key], index) => {
               resolved[key] = results[index];
          });

          return resolved;
     }

     private getSelectedWallet(): Wallet {
          const wallet = this.walletManager.getSelectedWallet();
          if (!wallet?.seed && !wallet?.mnemonic && !wallet?.secretNumbers) {
               throw new Error('Selected wallet has no valid signing material.');
          }
          return wallet;
     }

     private getSeed(wallet: Wallet): string {
          if (wallet.seed && wallet.seed !== '') {
               return wallet.seed;
          }

          if (wallet.mnemonic && wallet.mnemonic !== '') {
               return wallet.mnemonic;
          }

          if (wallet.secretNumbers && wallet.secretNumbers !== '') {
               return wallet.secretNumbers;
          }

          return '';
          // return wallet.seed ?? wallet.mnemonic ?? wallet.secretNumbers!;
     }
}
