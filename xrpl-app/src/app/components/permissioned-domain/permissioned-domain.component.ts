import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, inject, TemplateRef, ViewContainerRef, ChangeDetectionStrategy, computed, DestroyRef, effect, signal, model } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import * as xrpl from 'xrpl';
import { PermissionedDomainSet, PermissionedDomainDelete } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
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
import { fromEvent } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { filter } from 'rxjs/operators';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../services/toast/toast.service';
import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';

interface PermissionedDomainInfo {
     AcceptedCredentials: {
          Credential: {
               CredentialType: string; // hex string for type, e.g. "4B5943..."
               Issuer: string; // XRPL account address
          };
     }[];
     Flags: number;
     LedgerEntryType: 'PermissionedDomain';
     Owner: string; // XRPL account address
     OwnerNode: string;
     PreviousTxnID: string; // Hash of previous transaction
     PreviousTxnLgrSeq: number; // Ledger sequence of that transaction
     Sequence: number; // Sequence of this object
     index: string; // Ledger object index (hash)
}

@Component({
     selector: 'app-permissioned-domain',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './permissioned-domain.component.html',
     styleUrl: './permissioned-domain.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionedDomainComponent extends PerformanceBaseComponent implements OnInit, AfterViewInit {
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('domainDropdownOrigin') domainDropdownOrigin!: ElementRef;
     @ViewChild('domainDropdownTemplate') domainDropdownTemplate!: TemplateRef<any>;

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
     private readonly dropdownService = inject(DestinationDropdownService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);

     // Domain Dropdown State
     selectedDomainId = signal<string | null>(null);
     domainSearchQuery = signal<string>('');
     // Destination Dropdown
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     private overlayRef: OverlayRef | null = null;
     private domainOverlayRef: OverlayRef | null = null;
     selectedDestinationAddress = signal<string>(''); // ← Raw r-address (model)
     destinationSearchQuery = signal<string>(''); // ← What user is typing right now
     destinationTagField = signal<string>('');

     // Permissioned Domain Specific
     credentialType = signal<string>('KYCCredential');
     domainId = signal<string>('');
     createdDomains = signal(false);
     createdPermissionedDomains = signal<any[]>([]);

     // Reactive State (Signals)
     activeTab = signal<'set' | 'delete'>('set');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     hasWallets = computed(() => this.wallets().length > 0);
     infoPanelExpanded = signal(false);
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);
     subject = signal<string>('');
     selectedWalletIndex = signal<number>(0);
     editingIndex!: (index: number) => boolean;
     tempName = signal<string>('');
     filterQuery = signal<string>('');
     showCredentialDropdown = signal<boolean>(false);

     explorerUrl = computed(() => {
          const env = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          return AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;
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

     domainDisplay = computed(() => {
          const id = this.selectedDomainId();
          if (!id) return this.domainSearchQuery() || '';
          return this.dropdownService.formatDomainId(id);
     });

     filteredDomains = computed(() => {
          const q = this.domainSearchQuery().trim().toLowerCase();
          const list = this.createdPermissionedDomains();

          if (q === '') return list;

          return list.filter(d => d.index.toLowerCase().includes(q));
     });

     infoData = computed(() => {
          if (!this.currentWallet().address) return null;
          const domains = this.createdPermissionedDomains();
          return {
               walletName: this.currentWallet().name || 'Selected wallet',
               mode: this.activeTab(),
               permissionedDomainCount: domains.length,
               permissionedDomainsToShow: domains,
          };
     });

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages(); // Reset shared state
          effect(() => this.txUiService.setInfoData(this.infoData()));
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
          this.setupDropdownSubscriptions();
     }

     ngAfterViewInit(): void {}

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
                    await this.getPermissionedDomainForAccount(false);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.selectedDestinationAddress(), this.destinations())?.address || this.selectedDestinationAddress();
          if (currentDest === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     private setupDropdownSubscriptions(): void {
          // this.dropdownService.filtered$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(list => {});
          this.dropdownService.isOpen$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(open => (open ? this.openDropdownInternal() : this.closeDropdownInternal()));
     }

     resetDomainDropDown() {
          this.selectedDomainId.set(null);
          this.domainId.set('');
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     toggleInfoPanel() {
          this.infoPanelExpanded.update(expanded => !expanded);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: 'set' | 'delete'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          await this.getPermissionedDomainForAccount();
     }

     toggleCreatedDomains() {
          this.createdDomains.update(val => !val);
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getPermissionedDomainForAccount(forceRefresh = false): Promise<void> {
          await this.withPerf('getPermissionedDomainForAccount', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.updateSpinnerMessageSignal('');

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    this.getCreatedPermissionedDomains(accountObjects, wallet.classicAddress);
                    this.refreshUiState(wallet, accountInfo, accountObjects);
                    this.txUiService.clearAllOptionsAndMessages();
               } catch (error: any) {
                    console.error('Error in getPermissionedDomainForAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async permissionedDomainSet() {
          await this.withPerf('permissionedDomainSet', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.updateSpinnerMessageSignal('');

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const issuerAddress = this.selectedDestinationAddress() ? this.selectedDestinationAddress() : this.destinationSearchQuery();
                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, accountObjects, fee, currentLedger },
                         subject: { subject: issuerAddress },
                    });

                    const errors = await this.validationService.validate('PermissionedDomainSet', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    const permissionedDomainTx: PermissionedDomainSet = {
                         TransactionType: 'PermissionedDomainSet',
                         Account: wallet.classicAddress,
                         AcceptedCredentials: [
                              {
                                   Credential: {
                                        Issuer: issuerAddress,
                                        CredentialType: Buffer.from(this.credentialType() || 'defaultCredentialType', 'utf8').toString('hex'),
                                   },
                              },
                         ],
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, permissionedDomainTx, wallet, accountInfo);

                    const result = await this.txExecutor.permissionedDomainSet(permissionedDomainTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Set Permissioned Domain successfully!' : 'Set Permissioned Domain successfully!';
                    await this.refreshAfterTx(client, wallet, issuerAddress, true);
               } catch (error: any) {
                    console.error('Error in permissionedDomainSet:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async permissionedDomainDelete() {
          await this.withPerf('permissionedDomainDelete', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               this.txUiService.updateSpinnerMessageSignal('');

               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);

                    const [{ accountInfo, accountObjects }, fee, currentLedger] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, false), this.xrplCache.getFee(this.xrplService, false), this.xrplService.getLastLedgerIndex(client)]);
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, accountObjects, fee, currentLedger },
                         domain: { domainId: this.domainId() },
                    });

                    const errors = await this.validationService.validate('PermissionedDomainDelete', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    const permissionDomainFound = accountObjects.result.account_objects.find((line: any) => {
                         return line.LedgerEntryType === 'PermissionedDomain' && line.index === this.domainId();
                    });

                    // If not found, exit early
                    if (!permissionDomainFound) {
                         return this.txUiService.setError(`No Permission Domain found for ${wallet.classicAddress} with ID ${this.domainId()}`);
                    }

                    const permissionedDomainDeleteTx: PermissionedDomainDelete = {
                         TransactionType: 'PermissionedDomainDelete',
                         Account: wallet.classicAddress,
                         DomainID: this.domainId(),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, permissionedDomainDeleteTx, wallet, accountInfo);

                    const result = await this.txExecutor.permissionedDomainDelete(permissionedDomainDeleteTx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });
                    if (!result.success) return;

                    this.txUiService.successMessage = this.txUiService.isSimulateEnabled() ? 'Simulated Permisioned Domain deletion successfully!' : 'Permissioned Domain deleted successfully!';
                    await this.refreshAfterTx(client, wallet, null, false);
                    this.resetDomainDropDown();
               } catch (error: any) {
                    console.error('Error in permissionedDomainDelete:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     private getCreatedPermissionedDomains(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PermissionedDomain' && obj.Owner === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         AcceptedCredentials: obj.AcceptedCredentials
                              ? JSON.stringify(
                                     obj.AcceptedCredentials.map(
                                          (item: {
                                               Credential: {
                                                    CredentialType: any;
                                                    Issuer?: string; // Assuming Issuer exists in the original data
                                               };
                                          }) => ({
                                               ...item,
                                               Credential: {
                                                    ...item.Credential,
                                                    CredentialType: Buffer.from(item.Credential.CredentialType, 'hex').toString('utf8'),
                                                    Issuer: item.Credential.Issuer, // Adjust based on actual structure
                                               },
                                          })
                                     ),
                                     null,
                                     ''
                                )
                              : 'N/A',
                         Owner: obj.Owner,
                         Sequence: obj.Sequence,
                    };
               })
               .sort((a, b) => a.index.localeCompare(b.index));
          this.createdPermissionedDomains.set(mapped);
          this.utilsService.logObjects('createdPermissionedDomains', this.createdPermissionedDomains);
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, permissionDomainTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(permissionDomainTx, ticket, true);
               }
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(permissionDomainTx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, wallet: xrpl.Wallet, destination: string | null, addDest: boolean): Promise<void> {
          const { accountInfo, accountObjects } = await this.xrplCache.getAccountData(wallet.classicAddress, true);
          this.getCreatedPermissionedDomains(accountObjects, wallet.classicAddress);
          destination ? await this.refreshWallets(client, [wallet.classicAddress, destination]) : await this.refreshWallets(client, [wallet.classicAddress]);
          if (addDest) this.addNewDestinationFromUser(destination ? destination : '');
          this.refreshUiState(wallet, accountInfo, accountObjects);
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

     updateDestinations() {
          // Optional: persist destinations
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

     copyPermissionedDomainId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.txUiService.showToastMessage('Permissioned Domain ID copied!');
          });
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.txUiService.clearAllOptionsAndMessages();
     }

     onDestinationInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;

          this.destinationSearchQuery.set(value);
          this.selectedDestinationAddress.set(''); // clear selection when typing

          // this.dropdownService.filter(value);
          if (value) {
               this.dropdownService.openDropdown();
          }
     }

     selectDestination(address: string): void {
          if (address === this.currentWallet().address) return;

          this.selectedDestinationAddress.set(address); // ← Store raw address
          this.destinationSearchQuery.set(''); // ← Clear typing
          this.closeDropdown();
     }

     onArrowDown() {
          if (this.filteredDestinations().length === 0) return;
     }

     openDropdown(): void {
          this.dropdownService.setItems(this.destinations());
          // this.dropdownService.filter(this.destinationSearchQuery());

          // Always reset search when opening fresh
          this.destinationSearchQuery.set('');
          this.dropdownService.openDropdown();
     }

     closeDropdown(): void {
          this.dropdownService.closeDropdown();

          if (this.overlayRef) {
               this.overlayRef.dispose();
               this.overlayRef = null;
          }

          if (this.domainOverlayRef) {
               this.domainOverlayRef.dispose();
               this.domainOverlayRef = null;
          }
     }

     toggleDropdown(): void {
          this.dropdownService.setItems(this.destinations());
          this.dropdownService.toggleDropdown();
     }

     private openDropdownInternal(): void {
          if (this.overlayRef?.hasAttached()) return;

          if (this.overlayRef) {
               this.overlayRef.dispose(); // CRITICAL
               this.overlayRef = null;
          }

          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
               ])
               .withPush(false)
               .withFlexibleDimensions(false)
               .withViewportMargin(8);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(), // Better than close()
               width: this.dropdownOrigin.nativeElement.getBoundingClientRect().width, // Match input width!
          });

          this.overlayRef.attach(new TemplatePortal(this.dropdownTemplate, this.viewContainerRef));
          this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
     }

     private closeDropdownInternal(): void {
          this.overlayRef?.detach();
          this.overlayRef = null;
     }

     openDomainDropdown(): void {
          if (this.domainOverlayRef?.hasAttached()) return;

          // Always destroy first — no exceptions
          if (this.domainOverlayRef) {
               this.domainOverlayRef.dispose();
               this.domainOverlayRef = null;
          }

          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.domainDropdownOrigin)
               .withPositions([
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
               ]);

          this.domainOverlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.reposition(),
               width: this.domainDropdownOrigin.nativeElement.getBoundingClientRect().width,
          });

          this.domainOverlayRef.attach(new TemplatePortal(this.domainDropdownTemplate, this.viewContainerRef));
          this.domainOverlayRef.backdropClick().subscribe(() => this.closeDomainDropdown());
     }

     closeDomainDropdown(): void {
          this.domainOverlayRef?.detach();
          this.domainOverlayRef = null;
     }

     selectDomain(domainId: string): void {
          this.selectedDomainId.set(domainId);
          this.domainId.set(domainId); // Auto-fill the Domain ID field
          this.domainSearchQuery.set(''); // Clear search
          this.closeDomainDropdown();
     }

     onDomainInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.domainSearchQuery.set(value);
          this.selectedDomainId.set(null); // Clear selection while typing
     }
}
