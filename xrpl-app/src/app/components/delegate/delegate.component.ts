import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule } from '@angular/cdk/overlay';
import { UtilsService } from '../../services/utils/util-service/utils.service';
import { StorageService } from '../../services/shared/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/utils/download-util/download-util.service';
import { CopyUtilService } from '../../services/utils/copy-util/copy-util.service';
import { ValidationService } from '../../services/utils/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { DestinationDropdownService } from '../../services/shared/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { NavbarComponent } from '../shared/ui-components/navbar/navbar.component';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { TransactionPreviewComponent } from '../shared/transaction-preview/transaction-preview.component';
import { ToastService } from '../../services/utils/toast/toast.service';
import { SelectSearchDropdownComponent } from '../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { PerformanceBaseComponent } from '../shared/performance-base/performance-base.component';
import { ActivatedRoute } from '@angular/router';
import { AccountConfiguratorStoreService } from '../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../shared/stores/xrpl-tx-options.store';
import { ConnectionGuardService } from '../../services/shared/connection-guard/connection-guard.service';
import { LogServiceService } from '../../services/shared/log-service/log-service.service';

interface XRPLPermissionEntry {
     Permission: {
          PermissionValue: string;
     };
}

interface XRPLDelegate {
     LedgerEntryType: 'Delegate';
     Account?: string;
     Authorize?: string;
     Flags?: number;
     PreviousTxnID?: string;
     PreviousTxnLgrSeq?: number;
     index: string;
     Permissions: XRPLPermissionEntry[];
}

interface DelegateAction {
     id: number;
     key: string;
     txType: string;
     description: string;
}

@Component({
     selector: 'app-delegate',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './delegate.component.html',
     styleUrl: './delegate.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDelegateComponent extends PerformanceBaseComponent implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     private readonly walletManager = inject(WalletManagerService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly route = inject(ActivatedRoute);
     public readonly logService = inject(LogServiceService);

     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now

     // Reactive State (Signals)
     activeTab = signal<'clear' | 'delegate'>('delegate');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);

     infoPanelExpanded = signal<boolean>(false);

     // Dropdown
     dropdownOpen = signal<boolean>(false);
     actions: DelegateAction[] = AppConstants.DELEGATE_ACTIONS;
     selected: Set<number> = new Set<number>();
     delegateSelections: Record<string, Set<number>> = {};
     leftActions: any;
     rightActions: any;
     createdDelegations = signal<boolean>(false);
     existingDelegations = signal<XRPLDelegate[]>([]);
     subject = signal<string>('');
     selectedWalletIndex = signal<number>(0);

     // Effect 1: Has wallets → warning handling
     private readonly hasWalletsEffect = effect(() => {
          if (this.walletManager.hasWallets()) {
               this.txUiService.clearWarning?.();
          } else {
               this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
               this.txUiService.setError('');
               this.txUiService.setInfoMessage('');
          }
     });

     // Effect 2: Wallets list sync
     private readonly walletsSyncEffect = effect(() => {
          this.wallets.set(this.walletManager.wallets());
     });

     // Effect 3: Selected index change → clear + refresh checks
     private readonly selectedIndexEffect = effect(() => {
          // Reading the signal is enough to trigger the effect
          this.walletManager.selectedIndex();

          this.txUiService.clearAllOptionsAndMessages();
          this.clearFields();

          // Fire-and-forget refresh
          void this.getAccountDetails(true);
     });

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(d => d.id === addr) || null;
     });

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          return this.destinations().map(d => ({
               id: d.address,
               display: d.name || 'Unknown Wallet',
               secondary: d.address,
               isCurrentAccount: d.address === currentAddr,
          }));
     });

     destinations = computed(() => [
          ...this.wallets().map((w: DropdownItem) => ({
               name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               address: w.address,
          })),
          ...this.customDestinations(),
     ]);

     destinationDisplay = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return this.destinationSearchQuery(); // while typing → show typed text

          const dest = this.destinations().find(d => d.address === addr);
          if (!dest) return addr;

          return this.dropdownService.formatDisplay(dest);
     });

     filteredDestinations = computed(() => {
          const q = this.destinationSearchQuery().trim().toLowerCase();
          const list = this.destinations();

          if (q === '') {
               return list;
          }

          return this.destinations()
               .filter(d => d.address !== this.currentWallet().address)
               .filter(d => d.address.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q));
     });

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || 'Selected wallet';
          const delegationCount = this.existingDelegations().length;

          let message: string;

          if (delegationCount === 0) {
               message = `<code>${walletName}</code> wallet has no delegations.`;
          } else {
               const delegationDescription = delegationCount === 1 ? 'delegation' : 'delegations';
               message = `<code>${walletName}</code> wallet has <strong>${delegationCount}</strong> ${delegationDescription}.`;
          }

          return {
               walletName,
               message,
               mode: this.activeTab(),
               delegationCount,
               existingDelegations: this.existingDelegations(),
          };
     });

     hasWallets = computed(() => this.wallets().length > 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          const tab = this.route.snapshot.queryParamMap.get('tab');
          if (tab) {
               const allowedTabs = ['clear', 'delegate'] as const;
               type TabType = (typeof allowedTabs)[number];
               if (allowedTabs.includes(tab as TabType)) {
                    // Type assertion is safe because we checked includes
                    this.setTab(tab as TabType);
               }
          }

          this.loadCustomDestinations();
          this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
          this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     trackByWalletAddress(index: number, wallet: any): string {
          return wallet.address;
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByTicket(index: number, ticket: any) {
          return ticket;
     }

     toggleCreatedDelegations() {
          this.createdDelegations.update(val => !val);
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'clear' | 'delegate'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          if (this.hasWallets()) {
               await this.getAccountDetails(true);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     toggleSelection(id: number, event?: Event) {
          if (event) {
               event.stopPropagation();
          }

          if (this.selected.has(id)) {
               this.selected.delete(id);
          } else {
               this.selected.add(id);
          }
     }

     getSelectedActions(): DelegateAction[] {
          return this.actions.filter(a => this.selected.has(a.id));
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.withPerf('getAccountDetails', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.getExistingDelegations(accountObjects, wallet.classicAddress);

                    this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
                    this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
               }
          });
     }

     async delegateActions(delegate: 'delegate' | 'clear') {
          await this.withPerf('delegateActions', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const destinationAddress = this.selectedDestinationAddress() || this.typedDestination();
                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    let permissions: { Permission: { PermissionValue: string } }[] = [];
                    if (delegate === 'clear') {
                    } else {
                         const selectedActions = this.getSelectedActions();

                         if (selectedActions.length == 0) {
                              return this.txUiService.setError(`Select a delegate objects to set.`);
                         }

                         if (selectedActions.length > 10) {
                              return this.txUiService.setError(`The max delegate objects must be less than 10.`);
                         }

                         permissions = selectedActions.map(a => ({
                              Permission: {
                                   PermissionValue: a.key,
                              },
                         }));
                    }

                    const delegateSetTx: xrpl.DelegateSet = {
                         TransactionType: 'DelegateSet',
                         Account: wallet.classicAddress,
                         Authorize: destinationAddress,
                         Permissions: permissions,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, delegateSetTx, wallet, accountInfo, 'delegateActions');

               } catch (error: any) {
                    console.error('Error in delegateAction:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
               }
          });
     }

     private getExistingDelegations(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Delegate')
               .map((obj: any) => ({
                    LedgerEntryType: obj.LedgerEntryType,
                    index: obj.index,
                    Authorize: obj.Authorize,
                    Permissions: obj.Permissions,
                    Flags: obj.Flags,
               }));

          // This triggers infoData() to recompute automatically
          this.existingDelegations.set(mapped);
          this.logService.logObjects('existingDelegations', mapped);
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, delegateSetTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.xrplTxOptionsStore.isTicket()) {
               const ticket = false;
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(delegateSetTx, ticket, true);
               }
          }

     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.getExistingDelegations(accountObjects, wallet.classicAddress);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest && destination) this.addNewDestinationFromUser(destination);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(
               client,
               addresses, // only the addresses to target
               (updatedList, newCurrent) => {
                    this.currentWallet.set({ ...newCurrent });
               }
          );
     }

     updateDestinations() {
          const allItems = [
               ...this.wallets().map(wallet => ({
                    name: wallet.name ?? this.truncateAddress(wallet.address),
                    address: wallet.address,
               })),
               ...this.customDestinations(),
          ];
          this.storageService.set('destinations', allItems);
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private addNewDestinationFromUser(destination: string): void {
          if (destination && xrpl.isValidAddress(destination) && !this.destinations().some(d => d.address === destination)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.typedDestination.set('');
          this.selectedDestinationAddress.set('');
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearDelegateActions() {
          this.selected.clear();
     }
}
