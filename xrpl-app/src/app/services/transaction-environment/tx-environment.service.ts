// import { Injectable, inject, signal, computed, effect } from '@angular/core';
// import * as xrpl from 'xrpl';
// import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
// import { XrplService } from '../xrpl-services/xrpl.service';
// import { Wallet, WalletManagerService } from '../wallets/manager/wallet-manager.service';
// import { UtilsService } from '../util-service/utils.service';

// export interface PrepareTxEnvironmentOptions {
//      includeTickets?: boolean;
//      includeEscrows?: boolean;
//      includeEscrowBySequenceId?: boolean;
//      includeChecks?: boolean;
//      includeTrustlines?: boolean;
//      includeDestinationAccountInfo?: boolean;
//      includeDestinationAccountObject?: boolean;
//      includeAccountInfo?: boolean;
//      includeAccountObject?: boolean;
//      includeLedgerIndex?: boolean;
//      includePaymentChannelObjects?: boolean;
//      includeMptObjects?: boolean;
//      includeGatewayBalance?: boolean;
//      includeFee?: boolean;
//      destinationAddress?: string;
//      escrowSequenceNumberField?: string;
// }

// export interface PrepareTxEnvironmentResult {
//      client: xrpl.Client;
//      wallet: xrpl.Wallet;
//      fee?: string;
//      currentLedger?: number;
//      accountObjects?: xrpl.AccountObjectsResponse;
//      ticketObjects?: xrpl.AccountObjectsResponse;
//      escrowObjects?: xrpl.AccountObjectsResponse;
//      escrowObjectsBySequenceId?: any;
//      checkObjects?: xrpl.AccountObjectsResponse;
//      mptObjects?: xrpl.AccountObjectsResponse;
//      paymentChannelObjects?: xrpl.AccountObjectsResponse;
//      trustlines?: xrpl.AccountLinesResponse;
//      accountInfo?: xrpl.AccountInfoResponse;
//      destinationAccountInfo?: xrpl.AccountInfoResponse;
//      destinationAccountObject?: xrpl.AccountObjectsResponse;
//      gatewayBalanceObject?: any;
// }

// @Injectable({
//      providedIn: 'root',
// })
// export class TxEnvironmentService {
//      private readonly xrplCache = inject(XrplCacheService);
//      private readonly xrplService = inject(XrplService);
//      private readonly walletManager = inject(WalletManagerService);
//      private readonly utilsService = inject(UtilsService);

//      // -----------------------
//      // Reactive State
//      // -----------------------

//      private readonly options = signal<PrepareTxEnvironmentOptions>({});
//      private readonly forceRefreshCounter = signal(0);

//      private readonly _environment = signal<PrepareTxEnvironmentResult | null>(null);
//      readonly environment = computed(() => this._environment());

//      readonly loading = signal(false);
//      readonly error = signal<any>(null);

//      constructor() {
//           effect(() => {
//                const opts = this.options();
//                this.forceRefreshCounter(); // dependency trigger

//                this.fetchEnvironment(opts);
//           });
//      }

//      // -----------------------
//      // Public API
//      // -----------------------

//      setOptions(options: PrepareTxEnvironmentOptions) {
//           this.options.set(options);
//      }

//      refresh() {
//           this.forceRefreshCounter.update(v => v + 1);
//      }

//      clear() {
//           this._environment.set(null);
//      }

//      // -----------------------
//      // Core Fetch Logic
//      // -----------------------

//      private async fetchEnvironment(options: PrepareTxEnvironmentOptions) {
//           this.loading.set(true);
//           this.error.set(null);

//           try {
//                const {
//                     includeTickets = false,
//                     includeEscrows = false,
//                     includeEscrowBySequenceId = false,
//                     includeChecks = false,
//                     includeTrustlines = false,
//                     includeDestinationAccountInfo = false,
//                     includeDestinationAccountObject = false,
//                     includeAccountInfo = false,
//                     includeAccountObject = false,
//                     includeLedgerIndex = false,
//                     includePaymentChannelObjects = false,
//                     includeMptObjects = false,
//                     includeGatewayBalance = false,
//                     includeFee = false,
//                     destinationAddress = '',
//                     escrowSequenceNumberField = '',
//                } = options;

//                const client = await this.xrplCache.getClient(() => this.xrplService.getClient());

//                const selectedWallet = this.getSelectedWallet();
//                const seed = this.getSeed(selectedWallet);

//                const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(seed, selectedWallet.encryptionAlgorithm as 'ed25519' | 'secp256k1');

//                const address = wallet.classicAddress;

//                const tasks: Partial<Record<keyof PrepareTxEnvironmentResult, Promise<any>>> = {};

//                if (includeFee) {
//                     tasks.fee = this.xrplCache.getFee(this.xrplService);
//                }

//                if (includeLedgerIndex) {
//                     tasks.currentLedger = this.xrplCache.getLedgerIndex(client);
//                }

//                if (includeAccountInfo) {
//                     tasks.accountInfo = this.xrplCache.getAccountInfo(address);
//                }

//                if (includeAccountObject) {
//                     tasks.accountObjects = this.xrplCache.getAccountObjects(client, address);
//                }

//                if (includeTrustlines) {
//                     tasks.trustlines = this.xrplCache.getAccountLines(client, address);
//                }

//                if (includeTickets) {
//                     tasks.ticketObjects = this.xrplCache.getAccountObjectsWithType(client, address, false, 'ticket');
//                }

//                if (includeEscrows) {
//                     tasks.escrowObjects = this.xrplCache.getAccountObjectsWithType(client, address, false, 'escrow');
//                }

//                if (includeChecks) {
//                     tasks.checkObjects = this.xrplCache.getAccountObjectsWithType(client, address, false, 'check');
//                }

//                if (includeMptObjects) {
//                     tasks.mptObjects = this.xrplCache.getAccountObjectsWithType(client, address, false, 'mpt');
//                }

//                if (includePaymentChannelObjects) {
//                     tasks.paymentChannelObjects = this.xrplCache.getAccountObjectsWithType(client, address, false, 'payment_channel');
//                }

//                if (includeGatewayBalance) {
//                     tasks.gatewayBalanceObject = this.xrplCache.getGatewayBalance(client, address);
//                }

//                if (includeEscrowBySequenceId && escrowSequenceNumberField) {
//                     tasks.escrowObjectsBySequenceId = this.xrplService.getEscrowBySequence(client, address, Number(escrowSequenceNumberField));
//                }

//                if (includeDestinationAccountInfo && destinationAddress) {
//                     tasks.destinationAccountInfo = this.xrplCache.getAccountInfo(destinationAddress);
//                }

//                if (includeDestinationAccountObject && destinationAddress) {
//                     tasks.destinationAccountObject = this.xrplCache.getAccountObjects(client, destinationAddress);
//                }

//                const resolved = await this.resolveTasks(tasks);

//                this._environment.set({
//                     client,
//                     wallet,
//                     ...resolved,
//                });
//           } catch (err) {
//                this.error.set(err);
//           } finally {
//                this.loading.set(false);
//           }
//      }

//      private async resolveTasks(tasks: Partial<Record<keyof PrepareTxEnvironmentResult, Promise<any>>>): Promise<Partial<PrepareTxEnvironmentResult>> {
//           const entries = Object.entries(tasks) as [keyof PrepareTxEnvironmentResult, Promise<any>][];

//           const results = await Promise.all(entries.map(([_, p]) => p));

//           const resolved: Partial<PrepareTxEnvironmentResult> = {};
//           entries.forEach(([key], i) => (resolved[key] = results[i]));

//           return resolved;
//      }

//      private getSelectedWallet(): Wallet {
//           const wallet = this.walletManager.getSelectedWallet();
//           if (!wallet?.seed && !wallet?.mnemonic && !wallet?.secretNumbers) {
//                throw new Error('Selected wallet has no signing material.');
//           }
//           return wallet;
//      }

//      private getSeed(wallet: Wallet): string {
//           return wallet.seed ?? wallet.mnemonic ?? wallet.secretNumbers!;
//      }
// }

import { Injectable, inject } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { Wallet, WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { UtilsService } from '../util-service/utils.service';
import { AppConstants } from '../../core/app.constants';
import { ToastService } from '../toast/toast.service';

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
     includePaymentChannelObjects?: boolean;
     includeMptObjects?: boolean;
     includeGatewayBalance?: boolean;
     includeFee?: boolean;
     includeServerInfo?: boolean;
     includeBlockingObjects?: boolean;
     forceRefresh?: boolean;
     destinationAddress?: string;
     escrowSequenceNumberField?: string;
}

export interface PrepareTxEnvironmentResult {
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
     paymentChannelObjects?: xrpl.AccountObjectsResponse;
     trustlines?: xrpl.AccountLinesResponse;
     accountInfo?: xrpl.AccountInfoResponse;
     destinationAccountInfo?: xrpl.AccountInfoResponse;
     destinationAccountObject?: xrpl.AccountObjectsResponse;
     gatewayBalanceObject?: any;
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
     private readonly DEFAULT_ENV_CONFIG = { includeAccountInfo: true, includeAccountObject: true } as const;

     async prepareTxEnvironment(options: PrepareTxEnvironmentOptions = {}): Promise<PrepareTxEnvironmentResult> {
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
               includePaymentChannelObjects = false,
               includeMptObjects = false,
               includeGatewayBalance = false,
               includeServerInfo = false,
               includeBlockingObjects = false,
               includeFee = false,
               forceRefresh = false,
               destinationAddress = '',
               escrowSequenceNumberField = '',
          } = options;

          const client = await this.xrplCache.getClient(() => this.xrplService.getClient());

          const selectedWallet = this.getSelectedWallet();
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
               tasks.blockingObjects = this.xrplCache.getBlockingObjects(client, address, forceRefresh, 'blocking_objects');
          }

          if (includePaymentChannelObjects) {
               tasks.paymentChannelObjects = this.xrplCache.getAccountObjectsWithType(client, address, forceRefresh, 'payment_channel');
          }

          if (includeGatewayBalance) {
               tasks.gatewayBalanceObject = this.xrplCache.getGatewayBalance(client, address, forceRefresh);
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
                    this.toastService.error('Failed to fetch account information', AppConstants.TOAST.ERROR);
                    return null;
               }

               return env as PrepareTxEnvironmentResult;
          } catch (error) {
               this.toastService.error('Error preparing transaction environment', AppConstants.TOAST.ERROR);
               console.error('Environment preparation error:', error);
               return null;
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
          return wallet.seed ?? wallet.mnemonic ?? wallet.secretNumbers!;
     }
}

// OG ------------------------------------------------------------
// import { Injectable, inject } from '@angular/core';
// import * as xrpl from 'xrpl';
// import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
// import { XrplService } from '../xrpl-services/xrpl.service';
// import { Wallet, WalletManagerService } from '../wallets/manager/wallet-manager.service';
// import { UtilsService } from '../util-service/utils.service';

// export interface PrepareTxEnvironmentOptions {
//      includeTickets?: boolean;
//      includeEscrows?: boolean;
//      includeEscrowBySequenceId?: boolean;
//      includeChecks?: boolean;
//      includeTrustlines?: boolean;
//      includeDestinationAccountInfo?: boolean;
//      includeDestinationAccountObject?: boolean;
//      includeAccountInfo?: boolean;
//      includeAccountObject?: boolean;
//      includeLedgerIndex?: boolean;
//      includePaymentChannelObjects?: boolean;
//      includeMptObjects?: boolean;
//      includeGatewayBalance?: boolean;
//      includeFee?: boolean;
//      forceRefresh?: boolean;
//      destinationAddress?: string;
//      escrowSequenceNumberField?: string;
// }

// export interface PrepareTxEnvironmentResult {
//      client: xrpl.Client;
//      wallet: xrpl.Wallet;
//      fee?: string;
//      currentLedger?: number;
//      accountObjects?: xrpl.AccountObjectsResponse;
//      ticketObjects?: xrpl.AccountObjectsResponse;
//      escrowObjects?: xrpl.AccountObjectsResponse;
//      escrowObjectsBySequenceId?: any;
//      checkObjects?: xrpl.AccountObjectsResponse;
//      mptObjects?: xrpl.AccountObjectsResponse;
//      paymentChannelObjects?: any;
//      trustlines?: xrpl.AccountLinesResponse;
//      accountInfo?: xrpl.AccountInfoResponse;
//      destinationAccountInfo?: xrpl.AccountInfoResponse;
//      destinationAccountObject?: xrpl.AccountObjectsResponse;
//      gatewayBalanceObject?: any;
// }

// @Injectable({
//      providedIn: 'root',
// })
// export class TxEnvironmentService {
//      private readonly xrplCache = inject(XrplCacheService);
//      private readonly xrplService = inject(XrplService);
//      private readonly walletManager = inject(WalletManagerService);
//      private readonly utilsService = inject(UtilsService);

//      private envCache: {
//           timestamp: number;
//           value: Awaited<ReturnType<TxEnvironmentService['prepareTxEnvironment']>> | null;
//      } | null = null;

//      private readonly CACHE_DURATION_MS = 28_000; // 8 seconds – enough for user to click multiple buttons

//      async prepareTxEnvironment({
//           includeTickets = false,
//           includeEscrows = false,
//           includeEscrowBySequenceId = false,
//           includeChecks = false,
//           includeTrustlines = false,
//           includeDestinationAccountInfo = false,
//           includeDestinationAccountObject = false,
//           includeAccountInfo = false,
//           includeAccountObject = false,
//           includeLedgerIndex = false,
//           includePaymentChannelObjects = false,
//           includeMptObjects = false,
//           includeGatewayBalance = false,
//           includeFee = false,
//           forceRefresh = false,
//           destinationAddress = '',
//           escrowSequenceNumberField = '',
//      }: PrepareTxEnvironmentOptions = {}): Promise<PrepareTxEnvironmentResult> {
//           const client = await this.xrplCache.getClient(() => this.xrplService.getClient());

//           const selectedWallet = this.getSelectedWallet();

//           let seed: string = this.getSeed(selectedWallet);

//           const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(seed, selectedWallet.encryptionAlgorithm as 'ed25519' | 'secp256k1');

//           // Parallel network calls
//           const xrplNetworkCalls: Promise<any>[] = [];
//           const keys: string[] = [];

//           if (includeFee) {
//                xrplNetworkCalls.push(this.xrplCache.getFee(this.xrplService, forceRefresh));
//                keys.push('fee');
//           }

//           if (includeLedgerIndex) {
//                xrplNetworkCalls.push(this.xrplCache.getLedgerIndex(client));
//                keys.push('currentLedger');
//           }

//           if (includeAccountInfo) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountInfo(wallet.classicAddress, forceRefresh));
//                keys.push('accountInfo');
//           }

//           if (includeDestinationAccountInfo && destinationAddress) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountInfo(destinationAddress, forceRefresh));
//                keys.push('destinationAccountInfo');
//           }

//           if (includeDestinationAccountObject && destinationAddress) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountObjects(client, destinationAddress, forceRefresh));
//                keys.push('destinationAccountObject');
//           }

//           if (includeAccountObject) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountObjects(client, wallet.classicAddress, forceRefresh));
//                keys.push('accountObjects');
//           }

//           if (includeTrustlines) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountLines(client, wallet.classicAddress, forceRefresh));
//                keys.push('trustlines');
//           }

//           if (includeTickets) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'ticket'));
//                keys.push('ticketObjects');
//           }

//           if (includeEscrows) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'escrow'));
//                keys.push('escrowObjects');
//           }

//           if (includeEscrowBySequenceId) {
//                xrplNetworkCalls.push(this.xrplService.getEscrowBySequence(client, wallet.classicAddress, Number(escrowSequenceNumberField)));
//                keys.push('escrowObjectsBySequenceId');
//           }

//           if (includeChecks) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'check'));
//                keys.push('checkObjects');
//           }

//           if (includeMptObjects) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'mpt'));
//                keys.push('mptObjects');
//           }

//           if (includePaymentChannelObjects) {
//                xrplNetworkCalls.push(this.xrplCache.getAccountObjectsWithType(client, wallet.classicAddress, forceRefresh, 'payment_channel'));
//                keys.push('paymentChannelObjects');
//           }

//           if (includeGatewayBalance) {
//                xrplNetworkCalls.push(this.xrplCache.getGatewayBalance(client, wallet.classicAddress, forceRefresh, 'gatewayBalance'));
//                keys.push('gatewayBalanceObject');
//           }

//           const networkResults = xrplNetworkCalls.length ? await Promise.all(xrplNetworkCalls) : [];

//           // Build result
//           const result: PrepareTxEnvironmentResult = this.buildResults(client, wallet, keys, networkResults);
//           return result;
//      }

//      private getSeed(selectedWallet: Wallet) {
//           let input: string;

//           if (selectedWallet.seed) {
//                input = selectedWallet.seed;
//           } else if (selectedWallet.mnemonic) {
//                input = selectedWallet.mnemonic;
//           } else if (selectedWallet.secretNumbers) {
//                input = selectedWallet.secretNumbers;
//           } else {
//                throw new Error('Selected wallet has no valid seed, mnemonic or secret numbers');
//           }
//           return input;
//      }

//      private buildResults(client: xrpl.Client, wallet: xrpl.Wallet, keys: string[], networkResults: any[]) {
//           const result: PrepareTxEnvironmentResult = { client, wallet };
//           keys.forEach((key, index) => {
//                (result as any)[key] = networkResults[index];
//           });
//           return result;
//      }

//      private getSelectedWallet() {
//           const localWallet = this.walletManager.getSelectedWallet();
//           if (!localWallet?.seed) {
//                if (!localWallet?.mnemonic) {
//                     throw new Error('Selected wallet is missing a mnemonic.');
//                }
//           }
//           return localWallet;
//      }

//      async getPreparedEnvironment(
//           options: {
//                includeTickets?: boolean;
//                includeEscrows?: boolean;
//                includeEscrowBySequenceId?: boolean;
//                includeChecks?: boolean;
//                includeTrustlines?: boolean;
//                includeDestinationAccountInfo?: boolean;
//                includeDestinationAccountObject?: boolean;
//                includeAccountInfo?: boolean;
//                includeAccountObject?: boolean;
//                includeLedgerIndex?: boolean;
//                includePaymentChannelObjects?: boolean;
//                includeMptObjects?: boolean;
//                includeGatewayBalance?: boolean;
//                includeFee?: boolean;
//                forceRefresh?: boolean;
//                destinationAddress?: string;
//                escrowSequenceNumberField?: string;
//           } = {}
//      ): Promise<Awaited<ReturnType<typeof this.prepareTxEnvironment>>> {
//           const now = Date.now();

//           // Check cache validity
//           if (this.envCache && now - this.envCache.timestamp < this.CACHE_DURATION_MS && !options.forceRefresh) {
//                console.log('Using CACHE...................................................................');
//                return this.envCache.value!;
//           }

//           // Cache miss or forced refresh → prepare fresh
//           const freshEnv = await this.prepareTxEnvironment(options);

//           // Update cache
//           this.envCache = {
//                timestamp: now,
//                value: freshEnv,
//           };

//           return freshEnv;
//      }
// }
