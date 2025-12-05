import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, TemplateRef, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { WalletManagerService, Wallet } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { Subject } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';

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
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './delegate.component.html',
     styleUrl: './delegate.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDelegateComponent extends PerformanceBaseComponent implements OnInit, AfterViewInit {
     private readonly destroyRef = inject(DestroyRef);
     private readonly overlay = inject(Overlay);
     private readonly viewContainerRef = inject(ViewContainerRef);

     // Services
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     private readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly destinationDropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);

     // ViewChildren & Template
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('credentialInput', { static: false }) inputElement!: ElementRef<HTMLInputElement>;

     // Reactive State (Signals)
     activeTab = signal<'set' | 'delete'>('set');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     hasWallets = computed(() => this.wallets().length > 0);

     // Form & UI State
     destinationField = signal<string>('');
     infoPanelExpanded = signal(false);

     // Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     destinations = signal<DropdownItem[]>([]);
     dropdownOpen = signal<boolean>(false);
     actions: DelegateAction[] = AppConstants.DELEGATE_ACTIONS;
     selected: Set<number> = new Set<number>();
     delegateSelections: Record<string, Set<number>> = {};
     leftActions: any;
     rightActions: any;
     createdDelegations = signal<boolean>(false);
     existingDelegations = signal<XRPLDelegate[]>([]);
     filteredDestinations = signal<DropdownItem[]>([]);
     highlightedIndex = signal<number>(-1);
     showDropdown = signal<boolean>(false);
     private overlayRef: OverlayRef | null = null;
     url = signal<string>('');
     public destinationSearch$ = new Subject<string>();
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);
     credentialData = signal<string>('');
     subject = signal<string>('');
     selectedWalletIndex = signal<number>(0);
     editingIndex!: (index: number) => boolean;
     tempName = signal<string>('');
     filterQuery = signal<string>('');
     showCredentialDropdown = signal<boolean>(false);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages(); // Reset shared state
          effect(() => this.updateInfoMessage());
          effect(() => {
               this.destinations.set([
                    ...this.wallets().map(
                         w =>
                              ({
                                   name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
                                   address: w.address,
                              } as DropdownItem)
                    ),
                    ...this.customDestinations(),
               ]);
          });
     }

     ngOnInit() {
          this.loadCustomDestinations();
          this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
          this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url.set(AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET);
          this.setupWalletSubscriptions();
          this.setupDropdownSubscriptions();
     }

     ngAfterViewInit(): void {
          document.addEventListener('keydown', e => {
               if (e.key === 'Escape' && this.showDropdown()) this.closeDropdown();
          });
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.selectWallet(wallet);
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.selectWallet(wallet);
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearTxSignal();
                    this.txUiService.clearTxResultSignal();
                    await this.getAccountDetails(false);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address || this.destinationField();
          if (currentDest === wallet.address) {
               this.destinationField.set('');
          }
     }

     private setupDropdownSubscriptions(): void {
          this.destinationDropdownService.filtered$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(list => {
               this.filteredDestinations.set(list);
               this.highlightedIndex.set(list.length > 0 ? 0 : -1);
          });

          this.destinationDropdownService.isOpen$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(open => (open ? this.openDropdownInternal() : this.closeDropdownInternal()));
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
          this.updateInfoMessage(); // Rebuild the HTML with new state
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'set'): Promise<void> {
          this.activeTab.set(tab);
          this.txUiService.clearTxSignal();
          this.txUiService.clearTxResultSignal();
          this.txUiService.clearAllOptions();
          await this.getAccountDetails(true);
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     toggleSelection(id: number, event?: Event) {
          // Prevent triggering twice if clicking checkbox directly
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
               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length) {
                         this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         return;
                    }

                    this.getExistingDelegations(accountObjects, wallet.classicAddress);

                    this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
                    this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

                    this.refreshUiState(wallet, accountInfo, accountObjects);
                    this.txUiService.clearAllOptionsAndMessages();
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async delegateActions(delegate: 'delegate' | 'clear') {
          await this.withPerf('delegateActions', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.updateSpinnerMessageSignal('');

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    if (this.destinationField() === '') {
                         return this.txUiService.setError(`Destination cannot be empty.`);
                    }

                    const isShortForm = this.destinationField().includes('...');
                    const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address : this.destinationField();
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                              fee,
                              currentLedger,
                         },
                         destination: {
                              address: resolvedDestination,
                              tag: '',
                         },
                    });
                    // const inputs = this.txUiService.getValidationInputs(this.currentWallet(), '');
                    // inputs.accountInfo = accountInfo;
                    // inputs.destination = resolvedDestination;

                    const errors = await this.validationService.validate('DelegateActions', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    let permissions: { Permission: { PermissionValue: string } }[] = [];
                    if (delegate === 'clear') {
                         console.log(`Clearing all delegate objects`);
                    } else {
                         const selectedActions = this.getSelectedActions();
                         console.log(`Selected Actions: `, selectedActions);

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
                         console.log(`permissions: `, permissions);
                    }

                    const delegateSetTx: xrpl.DelegateSet = {
                         TransactionType: 'DelegateSet',
                         Account: wallet.classicAddress,
                         Authorize: resolvedDestination,
                         Permissions: permissions,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, delegateSetTx, wallet, accountInfo, 'delegateActions');

                    const result = await this.txExecutor.delegateActions(delegateSetTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    if (this.txUiService.isSimulateEnabled()) {
                         this.txUiService.successMessage = 'Simulated Delegate action successfully!';
                    } else {
                         this.txUiService.successMessage = 'Delegate action successfully!';
                         await this.refreshAfterTx(client, wallet, resolvedDestination, true);
                    }
               } catch (error: any) {
                    console.error('Error in delegateAction:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private getExistingDelegations(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Delegate')
               .map((obj: any) => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         index: obj.index,
                         Authorize: obj.Authorize,
                         Permissions: obj.Permissions,
                         Flags: obj.Flags,
                    };
               });
          // .sort((a, b) => a.Expiration.localeCompare(b.Expiration));
          this.existingDelegations.set(mapped);
          this.utilsService.logObjects('existingDelegations', mapped);
     }

     private async setTxOptionalFields(client: xrpl.Client, delegateSetTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(delegateSetTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(delegateSetTx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          try {
               const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
               this.getExistingDelegations(accountObjects, wallet.classicAddress);
               destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
               if (addDest) this.addNewDestinationFromUser();
               this.refreshUiState(wallet, accountInfo, accountObjects);
               this.updateInfoMessage();
          } catch (error: any) {
               console.error('Error in refreshAfterTx:', error);
          }
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.multiSigningEnabled.set(hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.txUiService.signers.set(entries);
          }

          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

          this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     }

     private setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          this.txUiService.signers.set(signerEntries);
          this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     private clearMultiSignersConfiguration(): void {
          this.txUiService.signerQuorum.set(0);
          this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
          this.txUiService.multiSignSeeds.set('');
          this.storageService.removeValue('signerEntries');
     }

     private updateDestinations(): void {
          const walletItems: DropdownItem[] = this.wallets().map(wallet => ({
               name: wallet.name ?? this.truncateAddress(wallet.address),
               address: wallet.address,
          }));

          const allItems = [...walletItems, ...this.customDestinations()];
          this.destinations.set(allItems);

          // Optional: persist (you had this before)
          this.storageService.set('destinations', allItems);
     }

     private truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const encryption = this.currentWallet().encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, encryption as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private addNewDestinationFromUser(): void {
          const addr = this.destinationField().includes('...') ? this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address : this.destinationField();

          if (addr && xrpl.isValidAddress(addr) && !this.destinations().some(d => d.address === addr)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: addr }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
               this.updateDestinations();
          }
     }

     copyDelegateId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Delegate Id copied!');
          });
     }

     private updateInfoMessage(): void {
          if (!this.currentWallet().address) {
               this.txUiService.setInfoData(null);
               return;
          }

          const walletName = this.currentWallet().name || 'Selected wallet';
          const delegationCount = this.existingDelegations.length;

          let message: string;

          if (delegationCount === 0) {
               message = `<code>${walletName}</code> wallet has no delegations.`;
          } else {
               const delegationDescription = delegationCount === 1 ? 'delegation' : 'delegations';
               message = `<code>${walletName}</code> wallet has ${delegationCount} ${delegationDescription}.`;
          }

          this.txUiService.setInfoData({
               walletName,
               mode: this.activeTab(),
               didCount: this.existingDelegations().length,
               existingDid: this.existingDelegations(),
          });
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.txUiService.clearAllOptionsAndMessages();
     }

     filterDestinations() {
          const query = this.filterQuery().trim().toLowerCase();
          if (query === '') {
               this.filteredDestinations.set([...this.destinations()]);
          } else {
               this.filteredDestinations.set(this.destinations().filter(d => d.address.toLowerCase().includes(query) || d.name?.toLowerCase().includes(query)));
          }
          this.highlightedIndex.set(this.filteredDestinations().length > 0 ? 0 : -1);
     }

     clearDelegateActions() {
          this.selected.clear();
     }

     onArrowDown() {
          if (!this.showDropdown || this.filteredDestinations().length === 0) return;
          this.highlightedIndex.update(idx => (idx + 1) % this.filteredDestinations().length);
     }

     selectHighlighted() {
          if (this.highlightedIndex() >= 0 && this.filteredDestinations()[this.highlightedIndex()]) {
               const addr = this.filteredDestinations()[this.highlightedIndex()].address;
               if (addr !== this.currentWallet().address) {
                    this.destinationField.set(addr);
                    this.closeDropdown(); // Also close on Enter
               }
          }
     }

     openDropdown(): void {
          this.destinationDropdownService.setItems(this.destinations());
          this.destinationDropdownService.filter(this.destinationField());
          this.destinationDropdownService.openDropdown();
     }

     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     toggleDropdown() {
          this.destinationDropdownService.setItems(this.destinations());
          this.destinationDropdownService.toggleDropdown();
     }

     onDestinationInput() {
          this.destinationDropdownService.filter(this.destinationField() || '');
          this.destinationDropdownService.openDropdown();
     }

     selectDestination(address: string) {
          if (address === this.currentWallet().address) return;
          const dest = this.destinations().find((d: { address: string }) => d.address === address);
          this.destinationField.set(dest ? this.destinationDropdownService.formatDisplay(dest) : `${address.slice(0, 6)}...${address.slice(-6)}`);
          this.closeDropdown();
     }

     private openDropdownInternal() {
          if (this.overlayRef?.hasAttached()) return;
          const strategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 }]);
          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy: strategy,
               scrollStrategy: this.overlay.scrollStrategies.close(),
          });
          this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
          this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
     }

     private closeDropdownInternal() {
          this.overlayRef?.detach();
          this.overlayRef = null;
     }
}
