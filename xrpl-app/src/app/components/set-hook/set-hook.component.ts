import { Component, OnInit, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { ActivatedRoute } from '@angular/router';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { ExecutionTimeDisplayComponent } from '../shared/ui-components/execution-time/execution-time/execution-time.component';
import { WarningMessageComponent } from '../shared/ui-components/warning-message/warning-message/warning-message.component';
import { ConnectionGuardService } from '../../services/connection-guard/connection-guard.service';

@Component({
     selector: 'app-set-hook',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, ExecutionTimeDisplayComponent, WarningMessageComponent],
     templateUrl: './set-hook.component.html',
     styleUrl: './set-hook.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetHookComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     private readonly validationService = inject(ValidationService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     hookWasmHex = signal<string>(''); // User pastes WASM hex here
     hookNamespace = signal<string>(''); // e.g., SHA-256 hex of a string like 'myHookNamespace'
     // hookOn = signal<string>('0000000000000000'); // Default: trigger on all txns
     hookOn = signal<string>('0000000000000002');
     hookApiVersion = signal<number>(0); // Usually 0
     flags = signal<number>(0); // e.g., 1 for override
     // Add signals for optional fields: HookParameters (array), HookGrants (array)

     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     activeTab = signal<'send'>('send');
     accountInfo = signal<any>(null);

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     // generateNamespace(seed: string) {
     //      const hash = xrpl.sha256(seed);
     //      this.hookNamespace.set(hash.toUpperCase());
     // }

     isXahauNetwork(): boolean {
          // Logic to check current network URL contains 'xahau' or 'hooks-testnet'
          return true; // Placeholder
     }

     ngOnInit(): void {
          const tab = this.route.snapshot.queryParamMap.get('tab');
          if (tab) {
               const allowedTabs = ['send'] as const;
               type TabType = (typeof allowedTabs)[number];
               if (tab && allowedTabs.includes(tab as TabType)) {
                    // Type assertion is safe because we checked includes
                    this.setTab(tab as TabType);
               }
          }

          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.onAccountChange(false);
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          // this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'send'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          if (this.hasWallets()) await this.onAccountChange();
     }

     async onAccountChange(forceRefresh = false): Promise<void> {
          await this.withPerf('onAccountChange', async () => {
               // Reset all fields and options
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.txUiService.resetCurrentStepToIdle();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Error in onAccountChange:', error);
                    this.toastService.error(error.message || 'Error getting credential detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     // Call backend to compile hook
     async buildHook() {
          const res = await fetch('http://localhost:4000/compile', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ requireCredential: true }),
          });

          const data = await res.json();
          this.hookWasmHex.set(data.hex);
     }

     async setHook() {
          await this.withPerf('sendXrp', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               const wallet = this.currentWallet();

               try {
                    let env: any = null;
                    try {
                         env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                              includeAccountInfo: true,
                              includeAccountObject: true,
                              includeFee: true,
                              includeLedgerInfo: true,
                              includeServerInfo: true,
                         });
                    } catch (err: any) {
                         console.error('prepareTxEnvironment failed:', err);
                         this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                         return;
                    }

                    // Construct tx (for create operation; adjust for update/delete)
                    // const setHookTx = {
                    //      TransactionType: 'SetHook',
                    //      Account: wallet.classicAddress,
                    //      Fee: env.fee,
                    //      LastLedgerSequence: env.ledgerInfo.lastIndex + AppConstants.LAST_LEDGER_ADD_TIME,
                    //      Hooks: [
                    //           {
                    //                Hook: {
                    //                     CreateCode: this.hookWasmHex().toUpperCase(),
                    //                     HookOn: this.hookOn(),
                    //                     HookNamespace: this.hookNamespace().toUpperCase(),
                    //                     HookApiVersion: this.hookApiVersion(),
                    //                     Flags: this.flags(),
                    //                     // Add HookParameters/HookGrants if user inputs them (e.g., as array signals)
                    //                },
                    //           },
                    //      ],
                    // };

                    // const result = await this.txExecutor.setHook(env, setHookTx as any, env.wallet, env.client, {});

                    // if (!result.success) {
                    //      return this.txUiService.setError(`${result.error}`);
                    // }

                    // this.txUiService.setSuccess(this.xrplTxOptionsStore.isSimulateEnabled() ? 'Simulated hook set successfully!' : 'Hook set successfully!');
               } catch (error: any) {
                    this.txUiService.setError(`${error.message || 'Failed to set hook'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     protected refreshAccountObject(_env: any): void {
          return;
     }

     clearFields() {
          this.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearInputFields() {
          this.typedDestination.set('');
          this.selectedDestinationAddress.set('');
          // this.txUiService.amountField.set('');
          // this.txUiService.destinationTagField.set('');
          // this.txUiService.invoiceIdField.set('');
          // this.txUiService.sourceTagField.set('');
     }
}
