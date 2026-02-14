import { Injectable, inject } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';

interface PrepareTxEnvironmentOptions {
     includeTickets?: boolean;
     includeEscrows?: boolean;
     includeChecks?: boolean;
     includeTrustlines?: boolean;
     includeAccountInfo?: boolean;
     includeAccountObject?: boolean;
     includeLedgerIndex?: boolean;
     includeFee?: boolean;
     forceRefresh?: boolean;
}

interface PrepareTxEnvironmentResult {
     client: xrpl.Client;
     wallet: xrpl.Wallet;
     fee?: string;
     currentLedger?: number;
     accountObjects?: xrpl.AccountObjectsResponse;
     ticketObjects?: xrpl.AccountObjectsResponse;
     escrowObjects?: xrpl.AccountObjectsResponse;
     checkObjects?: xrpl.AccountObjectsResponse;
     trustlines?: xrpl.AccountLinesResponse;
     accountInfo?: xrpl.AccountInfoResponse;
}

@Injectable({
     providedIn: 'root',
})
export class TxEnvironmentServiceService {
     private readonly xrplCache = inject(XrplCacheService);
     private readonly xrplService = inject(XrplService);
     private readonly walletManager = inject(WalletManagerService);
     private readonly walletCache = new Map<string, xrpl.Wallet>();

     async prepareTxEnvironment({ includeTickets = false, includeEscrows = false, includeChecks = false, includeTrustlines = false, includeAccountInfo = false, includeAccountObject = false, includeLedgerIndex = false, includeFee = false, forceRefresh = false }: PrepareTxEnvironmentOptions = {}): Promise<PrepareTxEnvironmentResult> {
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

          if (includeChecks) {
               networkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'check'));
               networkKeys.push('checkObjects');
          }

          const networkResults = networkCalls.length ? await Promise.all(networkCalls) : [];

          // Build result
          const result: PrepareTxEnvironmentResult = {
               client,
               wallet,
          };

          networkKeys.forEach((key, index) => {
               (result as any)[key] = networkResults[index];
          });

          return result;
     }
}
