import { animate, style, transition, trigger } from '@angular/animations';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { DropdownItem } from '../../models/dropdown-item.model';
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
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import { TooltipLinkComponent } from '../common/tooltip-link/tooltip-link.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Component({
     selector: 'app-delete-account',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './delete-account.component.html',
     styleUrl: './delete-account.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccountComponent extends PerformanceBaseComponent implements OnInit {
     private readonly destroyRef = inject(DestroyRef);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly validationService = inject(ValidationService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);

     // Delete account State
     accountInfo = signal<any>(null);
     serverInfo = signal<any>(null);
     accountObjects = signal<any>(null);
     blockingObjects = signal<any>(null);

     // Destination Dropdown
     typedDestination = signal<string>('');
     customDestinations = signal<{ name?: string; address: string }[]>([]);
     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');

     // Reactive State (Signals)
     activeTab = signal<'deleteAccount'>('deleteAccount');
     wallets = signal<Wallet[]>([]);
     currentWallet = signal<Wallet>({} as Wallet);
     selectedWalletIndex = signal<number>(0);

     destinationItems = computed(() => {
          const currentAddr = this.currentWallet().address;

          // Build the list directly from wallets + custom destinations
          const allDestinations = [
               ...this.wallets().map(w => ({
                    address: w.address,
                    name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
               })),
               ...this.customDestinations(),
          ];

          return allDestinations.map(d => ({
               id: d.address,
               display: d.name || 'Unknown Wallet',
               secondary: d.address,
               isCurrentAccount: d.address === currentAddr,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     selectedDestinationItem = computed(() => {
          const addr = this.selectedDestinationAddress();
          if (!addr) return null;
          return this.destinationItems().find(i => i.id === addr) || null;
     });

     hasWallets = computed(() => this.wallets().length > 0);

     infoData = computed(() => {
          const wallet = this.currentWallet();
          if (!wallet?.address) {
               return null;
          }

          const walletName = wallet.name || 'Selected wallet';
          const acc = this.accountInfo()?.result?.account_data;
          const flags = this.accountInfo()?.result?.account_flags;
          const srv = this.serverInfo()?.result?.info?.validated_ledger;
          const blockingObjects = this.blockingObjects();
          const blockingObjectsCount = blockingObjects?.result?.account_objects?.length;

          if (!acc) {
               return {
                    walletName,
                    message: `<code>${walletName}</code> wallet can be deleted.`,
               };
          }

          // === Extract data safely ===
          const hasRegularKey = !!acc.RegularKey;
          const hasSignerList = !!flags?.enableSignerList;
          const ownerCount = Number(acc.OwnerCount || 0);
          const ticketCount = Number(acc.TicketCount || 0);
          const hasHooks = Array.isArray(acc.Hooks) && acc.Hooks.length > 0;
          const lastTxLedger = Number(acc.PreviousTxnLgrSeq ?? 0);
          const currentLedger = Number(srv?.seq ?? 0);
          const totalCount = ownerCount + blockingObjectsCount;

          // === Build blockers ===
          const issues: string[] = [];
          if (hasRegularKey) issues.push('This account has a Regular Key configured.');
          if (hasSignerList) issues.push('This account has a Signer List configured.');
          if (totalCount > 0) issues.push(`This account has <strong>${totalCount}</strong> owner object${totalCount == 1 ? '' : 's'} (trust lines, offers, escrows, checks, etc.).`);
          if (ticketCount > 0) issues.push(`This account has <strong>${ticketCount}</strong> allocated Ticket${ticketCount == 1 ? '' : 's'}. All tickets must be used or canceled.`);
          if (hasHooks) issues.push('This account has one or more Hooks installed. All Hooks must be removed first.');

          // === 256-ledger rule ===
          if (lastTxLedger > 0 && currentLedger > 0) {
               const ledgersSinceLastTx = currentLedger - lastTxLedger;
               const required = 256;
               if (ledgersSinceLastTx < required) {
                    const remaining = required - ledgersSinceLastTx;
                    const approxMinutes = Math.ceil((remaining * 4) / 60);
                    issues.push(`This account made a recent transaction. You must wait <strong>${remaining} more ledgers</strong> (~ ${approxMinutes} minute${approxMinutes !== 1 ? 's' : ''}) before deletion is allowed.`);
               }
          }

          // === Build message ===
          let message = `<code>${walletName}</code> wallet `;

          if (issues.length === 0) {
               message += `<strong>can be deleted</strong>. There are no blocking configurations on this account.<br><br>`;
          } else {
               message += `has the following configuration that <strong>prevents deletion</strong>:<ul>`;
               issues.forEach(i => (message += `<li>${i}</li>`));
               message += `</ul>`;
          }

          // === Requirements list ===
          message += `<strong>Requirements for successful account deletion:</strong><ul>
    <li>All owner objects must be deleted first (trust lines, offers, escrows, checks, NFTs, etc.)</li>
    <li>All Tickets must be used or canceled (TicketCount must be 0)</li>
    <li>All Hooks must be removed (if any are installed)</li>
    <li>The account must send all remaining XRP to another account</li>
    <li>The account must have no Regular Key configured</li>
    <li>The account must have no active Signer List</li>
  </ul>`;

          // === Balance check ===
          const balanceXrp = Number(xrpl.dropsToXrp(String(acc.Balance)));
          const baseReserve = Number(this.serverInfo()?.result?.info?.validated_ledger?.base_fee_xrp ?? '0.000001');
          const ownerReserve = Number(this.serverInfo()?.result?.info?.validated_ledger?.reserve_inc_xrp ?? 2);
          const totalReserve = baseReserve + ownerCount * ownerReserve;
          const minNeeded = totalReserve + 0.2; // +2 XRP delete fee

          if (balanceXrp < minNeeded) {
               message += `<br><strong>Warning:</strong> Insufficient balance. Account needs at least <strong>${minNeeded.toFixed(6)} XRP</strong> (${totalReserve.toFixed(6)} reserve + 2 XRP deletion fee).`;
          }

          return { walletName, message };
     });

     // Update blockers & canDelete from the same source
     deleteBlockers = computed(() => {
          const issues: string[] = [];
          const acc = this.accountInfo()?.result?.account_data;
          const flags = this.accountInfo()?.result?.account_flags;
          if (!acc) return issues;

          const hasRegularKey = !!acc.RegularKey;
          const hasSignerList = !!flags?.enableSignerList;
          const ownerCount = Number(acc.OwnerCount || 0);
          const ticketCount = Number(acc.TicketCount || 0);
          const hasHooks = Array.isArray(acc.Hooks) && acc.Hooks.length > 0;

          if (hasRegularKey) issues.push('Regular Key set');
          if (hasSignerList) issues.push('Signer List active');
          if (ownerCount > 0) issues.push(`${ownerCount} owner objects`);
          if (ticketCount > 0) issues.push(`${ticketCount} tickets allocated`);
          if (hasHooks) issues.push('Hooks installed');

          // Add ledger wait if needed
          const lastTx = Number(acc.PreviousTxnLgrSeq ?? 0);
          const current = Number(this.serverInfo()?.result?.info?.validated_ledger?.seq ?? 0);
          if (lastTx > 0 && current > 0 && current - lastTx < 256) {
               issues.push(`Waiting ${256 - (current - lastTx)} ledgers`);
          }

          return issues;
     });

     canDelete = computed(() => this.deleteBlockers().length === 0);

     constructor() {
          super();
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.loadCustomDestinations();
          this.setupWalletSubscriptions();
     }

     private loadCustomDestinations(): void {
          const stored = this.storageService.get('customDestinations');
          if (stored) this.customDestinations.set(JSON.parse(stored));
     }

     private async setupWalletSubscriptions() {
          this.walletManagerService.hasWalletsFromWallets$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(hasWallets => {
               if (hasWallets) {
                    this.txUiService.clearWarning?.();
               } else {
                    this.txUiService.setWarning('No wallets exist. Create a new wallet before continuing.');
                    this.txUiService.setError('');
               }
          });

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
                    this.txUiService.clearAllOptionsAndMessages();
                    this.clearInputFields();
                    await this.getAccountDetails(false);
               }
          });
     }

     private selectWallet(wallet: Wallet): void {
          this.currentWallet.set({ ...wallet });
          this.txUiService.currentWallet.set({ ...wallet });
          this.xrplCache.invalidateAccountCache(wallet.address);

          // Prevent self as destination
          if (this.selectedDestinationAddress() === wallet.address) {
               this.selectedDestinationAddress.set('');
          }
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: any) {
          return wallet.address;
     }

     copyAndToast(text: string, label: string = 'Content') {
          this.copyUtilService.copyAndToast(text, label);
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
          const idx = this.wallets().findIndex(w => w.address === wallet.address);
          if (idx !== -1) {
               this.selectedWalletIndex.set(idx);
          }
     }

     async setTab(tab: 'deleteAccount'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');
          this.txUiService.clearAllOptionsAndMessages();
          await this.getAccountDetails();
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     async getAccountDetails(forceRefresh = false): Promise<void> {
          await this.withPerf('getAccountDetails', async () => {
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const [{ accountInfo, accountObjects }, serverInfo, blockingObjects] = await Promise.all([this.xrplCache.getAccountData(wallet.classicAddress, forceRefresh), this.xrplCache.getServerInfo(this.xrplService), this.xrplService.checkAccountObjectsForDeletion(client, wallet.classicAddress)]);

                    const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet().seed, accountInfo }, client, accountInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    this.accountInfo.set(accountInfo);
                    this.accountObjects.set(accountObjects);
                    this.serverInfo.set(serverInfo);
                    this.blockingObjects.set(blockingObjects);

                    this.refreshUiState(wallet, accountInfo, accountObjects);
                    // this.txUiService.clearAllOptionsAndMessages();
               } catch (error: any) {
                    console.error('Error in getAccountDetails:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
               } finally {
                    this.txUiService.spinner.set(false);
               }
          });
     }

     async deleteAccount(): Promise<void> {
          await this.withPerf('deleteAccount', async () => {
               this.txUiService.clearAllOptionsAndMessages();
               try {
                    const [client, wallet] = await Promise.all([this.getClient(), this.getWallet()]);
                    const destinationAddress = this.selectedDestinationAddress() || this.typedDestination();
                    const [accountInfo, accountObjects, currentLedger, serverInfo] = await Promise.all([this.xrplCache.getAccountInfo(wallet.classicAddress, false), this.xrplService.checkAccountObjectsForDeletion(client, wallet.classicAddress), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
                    const inputs = this.txUiService.getValidationInputs({
                         wallet: this.currentWallet(),
                         network: { accountInfo, accountObjects, currentLedger, serverInfo },
                         destination: { address: destinationAddress },
                         sequence: { sequenceId: accountInfo.result.account_data.Sequence.toString() },
                    });

                    const errors = await this.validationService.validate('AccountDelete', { inputs, client, accountInfo, accountObjects, currentLedger, serverInfo });
                    if (errors.length > 0) {
                         return this.txUiService.setError(errors.join('\n• '));
                    }

                    const tx: xrpl.AccountDelete = {
                         TransactionType: 'AccountDelete',
                         Account: wallet.classicAddress,
                         Destination: destinationAddress,
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
                    if (!result.success) return this.txUiService.setError(`${result.error}`);

                    if (this.txUiService.isSimulateEnabled()) {
                         this.txUiService.successMessage = 'Simulated Account delete successfully!';
                    } else {
                         this.txUiService.successMessage = 'Account deleted successfully!';
                         this.deleteWalletAfterDeleteTx(this.selectedWalletIndex());
                         await this.refreshAfterTx(client, destinationAddress);
                    }
               } catch (error: any) {
                    console.error('Error in deleteAccount:', error);
                    this.txUiService.setError(`${error.message || 'Transaction failed'}`);
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

          if (this.txUiService.destinationTagField()) {
               this.utilsService.setDestinationTag(tx, this.txUiService.destinationTagField());
          }

          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(tx, this.txUiService.memoField());
          }
     }

     private async refreshAfterTx(client: xrpl.Client, destination: string): Promise<void> {
          await this.refreshWallets(client, [destination]);
          this.addNewDestinationFromUser(destination ?? '');
          this.getAccountDetails(true);
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets(), this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet.set({ ...newCurrent });
          });
     }

     private refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.txUiService.multiSigningEnabled.set(hasSignerList);
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
          if (!destination || !xrpl.isValidAddress(destination)) return;

          // Use destinationItems() instead of destinations()
          const alreadyExists = this.destinationItems().some((item: { id: string }) => item.id === destination);
          if (alreadyExists) return;

          this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: destination }]);

          this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
     }

     get deleteWalletTooltip(): string {
          if (this.txUiService.spinner()) return 'Transaction in progress…';
          const blockers = this.deleteBlockers() || [];
          return blockers.length ? blockers.map(b => this.stripHtml(b)).join(' \n ') : '';
     }

     stripHtml(text: string): string {
          return text.replaceAll(/<\/?[^>]+(>|$)/g, '');
     }

     get safeWarningMessage() {
          return this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
     }

     clearFields() {
          this.clearInputFields();
          this.txUiService.clearAllOptionsAndMessages();
     }

     clearInputFields() {
          this.typedDestination.set('');
          this.selectedDestinationAddress.set('');
          this.txUiService.destinationTagField.set('');
     }
}
