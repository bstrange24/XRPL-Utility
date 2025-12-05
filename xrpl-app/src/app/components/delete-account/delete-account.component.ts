import { animate, style, transition, trigger } from '@angular/animations';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';

import { DropdownItem } from '../../models/dropdown-item.model';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';

import { XrplCacheService } from '../../services/xrpl-cache/xrpl-cache.service';
import { PerformanceBaseComponent } from '../base/performance-base/performance-base.component';
import { TransactionOptionsComponent } from '../common/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';

import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';

@Component({
     selector: 'app-delete-account',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './delete-account.component.html',
     styleUrl: './delete-account.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccountComponent extends PerformanceBaseComponent implements OnInit, AfterViewInit {
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

     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;

     // Page-specific state only
     activeTab = signal<'deleteAccount'>('deleteAccount');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     hasWallets = computed(() => this.wallets().length > 0);

     destinationField = signal<string>('');
     destinationTagField = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     destinations = signal<DropdownItem[]>([]);
     canDelete = signal(false);
     deleteBlockers = signal<string[]>([]);

     filteredDestinations = signal<DropdownItem[]>([]);
     highlightedIndex = signal<number>(-1);
     showDropdown = signal<boolean>(false);
     private overlayRef: OverlayRef | null = null;

     accountInfo = signal<any>(null);
     multiSigningEnabled = signal<boolean>(false);
     regularKeySigningEnabled = signal<boolean>(false);

     filterQuery = signal<string>('');
     selectedWalletIndex = signal<number>(0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages(); // Reset shared state
          effect(() => this.updateInfoMessage(null, null));
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

     ngOnInit(): void {
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

     private async setupWalletSubscriptions() {
          this.walletManagerService.wallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(wallets => {
               this.wallets.set(wallets);
               if (this.hasWallets() && !this.currentWallet().address) {
                    const idx = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const wallet = wallets[idx];
                    if (wallet) {
                         this.selectWallet(wallet);
                         this.selectedWalletIndex.set(idx);
                    }
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

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
          const idx = this.wallets().findIndex(w => w.address === wallet.address);
          if (idx !== -1) {
               this.selectedWalletIndex.set(idx);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.withPerf('getAccountDetails', async () => {
               this.txUiService.clearMessages();
               this.txUiService.updateSpinnerMessage('');

               try {
                    const client = await this.getClient();
                    const wallet = await this.getWallet();

                    const [{ accountInfo, accountObjects }, serverInfo] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh), this.xrplCache.getServerInfo(this.xrplService)]);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length) {
                         this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         return;
                    }

                    this.updateInfoMessage(accountInfo, serverInfo);
                    this.refreshUiState(wallet, accountInfo, accountObjects);
                    this.txUiService.clearAllOptionsAndMessages();
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    return this.txUiService.setError(`${error.message || 'Unknown error'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async deleteAccount(): Promise<void> {
          await this.withPerf('deleteAccount', async () => {
               this.txUiService.clearMessages();

               if (!this.destinationField()) {
                    return this.txUiService.setError('Destination cannot be empty.');
               }

               const resolvedDestination = this.destinationField().includes('...') ? this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address : this.destinationField();

               if (!resolvedDestination || !xrpl.isValidAddress(resolvedDestination)) {
                    return this.txUiService.setError('Invalid destination address.');
               }

               try {
                    const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

                    const [accountInfo, accountObjects, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.checkAccountObjectsForDeletion(client, wallet.classicAddress), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);

                    // const inputs = this.txUiService.getValidationInputs(this.currentWallet(), resolvedDestination, this.destinationTagField());
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: {
                              accountInfo,
                              accountObjects,
                              currentLedger,
                              serverInfo,
                         },
                         destination: {
                              address: resolvedDestination,
                              tag: '',
                         },
                         sequence: {
                              sequenceId: accountInfo.result.account_data.Sequence,
                         },
                    });

                    const errors = await this.validationService.validate('AccountDelete', { inputs, client, accountInfo, accountObjects, currentLedger, serverInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    const tx: xrpl.AccountDelete = {
                         TransactionType: 'AccountDelete',
                         Account: wallet.classicAddress,
                         Destination: resolvedDestination,
                         Sequence: accountInfo.result.account_data.Sequence,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, tx, wallet, accountInfo);

                    const result = await this.txExecutor.accountDelete(tx, wallet, client, {
                         useMultiSign: this.txUiService.useMultiSign(),
                         isRegularKeyAddress: this.txUiService.isRegularKeyAddress(),
                         regularKeySeed: this.txUiService.regularKeySeed(),
                         multiSignAddress: this.txUiService.multiSignAddress(),
                         multiSignSeeds: this.txUiService.multiSignSeeds(),
                    });

                    if (!result.success) return;

                    if (this.txUiService.isSimulateEnabled()) {
                         this.txUiService.successMessage = 'Simulated Account delete successfully!';
                    } else {
                         this.txUiService.successMessage = 'Account deleted successfully!';
                         this.deleteWalletAfterDeleteTx(this.selectedWalletIndex());
                         await this.refreshAfterTx(client, resolvedDestination);
                    }
               } catch (error: any) {
                    console.error('Error in deleteAccount:', error);
                    return this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     deleteWalletAfterDeleteTx(index: number) {
          this.walletManagerService.deleteWallet(index);
          if (this.selectedWalletIndex() >= this.wallets().length) {
               this.selectedWalletIndex.set(Math.max(0, this.wallets().length - 1));
               const wallet = this.wallets()[this.selectedWalletIndex()];
               this.currentWallet.set(wallet ? { ...wallet } : ({} as Wallet));
          }
     }

     private async getWallet(): Promise<xrpl.Wallet> {
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet().seed, this.currentWallet().encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) throw new Error('Wallet could not be created');
          return wallet;
     }

     private async setTxOptionalFields(client: xrpl.Client, tx: any, wallet: xrpl.Wallet, accountInfo: any): Promise<void> {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(tx, ticket, true);
               }
          }

          if (this.destinationTagField()) {
               this.utilsService.setDestinationTag(tx, this.destinationTagField());
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(tx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, destination: string): Promise<void> {
          try {
               await this.refreshWallets(client, [destination]);
               this.getAccountDetails(true);
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

     private addNewDestinationFromUser(): void {
          const addr = this.destinationField().includes('...') ? this.walletManagerService.getDestinationFromDisplay(this.destinationField(), this.destinations())?.address : this.destinationField();

          if (addr && xrpl.isValidAddress(addr) && !this.destinations().some(d => d.address === addr)) {
               this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: addr }]);
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
          }
     }

     private updateInfoMessage(accountInfo: any, serverInfo: any): void {
          if (!this.currentWallet().address) {
               this.txUiService.setInfoData(null);
               return;
          }

          const walletName = this.currentWallet().name || 'Selected wallet';

          if (!accountInfo?.result) {
               let message = `<code>${walletName}</code> wallet can be deleted.`;
               this.txUiService.setInfoData({
                    walletName,
                    message: message,
               });
               return;
          }

          const accountData = accountInfo.result.account_data;
          const accountFlags = accountInfo.result.account_flags;

          const hasRegularKey = !!accountData.RegularKey;
          const hasSignerList = !!accountFlags.enableSignerList;
          const ownerCount = Number(accountData.OwnerCount || 0);

          const ticketCount = Number(accountData.TicketCount || 0);
          const hasHooks = Array.isArray(accountData.Hooks) && accountData.Hooks.length > 0;

          // === Build blocking issues ===
          const issues: string[] = [];
          if (hasRegularKey) issues.push('This account has a Regular Key configured.');
          if (hasSignerList) issues.push('This account has a Signer List configured.');
          if (ownerCount > 0) issues.push(`This account has <strong>${ownerCount}</strong> owner object${ownerCount !== 1 ? 's' : ''} (trust lines, offers, escrows, checks, etc.).`);
          if (ticketCount > 0) issues.push(`This account has <strong>${ticketCount}</strong> allocated Ticket${ticketCount !== 1 ? 's' : ''}. All tickets must be used or canceled.`);
          if (hasHooks) issues.push('This account has one or more Hooks installed. All Hooks must be removed first.');

          // === Time-based deletion rule (256 ledgers) ===
          const lastTxLedger = Number(accountData.PreviousTxnLgrSeq ?? 0);

          // You must pass this into the function (or fetch it in here if you prefer)
          const currentLedger = Number(serverInfo.result.info.validated_ledger.seq ?? 0);

          if (lastTxLedger > 0 && currentLedger > 0) {
               const ledgersSinceLastTx = currentLedger - lastTxLedger;
               const required = 256;

               if (ledgersSinceLastTx < required) {
                    const remaining = required - ledgersSinceLastTx;
                    const approxMinutes = Math.ceil((remaining * 4) / 60); // ~4 seconds per ledger
                    issues.push(`This account made a recent transaction. You must wait <strong>${remaining} more ledgers</strong> ` + `(~ ${approxMinutes} minute${approxMinutes !== 1 ? 's' : ''}) before deletion is allowed.`);
               }
          }

          let message = `<code>${walletName}</code> wallet `;

          if (issues.length === 0) {
               message += `<strong>can be deleted</strong>. There are no blocking configurations on this account.`;
               this.txUiService.setInfoData({
                    walletName,
                    message: message,
               });
               this.canDelete.set(issues.length === 0);
               return;
          } else {
               message += `has the following configuration that <strong>prevents deletion</strong>:<ul>`;
               issues.forEach(i => (message += `<li>${i}</li>`));
               message += `</ul>`;
          }

          // === Requirements ===
          message += `<strong>Requirements for successful account deletion:</strong><ul>
  <li>All owner objects must be deleted first (trust lines, offers, escrows, checks, NFTs, etc.)</li>
  <li>All Tickets must be used or canceled (TicketCount must be 0)</li>
  <li>All Hooks must be removed (if any are installed)</li>
  <li>The account must send all remaining XRP to another account</li>
  <li>The account must have no Regular Key configured</li>
  <li>The account must have no active Signer List</li>
</ul>`;

          // === Balance check – safe & type-correct ===
          const balanceXrp = Number(xrpl.dropsToXrp(String(accountData.Balance))); // ← cast to string first

          const baseReserveXrp = Number(serverInfo.xrpReserve?.baseReserve ?? 10);
          const ownerReserveXrp = Number(serverInfo.xrpReserve?.ownerReserve ?? 2);
          const totalReserveXrp = baseReserveXrp + ownerCount * ownerReserveXrp;
          const deleteFeeXrp = 2; // AccountDelete fee
          const minimumNeededXrp = totalReserveXrp + deleteFeeXrp;

          if (balanceXrp < minimumNeededXrp) {
               message += `<br><strong>Warning:</strong> Insufficient balance. ` + `Account needs at least <strong>${minimumNeededXrp.toFixed(6)} XRP</strong> ` + `(${totalReserveXrp.toFixed(6)} reserve + 2 XRP deletion fee).`;
          }

          this.deleteBlockers.set(issues);
          this.canDelete.set(issues.length === 0);

          this.txUiService.setInfoData({
               walletName,
               message: message,
          });
     }

     get deleteWalletTooltip(): string {
          if (this.txUiService.spinner()) return 'Transaction in progress…';

          const blockers = this.deleteBlockers() || [];

          return blockers.length ? blockers.map(b => this.stripHtml(b)).join(' \n ') : '';
     }

     stripHtml(text: string): string {
          return text.replace(/<\/?[^>]+(>|$)/g, '');
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
