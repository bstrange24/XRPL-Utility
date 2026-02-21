import { Injectable, inject } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { WalletManagerService } from '../wallets/manager/wallet-manager.service';

interface PrepareTxEnvironmentOptions {
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
     includePaymentChannelObjects?: boolean;
     includeMptObjects?: boolean;
     includeFee?: boolean;
     forceRefresh?: boolean;
     destinationAddress?: string;
     escrowSequenceNumberField?: string;
}

interface PrepareTxEnvironmentResult {
     client: xrpl.Client;
     wallet: xrpl.Wallet;
     fee?: string;
     currentLedger?: number;
     accountObjects?: xrpl.AccountObjectsResponse;
     ticketObjects?: xrpl.AccountObjectsResponse;
     escrowObjects?: xrpl.AccountObjectsResponse;
     escrowObjectsBySequenceId?: any;
     checkObjects?: xrpl.AccountObjectsResponse;
     paymentChannelObjects?: any;
     trustlines?: xrpl.AccountLinesResponse;
     accountInfo?: xrpl.AccountInfoResponse;
     destinationAccountInfo?: xrpl.AccountInfoResponse;
     destinationAccountObject?: xrpl.AccountObjectsResponse;
}

@Injectable({
     providedIn: 'root',
})
export class TxEnvironmentService {
     private readonly xrplCache = inject(XrplCacheService);
     private readonly xrplService = inject(XrplService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly walletCache = new Map<string, xrpl.Wallet>();

     async prepareTxEnvironment({
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
          includePaymentChannelObjects = false,
          includeMptObjects = false,
          includeFee = false,
          forceRefresh = false,
          destinationAddress = '',
          escrowSequenceNumberField = '',
     }: PrepareTxEnvironmentOptions = {}): Promise<PrepareTxEnvironmentResult> {
          // Client (cached internally)
          const client = await this.xrplCache.getClient(() => this.xrplService.getClient());

          // XRPL Wallet (cached locally)
          const localWallet = this.walletManager.getSelectedWallet();
          if (!localWallet?.seed) {
               throw new Error('Selected wallet is missing a seed.');
          }

          const walletKey = `${localWallet.seed}:${localWallet.encryptionAlgorithm}`;
          let wallet = this.walletCache.get(walletKey);

          if (!wallet) {
               wallet = xrpl.Wallet.fromSeed(localWallet.seed);
               this.walletCache.set(walletKey, wallet);
          }

          // Parallel network calls
          const networkCalls: Promise<any>[] = [];
          const networkKeys: string[] = [];

          if (includeFee) {
               networkCalls.push(this.xrplCache.getFee(this.xrplService, forceRefresh));
               networkKeys.push('fee');
          }

          if (includeLedgerIndex) {
               networkCalls.push(this.xrplCache.getLedgerIndex(client));
               networkKeys.push('currentLedger');
          }

          if (includeAccountInfo) {
               networkCalls.push(this.xrplCache.getAccountInfo(wallet.classicAddress, forceRefresh));
               networkKeys.push('accountInfo');
          }

          if (includeDestinationAccountInfo && destinationAddress) {
               networkCalls.push(this.xrplCache.getAccountInfo(destinationAddress, forceRefresh));
               networkKeys.push('destinationAccountInfo');
          }

          if (includeDestinationAccountObject && destinationAddress) {
               networkCalls.push(this.xrplCache.getAccountObjects(client, destinationAddress, forceRefresh));
               networkKeys.push('destinationAccountObject');
          }

          if (includeAccountObject) {
               networkCalls.push(this.xrplCache.getAccountObjects(client, wallet.classicAddress, forceRefresh));
               networkKeys.push('accountObjects');
          }

          if (includeTrustlines) {
               networkCalls.push(this.xrplCache.getAccountLines(client, wallet.classicAddress, forceRefresh));
               networkKeys.push('trustlines');
          }

          if (includeTickets) {
               networkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'ticket'));
               networkKeys.push('ticketObjects');
          }

          if (includeEscrows) {
               networkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'escrow'));
               networkKeys.push('escrowObjects');
          }

          if (includeEscrowBySequenceId) {
               networkCalls.push(this.xrplService.getEscrowBySequence(client, wallet.classicAddress, Number(escrowSequenceNumberField)));
               networkKeys.push('escrowObjectsBySequenceId');
          }

          if (includeChecks) {
               networkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'check'));
               networkKeys.push('checkObjects');
          }

          if (includeMptObjects) {
               networkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'check'));
               networkKeys.push('mptObjects');
          }

          if (includePaymentChannelObjects) {
               networkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'payment_channel'));
               networkKeys.push('paymentChannelObjects');
          }

          const networkResults = networkCalls.length ? await Promise.all(networkCalls) : [];

          // Build result
          const result: PrepareTxEnvironmentResult = { client, wallet };
          networkKeys.forEach((key, index) => {
               (result as any)[key] = networkResults[index];
          });
          return result;
     }
}
