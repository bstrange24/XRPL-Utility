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
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';

interface ValidationInputs {
     selectedAccount?: string;
     senderAddress?: string;
     accountInfo?: any;
     seed?: string;
     destination?: string;
     amount?: string;
     sequence?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeyAccount?: string;
     regularKeyAccountSeeds?: string;
     regularKeySeed?: string;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     selectedSingleTicket?: string;
     selectedTicket?: string;
     signerQuorum?: number;
     signers?: { account: string; weight: number }[];
}

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
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TooltipLinkComponent],
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

     // Credential lists
     // existingCredentials = signal<CredentialItem[]>([]);
     // subjectCredentials = signal<CredentialItem[]>([]);

     // Filtered credentials — derived state, fully reactive
     // filteredExisting = computed(() => this.filterCredentials(this.existingCredentials(), this.credentialSearchTerm()));
     // filteredSubject = computed(() => this.filterCredentials(this.subjectCredentials(), this.credentialSearchTerm()));
     // credentialSearchTerm = signal<string>('');
     // selectedCredentials = signal<CredentialItem | null>(null);
     // createdCredentials = signal<boolean>(true);
     // subjectCredential = signal<boolean>(true);

     // Form & UI State
     destinationField = signal<string>('');
     infoPanelExpanded = signal(false);
     isRegularKeyAddress = signal<boolean>(false);
     regularKeyAddress = signal<string>('');
     regularKeySeed = signal<string>('');
     useMultiSign = signal<boolean>(false);
     multiSignAddress = signal<string>('');
     multiSignSeeds = signal<string>('');
     isTicket = signal<boolean>(false);
     selectedSingleTicket = signal<string>('');
     selectedTicket = signal<string>('');
     memoField = signal<string>('');
     isMemoEnabled = signal<boolean>(false);

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
     selectedTickets = signal<string[]>([]);
     multiSelectMode = signal<boolean>(false);
     signers = signal<{ account: string; seed: string; weight: number }[]>([{ account: '', seed: '', weight: 1 }]);
     signerQuorum = signal<number>(0);
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);
     ticketArray = signal<string[]>([]);
     masterKeyDisabled = signal<boolean>(false);
     credentialData = signal<string>('');
     subject = signal<string>('');
     selectedWalletIndex = signal<number>(0);
     editingIndex!: (index: number) => boolean;
     tempName = signal<string>('');
     filterQuery = signal<string>('');
     showCredentialDropdown = signal<boolean>(false);

     constructor() {
          super();
          this.txUiService.clearTxSignal();
          this.txUiService.clearTxResultSignal();
          effect(() => this.updateInfoMessage());
          effect(() => {
               this.destinations.set([...this.wallets().map(w => ({ name: w.name ?? `Wallet ${w.address.slice(0, 8)}`, address: w.address } as DropdownItem)), ...this.customDestinations()]);
          });
     }

     ngOnInit() {
          this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
          this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url.set(AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET);

          this.loadCustomDestinations();
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

     private setupWalletSubscriptions(): void {
          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);

               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) this.currentWallet.set({ ...wallet });
               }
          });

          this.walletManagerService.selectedIndex$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(index => {
               const wallet = this.wallets()[index];
               if (wallet) {
                    this.currentWallet.set({ ...wallet });
                    this.xrplCache.invalidateAccountCache(wallet.address);
                    this.txUiService.clearTxSignal();
                    this.txUiService.clearTxResultSignal();
                    this.getAccountDetails(false);
               }
          });
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

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign(), this.signers(), (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.txUiService.setError(`${error.message}`);
          }
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
          this.updateInfoMessage(); // Rebuild the HTML with new state
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet.set({ ...wallet });
          // Prevent setting self as the destination after switching wallet
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address || this.destinationField();
          if (currentDest === wallet.address) {
               this.destinationField.set('');
          }
     }

     async setTab(tab: 'set'): Promise<void> {
          this.activeTab.set(tab);
          this.clearFields(true);
          await this.getAccountDetails();
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
                    const client = await this.getClient();
                    const wallet = await this.getWallet();
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length) {
                         this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         return;
                    }

                    this.getExistingDelegations(accountObjects, wallet.classicAddress);

                    this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
                    this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.clearFields(false);
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
               }
          });
     }

     async delegateActions(delegate: 'delegate' | 'clear') {
          await this.withPerf('delegateActions', async () => {
               this.txUiService.clearMessages();
               this.txUiService.updateSpinnerMessage(``);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet().seed,
                    isRegularKeyAddress: this.isRegularKeyAddress(),
                    regularKeyAddress: this.isRegularKeyAddress() ? this.regularKeyAddress() : undefined,
                    regularKeySeed: this.isRegularKeyAddress() ? this.regularKeySeed() : undefined,
                    useMultiSign: this.useMultiSign(),
                    multiSignAddresses: this.useMultiSign() ? this.multiSignAddress() : undefined,
                    multiSignSeeds: this.useMultiSign() ? this.multiSignSeeds() : undefined,
                    isTicket: this.isTicket(),
                    selectedTicket: this.selectedTicket(),
                    selectedSingleTicket: this.selectedSingleTicket(),
               };

               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();

                    const [accountInfo, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);

                    if (this.destinationField() === '') {
                         return this.txUiService.setError(`Destination cannot be empty.`);
                    }

                    const isShortForm = this.destinationField().includes('...');
                    const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address : this.destinationField();
                    inputs.accountInfo = accountInfo;
                    inputs.destination = resolvedDestination;
                    const destination = resolvedDestination;

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
                         Authorize: destination,
                         Permissions: permissions,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, delegateSetTx, wallet, accountInfo, 'delegateActions');

                    const result = await this.txExecutor.delegateActions(delegateSetTx, wallet, client, {
                         useMultiSign: this.useMultiSign(),
                         isRegularKeyAddress: this.isRegularKeyAddress(),
                         regularKeySeed: this.regularKeySeed(),
                         multiSignAddress: this.multiSignAddress(),
                         multiSignSeeds: this.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    if (!this.txUiService.isSimulateEnabled) {
                         this.txUiService.successMessage = 'Delegate action successfully!';
                         await this.refreshAfterTx(client, wallet, resolvedDestination, true);
                    } else {
                         this.txUiService.successMessage = 'Simulated Delegate action successfully!';
                    }
               } catch (error: any) {
                    console.error('Error in delegateAction:', error);
                    this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner = false;
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
          if (this.selectedSingleTicket()) {
               const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket()));
               if (!exists) throw new Error(`Ticket ${this.selectedSingleTicket()} not found`);
               this.utilsService.setTicketSequence(delegateSetTx, this.selectedSingleTicket(), true);
          } else {
               if (this.multiSelectMode() && this.selectedTickets().length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets());
                    this.utilsService.setTicketSequence(delegateSetTx, accountInfo.result.account_data.Sequence, false);
               }
          }
          if (this.memoField()) this.utilsService.setMemoField(delegateSetTx, this.memoField());
     }

     private async refreshAfterTx(client: any, wallet: any, resolvedDestination: string | null, addNewDestinationFromUser: boolean) {
          try {
               const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
               this.getExistingDelegations(accountObjects, wallet.classicAddress);
               resolvedDestination ? await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error) : await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);
               if (addNewDestinationFromUser) this.addNewDestinationFromUser();
               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers());
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
          } catch (error: any) {
               console.error('Error in refreshAfterTx:', error);
          }
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     private updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          const tickets = this.utilsService.getAccountTickets(accountObjects);
          this.ticketArray.update(() => [...tickets]);
          if (this.multiSelectMode()) {
               this.selectedSingleTicket.set(this.utilsService.cleanUpMultiSelection(this.selectedTickets(), tickets));
          } else {
               this.selectedSingleTicket.set(this.utilsService.cleanUpSingleSelection(this.selectedTickets(), tickets));
          }
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          // Tickets
          this.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));
          this.selectedTicket.set(this.ticketArray()[0] || this.selectedTicket());
          // Signer accounts
          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          this.signerQuorum.set(signerQuorum);
          const hasSignerAccounts = signerAccounts?.length > 0;
          this.checkForMultiSigners(hasSignerAccounts, wallet);
          // Boolean flags
          this.multiSigningEnabled.set(hasSignerAccounts);
          this.useMultiSign.set(false);
          this.masterKeyDisabled.set(Boolean(accountInfo?.result?.account_flags?.disableMasterKey));
          this.clearFields(false);
     }

     private checkForMultiSigners(hasSignerAccounts: boolean, wallet: xrpl.Wallet) {
          if (hasSignerAccounts) {
               const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
               this.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
          } else {
               this.signerQuorum.set(0);
               this.multiSignAddress.set('No Multi-Sign address configured for account');
               this.multiSignSeeds.set('');
               this.storageService.removeValue('signerEntries');
          }
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;
          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;
          // Set regular key properties
          const rkProps = this.utilsService.setRegularKeyProperties(regularKey, accountData.Account) || { regularKeyAddress: 'No RegularKey configured for account', regularKeySeed: '', isRegularKeyAddress: false };
          this.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.regularKeySeed.set(rkProps.regularKeySeed);
          // Set master key property
          this.masterKeyDisabled.set(isMasterKeyDisabled);
          // Set regular key signing enabled flag
          this.regularKeySigningEnabled.set(!!regularKey);
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

     private addNewDestinationFromUser() {
          const addr = this.destinationField().includes('...') ? this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address : this.destinationField();
          if (addr && xrpl.isValidAddress(addr) && !this.destinations().some(d => d.address === addr)) {
               this.customDestinations.update(dest => [...dest, { name: `Custom ${dest.length + 1}`, address: addr }]);
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
          return this.txUiService.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     clearFields(all = true) {
          if (all) {
               this.txUiService.successMessage = '';
               this.txUiService.clearTxSignal();
               this.txUiService.clearTxResultSignal();
               this.txUiService.isSimulateEnabled = false;
               this.txUiService.clearMessages();
               this.txUiService.clearWarning();
          }

          this.isRegularKeyAddress.set(false);
          this.useMultiSign.set(false);
          this.selectedSingleTicket.set('');
          this.isTicket.set(false);
          this.selectedTicket.set('');
          this.isMemoEnabled.set(false);
          this.memoField.set('');
     }

     filterDestinations() {
          const query = this.filterQuery().trim().toLowerCase();
          if (query === '') {
               this.filteredDestinations.set([...this.destinations()]);
          } else {
               this.filteredDestinations.set(this.destinations().filter(d => d.address.toLowerCase().includes(query) || (d.name && d.name.toLowerCase().includes(query))));
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
