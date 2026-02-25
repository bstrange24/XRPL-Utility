import { Injectable, inject } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { Wallet, WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { UtilsService } from '../util-service/utils.service';

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
     mptObjects?: xrpl.AccountObjectsResponse;
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
     private readonly utilsService = inject(UtilsService);

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
          const client = await this.xrplCache.getClient(() => this.xrplService.getClient());

          const selectedWallet = this.getSelectedWallet();

          let seed: string = this.getSeed(selectedWallet);

          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(seed, selectedWallet.encryptionAlgorithm as 'ed25519' | 'secp256k1');

          // Parallel network calls
          const xrplNetworkCalls: Promise<any>[] = [];
          const keys: string[] = [];

          if (includeFee) {
               xrplNetworkCalls.push(this.xrplCache.getFee(this.xrplService, forceRefresh));
               keys.push('fee');
          }

          if (includeLedgerIndex) {
               xrplNetworkCalls.push(this.xrplCache.getLedgerIndex(client));
               keys.push('currentLedger');
          }

          if (includeAccountInfo) {
               xrplNetworkCalls.push(this.xrplCache.getAccountInfo(wallet.classicAddress, forceRefresh));
               keys.push('accountInfo');
          }

          if (includeDestinationAccountInfo && destinationAddress) {
               xrplNetworkCalls.push(this.xrplCache.getAccountInfo(destinationAddress, forceRefresh));
               keys.push('destinationAccountInfo');
          }

          if (includeDestinationAccountObject && destinationAddress) {
               xrplNetworkCalls.push(this.xrplCache.getAccountObjects(client, destinationAddress, forceRefresh));
               keys.push('destinationAccountObject');
          }

          if (includeAccountObject) {
               xrplNetworkCalls.push(this.xrplCache.getAccountObjects(client, wallet.classicAddress, forceRefresh));
               keys.push('accountObjects');
          }

          if (includeTrustlines) {
               xrplNetworkCalls.push(this.xrplCache.getAccountLines(client, wallet.classicAddress, forceRefresh));
               keys.push('trustlines');
          }

          if (includeTickets) {
               xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'ticket'));
               keys.push('ticketObjects');
          }

          if (includeEscrows) {
               xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'escrow'));
               keys.push('escrowObjects');
          }

          if (includeEscrowBySequenceId) {
               xrplNetworkCalls.push(this.xrplService.getEscrowBySequence(client, wallet.classicAddress, Number(escrowSequenceNumberField)));
               keys.push('escrowObjectsBySequenceId');
          }

          if (includeChecks) {
               xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'check'));
               keys.push('checkObjects');
          }

          if (includeMptObjects) {
               xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'mpt'));
               keys.push('mptObjects');
          }

          if (includePaymentChannelObjects) {
               xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'payment_channel'));
               keys.push('paymentChannelObjects');
          }

          const networkResults = xrplNetworkCalls.length ? await Promise.all(xrplNetworkCalls) : [];

          // Build result
          const result: PrepareTxEnvironmentResult = this.buildResults(client, wallet, keys, networkResults);
          return result;
     }

     private getSeed(selectedWallet: Wallet) {
          let input: string;

          if (selectedWallet.seed) {
               input = selectedWallet.seed;
          } else if (selectedWallet.mnemonic) {
               input = selectedWallet.mnemonic;
          } else if (selectedWallet.secretNumbers) {
               input = selectedWallet.secretNumbers;
          } else {
               throw new Error('Selected wallet has no valid seed, mnemonic or secret numbers');
          }
          return input;
     }

     private buildResults(client: xrpl.Client, wallet: xrpl.Wallet, keys: string[], networkResults: any[]) {
          const result: PrepareTxEnvironmentResult = { client, wallet };
          keys.forEach((key, index) => {
               (result as any)[key] = networkResults[index];
          });
          return result;
     }

     private getSelectedWallet() {
          const localWallet = this.walletManager.getSelectedWallet();
          if (!localWallet?.seed) {
               if (!localWallet?.mnemonic) {
                    throw new Error('Selected wallet is missing a mnemonic.');
               }
          }
          return localWallet;
     }
}
