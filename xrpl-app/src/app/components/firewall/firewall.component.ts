import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, NgZone, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { MPTokenIssuanceCreate } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { AppWalletDynamicInputComponent } from '../app-wallet-dynamic-input/app-wallet-dynamic-input.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { InfoMessageConstants } from '../../core/info-message.constants';
import { LucideAngularModule } from 'lucide-angular';
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { pairwise, startWith, Subject, takeUntil } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refersh-wallets.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { TemplatePortal } from '@angular/cdk/portal';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { DropdownItem } from '../../models/dropdown-item.model';
declare var Prism: any;

interface ValidationInputs {
     senderAddress?: string;
     seed?: string;
     accountInfo?: any;
     amount?: string;
     formattedDestination?: any;
     destination?: string;
     mptIssuanceIdField?: string;
     destinationTag?: string;
     tokenCountField?: string;
     assetScaleField?: string;
     transferFeeField?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
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

interface AccountFlags {
     isClawback: boolean;
     isLock: boolean;
     isRequireAuth: boolean;
     isTransferable: boolean;
     isTradable: boolean;
     isEscrow: boolean;
}

@Component({
     selector: 'app-firewall',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './firewall.component.html',
     styleUrl: './firewall.component.css',
})
export class FirewallComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef; // We'll add this to the input
     private overlayRef: OverlayRef | null = null;
     private readonly injector = inject(Injector);
     selectedFirewall: string | null = null; // stores NFTokenID
     tempNameFirewallId: string | null = null; // stores NFTokenID
     isTicket: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     executionTime: string = '';
     destinationTagField: string = '';
     useMultiSign: boolean = false;
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     timePeriodStartField: string = '';
     timePeriodStartUnit: string = 'seconds';
     timePeriodField: string = '';
     timePeriodUnit: string = 'seconds';
     backupAccountField: string = '';
     totalOutField: string = '';
     isMptFlagModeEnabled: boolean = false;
     memoField: string = '';
     isMemoEnabled: boolean = false;
     isRegularKeyAddress: boolean = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     amountField: string = '';
     masterKeyDisabled: boolean = false;
     destinationField: string = '';
     private knownDestinations: { [key: string]: string } = {};
     private whitelistAddress: { [key: string]: string } = {};
     customDestinations: { name?: string; address: string }[] = [];
     showDropdown = false;
     dropdownOpen = false;
     // filteredDestinations: { name?: string; address: string }[] = [];
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     // xrpOnly: string[] = [];
     whitelistAddresses: string[] = [];
     newWhitelistAddress: string = '';
     whitelistAddressToRemove: string = '';
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     wallets: Wallet[] = [];
     selectedWalletIndex: number = 0;
     currentWallet: Wallet = {
          classicAddress: '',
          address: '',
          seed: '',
          name: undefined,
          balance: '0',
          ownerCount: undefined,
          xrpReserves: undefined,
          spendableXrp: undefined,
     };
     // destinations: { name?: string; address: string }[] = [];
     destinations: DropdownItem[] = [];
     showManageTokens: boolean = false;
     showSecret: boolean = false;
     environment: string = '';
     activeTab: string = 'create'; // default
     encryptionType: string = '';
     hasWallets: boolean = true;
     existingFirewalls: any = [];
     existingFirewallsCollapsed: boolean = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     filterQuery: string = '';

     constructor(
          private readonly xrplService: XrplService,
          private readonly utilsService: UtilsService,
          private readonly cdr: ChangeDetectorRef,
          private readonly storageService: StorageService,
          private readonly xrplTransactions: XrplTransactionService,
          private walletGenerator: WalletGeneratorService,
          private walletManagerService: WalletManagerService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService,
          private ngZone: NgZone
     ) {}

     ngOnInit() {
          this.environment = this.xrplService.getNet().environment;
          this.encryptionType = this.storageService.getInputValue('encryptionType');

          this.editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

          type EnvKey = keyof typeof AppConstants.XRPL_WIN_URL;
          const env = this.xrplService.getNet().environment.toUpperCase() as EnvKey;
          this.url = AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;

          this.walletManagerService.wallets$.pipe(startWith(null), pairwise(), takeUntil(this.destroy$)).subscribe(([prev, curr]) => {
               this.wallets = curr || [];
               this.hasWallets = this.wallets.length > 0;

               const prevSelected = prev?.[this.selectedWalletIndex];
               const currSelected = curr?.[this.selectedWalletIndex];

               const walletSwitched = !prev || prevSelected?.address !== currSelected?.address || prev.length !== curr?.length;

               if (walletSwitched) {
                    this.selectedWalletIndex = Math.min(this.selectedWalletIndex, this.wallets.length - 1 || 0);
                    this.onAccountChange(); // Only on actual change
               }
          });

          // Load custom destinations from storage
          const storedCustoms = this.storageService.get('customDestinations');
          this.customDestinations = storedCustoms ? JSON.parse(storedCustoms) : [];
          this.updateDestinations();

          // Ensure service knows the list
          this.destinationDropdownService.setItems(this.destinations);

          // Subscribe to filtered list updates
          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations = list;
               // keep selection sane
               this.highlightedIndex = list.length > 0 ? 0 : -1;
               this.cdr.detectChanges();
          });

          // Subscribe to open/close state from service
          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               this.dropdownOpen = open;
               if (open) {
                    this.openDropdownInternal(); // create + attach overlay (component-owned)
               } else {
                    this.closeDropdownInternal(); // detach overlay (component-owned)
               }
          });

          // const storedDestinations = this.storageService.getKnownIssuers('destinations');
          // if (storedDestinations) {
          //      const knownWhitelistAddress = this.storageService.getKnownWhitelistAddress('knownWhitelistAddress');
          //      console.debug(`storedDestinations: `, storedDestinations);
          //      console.debug(`knownWhitelistAddress: `, knownWhitelistAddress);
          //      if (knownWhitelistAddress) {
          //           const combined = this.comineWhiteListDestiationAddresses(storedDestinations, knownWhitelistAddress);
          //           console.log(`combinedString: `, combined);
          //           this.knownDestinations = combined;
          //           this.updateWhitelistAddress();
          //      }
          // }
          // this.onAccountChange();
     }

     onSelectPermissionedDomain(firewallId: string | null) {
          this.selectedFirewall = firewallId;
          this.tempNameFirewallId = firewallId ?? '';
     }

     ngAfterViewInit() {
          setTimeout(() => {
               this.textareas.forEach(ta => this.autoResize(ta.nativeElement));
          });
     }

     ngOnDestroy() {
          this.destroy$.next();
          this.destroy$.complete();
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
     }

     setTab(tab: string) {
          this.activeTab = tab;
          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
     }

     selectWallet(index: number) {
          if (this.selectedWalletIndex === index) return; // ← Add this guard!
          this.selectedWalletIndex = index;
          this.onAccountChange();
     }

     editName(i: number) {
          this.walletManagerService.startEdit(i);
          const wallet = this.wallets[i];
          this.tempName = wallet.name || `Wallet ${i + 1}`;
          setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
     }

     saveName() {
          this.walletManagerService.saveEdit(this.tempName);
          this.tempName = '';
          this.updateDestinations();
     }

     cancelEdit() {
          this.walletManagerService.cancelEdit();
          this.tempName = '';
     }

     // onWalletListChange(): void {
     //      if (this.wallets.length <= 0) {
     //           this.hasWallets = false;
     //           return;
     //      }

     //      if (this.wallets.length === 1 && this.wallets[0].address === '') {
     //           this.hasWallets = false;
     //           return;
     //      }

     //      if (this.wallets.length > 0 && this.selectedWalletIndex >= this.wallets.length) {
     //           this.selectedWalletIndex = 0;
     //      }

     //      this.onAccountChange();
     // }

     toggleSecret(index: number) {
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               await this.refreshWallets(client, [walletAddress]).catch(console.error);
          } catch (err) {
               this.ui.setError('Failed to refresh balance');
          }
     }

     deleteWallet(index: number) {
          if (confirm('Delete this wallet? This cannot be undone.')) {
               this.walletManagerService.deleteWallet(index);
               if (this.selectedWalletIndex >= this.wallets.length) {
                    this.selectedWalletIndex = Math.max(0, this.wallets.length - 1);
               }
               this.onAccountChange();
          }
     }

     async generateNewAccount() {
          console.log('Entering generateNewAccount');
          const startTime = Date.now();
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);

          try {
               // Default to ed25519
               this.encryptionType = AppConstants.ENCRYPTION.ED25519;
               console.log('encryptionType: ', this.encryptionType);
               const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
               const client = await this.xrplService.getClient();
               await this.refreshWallets(client, [faucetWallet.address]);
               this.ui.spinner = false;
               this.ui.clearWarning();
               this.ui.txResult.push(faucetWallet);
               this.updateTxResult(this.ui.txResult);
          } catch (error: any) {
               console.error('Error in generateNewAccount:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateNewAccount in ${this.executionTime}ms`);
          }
     }

     dropWallet(event: CdkDragDrop<any[]>) {
          moveItemInArray(this.wallets, event.previousIndex, event.currentIndex);

          // Update your selectedWalletIndex if needed
          if (this.selectedWalletIndex === event.previousIndex) {
               this.selectedWalletIndex = event.currentIndex;
          } else if (this.selectedWalletIndex > event.previousIndex && this.selectedWalletIndex <= event.currentIndex) {
               this.selectedWalletIndex--;
          } else if (this.selectedWalletIndex < event.previousIndex && this.selectedWalletIndex >= event.currentIndex) {
               this.selectedWalletIndex++;
          }

          // Persist the new order to localStorage
          this.walletManagerService.setWallets(this.wallets); // ← this saves + updates observable

          // Update destinations and account state
          this.updateDestinations();
          this.onAccountChange();
     }

     async onAccountChange() {
          if (this.wallets.length === 0) {
               this.currentWallet = {
                    classicAddress: '',
                    address: '',
                    seed: '',
                    name: undefined,
                    balance: '0',
                    ownerCount: undefined,
                    xrpReserves: undefined,
                    spendableXrp: undefined,
               };
               return;
          }

          const selected = this.wallets[this.selectedWalletIndex];
          this.currentWallet = {
               ...selected,
               balance: selected.balance || '0',
               ownerCount: selected.ownerCount || '0',
               xrpReserves: selected.xrpReserves || '0',
               spendableXrp: selected.spendableXrp || '0',
          };

          if (this.currentWallet.address && xrpl.isValidAddress(this.currentWallet.address)) {
               this.ui.clearWarning();
               this.updateDestinations();
               await this.getFirewallDetails();
          } else if (this.currentWallet.address) {
               this.ui.setError('Failed to refresh balance');
          }
     }

     toggleExistingFirewalls() {
          this.existingFirewallsCollapsed = !this.existingFirewallsCollapsed;
     }

     validateQuorum() {
          const totalWeight = this.signers.reduce((sum, s) => sum + (s.weight || 0), 0);
          if (this.signerQuorum > totalWeight) {
               this.signerQuorum = totalWeight;
          }
     }

     async toggleMultiSign() {
          try {
               if (!this.useMultiSign) {
                    this.utilsService.clearSignerList(this.signers);
               } else {
                    const wallet = await this.getWallet();
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               }
          } catch (error: any) {
               this.ui.setError(`ERROR getting wallet in toggleMultiSign' ${error.message}`);
          }
     }

     async toggleUseMultiSign() {
          if (this.multiSignAddress === 'No Multi-Sign address configured for account') {
               this.multiSignSeeds = '';
          }
     }

     async getFirewallDetails() {
          console.log('Entering getFirewallDetails');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    accountInfo: accountInfo,
               };

               const errors = await this.validationService.validate('AccountInfo', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               // const firewallTx: Firewall = {
               //      TransactionType: 'Firewall',
               //      Account: wallet.classicAddress,
               //      PublicKey: '',
               //      BackupAccount: this.destinationField,
               //      TimePeriod: '',
               //      TimePeriodStart: '',
               //      Amount: '',
               //      TotalOut: '',
               //      Fee: fee,
               //      Flags: v_flags,
               //      LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               // };

               // const firewallWhitelistTx: FirewallWhitelist = {
               //      TransactionType: 'FirewallWhitelist',
               //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
               //      OwnerNode: '',
               //      PreviousTxnID: '',
               //      PreviousTxnLgrSeq: '',
               // };

               // Prepare data structure
               // const data = {
               //      sections: [{}],
               // };

               // // Filter MPT-related objects
               // const mptObjects = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPTokenIssuance' || obj.LedgerEntryType === 'MPToken');
               // if (mptObjects.length <= 0) {
               //      data.sections.push({
               //           title: 'Firewall Details',
               //           openByDefault: true,
               //           content: [{ key: 'Status', value: `No Firewall found for <code>${wallet.classicAddress}</code>` }],
               //      });
               // } else {
               //      // Sort by Sequence (oldest first)
               //      const sortedMPT = [...mptObjects].sort((a, b) => {
               //           const seqA = (a as any).Sequence ?? Number.MAX_SAFE_INTEGER;
               //           const seqB = (b as any).Sequence ?? Number.MAX_SAFE_INTEGER;
               //           return seqA - seqB;
               //      });

               //      data.sections.push({
               //           title: `Firewall (${mptObjects.length})`,
               //           openByDefault: true,
               //           subItems: sortedMPT.map((mpt, counter) => {
               //                const { LedgerEntryType, PreviousTxnID, index } = mpt;
               //                // TicketSequence and Flags may not exist on all AccountObject types
               //                const ticketSequence = (mpt as any).TicketSequence;
               //                const flags = (mpt as any).Flags;
               //                const mptIssuanceId = (mpt as any).mpt_issuance_id || (mpt as any).MPTokenIssuanceID;
               //                return {
               //                     key: `MPT ${counter + 1} (ID: ${index.slice(0, 8)}...)`,
               //                     openByDefault: false,
               //                     content: [
               //                          { key: 'MPT Issuance ID', value: `<code>${mptIssuanceId}</code>` },
               //                          { key: 'Ledger Entry Type', value: LedgerEntryType },
               //                          { key: 'Previous Txn ID', value: `<code>${PreviousTxnID}</code>` },
               //                          ...(ticketSequence ? [{ key: 'Ticket Sequence', value: String(ticketSequence) }] : []),
               //                          ...(flags !== undefined ? [{ key: 'Flags', value: this.utilsService.getMptFlagsReadable(Number(flags)) }] : []),
               //                          // Optionally display custom fields if present
               //                          ...((mpt as any)['MPTAmount'] ? [{ key: 'MPTAmount', value: String((mpt as any)['MPTAmount']) }] : []),
               //                          ...((mpt as any)['MPTokenMetadata'] ? [{ key: 'MPTokenMetadata', value: xrpl.convertHexToString((mpt as any)['MPTokenMetadata']) }] : []),
               //                          ...((mpt as any)['MaximumAmount'] ? [{ key: 'MaximumAmount', value: String((mpt as any)['MaximumAmount']) }] : []),
               //                          ...((mpt as any)['OutstandingAmount'] ? [{ key: 'OutstandingAmount', value: String((mpt as any)['OutstandingAmount']) }] : []),
               //                          ...((mpt as any)['TransferFee'] ? [{ key: 'TransferFee', value: String((mpt as any)['TransferFee']) }] : []),
               //                          ...((mpt as any)['MPTIssuanceID'] ? [{ key: 'MPTIssuanceID', value: String((mpt as any)['MPTIssuanceID']) }] : []),
               //                     ],
               //                };
               //           }),
               //      });
               // }

               // this.ui.setSuccess(this.ui.result);

               Promise.resolve().then(() => {
                    this.refreshUIData(wallet, accountInfo, accountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.clearFields(false);
                    this.updateTickets(accountObjects);
               });
          } catch (error: any) {
               console.error('Error in getFirewallDetails:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getAccountDetails in ${this.executionTime}ms`);
          }
     }

     async createFirewall() {
          console.log('Entering createFirewall');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               senderAddress: this.currentWallet.address,
               destination: this.destinationField,
               isRegularKeyAddress: this.isRegularKeyAddress,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               useMultiSign: this.useMultiSign,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               let destination = '';
               inputs.accountInfo = accountInfo;
               if (this.destinationField.includes('...')) {
                    const formattedDestination = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations);
                    inputs.formattedDestination = formattedDestination.address;
                    destination = formattedDestination.address;
               } else {
                    inputs.formattedDestination = this.destinationField;
                    destination = this.destinationField;
               }

               const errors = await this.validateInputs(inputs, 'createFirewall');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const timePeriod = this.utilsService.addTime(this.timePeriodField, this.timePeriodUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               const timePeriodStart = this.utilsService.addTime(this.timePeriodStartField, this.timePeriodStartUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               console.log(`timePeriodUnit: ${this.timePeriodUnit} timePeriodStartUnit: ${this.timePeriodStartUnit}`);
               console.log(`timePeriod: ${this.utilsService.convertXRPLTime(timePeriod)} timePeriodStart: ${this.utilsService.convertXRPLTime(timePeriodStart)}`);
               console.log(`Total Out: `, this.totalOutField);
               console.log(`Amount: `, this.amountField);
               console.log(`Backup account: `, this.backupAccountField);
               console.log(`Wallet pubkey: `, wallet.publicKey);

               if (1 == 1) {
                    return this.ui.setError('Poopy');
               }

               let v_flags = 0;

               const mPTokenIssuanceCreateTx: MPTokenIssuanceCreate = {
                    TransactionType: 'MPTokenIssuanceCreate',
                    Account: wallet.classicAddress,
                    // AssetClass: 'CTZMPT',
                    MaximumAmount: '0',
                    Fee: fee,
                    Flags: v_flags,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               // const firewallSetTx: FirewallSet = {
               //      TransactionType: 'FirewallSet',
               //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
               //      PublicKey: 'EDPUBLICKEY',
               //      BackupAccount: 'rY6CEmcZiJXp5L4LDJq3gZFujU6Wwn7xH3',
               //      TimePeriod: 86400,
               //      Amount: '1000000000',
               // };

               // Optional fields
               await this.setTxOptionalFields(client, mPTokenIssuanceCreateTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, mPTokenIssuanceCreateTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Create Firewall (no changes will be made)...' : 'Submitting Create Firewall to Ledger...', 200);

               this.ui.paymentTx.push(mPTokenIssuanceCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, mPTokenIssuanceCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, mPTokenIssuanceCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Created Firewall successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    // Add new destination if valid and not already present
                    this.addNewDestinationFromUser();

                    Promise.resolve().then(() => {
                         this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.updateTickets(updatedAccountObjects);
                    });
               } else {
                    this.ui.successMessage = 'Simulated Create Firewall successfully!';
               }
          } catch (error: any) {
               console.error('Error in createFirewall:', error);
               return this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving createFirewall in ${this.executionTime}ms`);
          }
     }

     async modifyFirewall() {
          console.log('Entering modifyFirewall');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               senderAddress: this.currentWallet.address,
               destination: this.destinationField,
               isRegularKeyAddress: this.isRegularKeyAddress,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               useMultiSign: this.useMultiSign,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               let destination = '';
               inputs.accountInfo = accountInfo;
               if (this.destinationField.includes('...')) {
                    const formattedDestination = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations);
                    inputs.formattedDestination = formattedDestination.address;
                    destination = formattedDestination.address;
               } else {
                    inputs.formattedDestination = this.destinationField;
                    destination = this.destinationField;
               }

               const errors = await this.validateInputs(inputs, 'modifyFirewall');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const mPTokenAuthorizeTx: xrpl.MPTokenAuthorize = {
                    TransactionType: 'MPTokenAuthorize',
                    Account: wallet.address,
                    MPTokenIssuanceID: '',
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    Fee: fee,
               };

               // const firewallSetUpdateTx: FirewallSet = {
               //      TransactionType: 'FirewallSet',
               //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
               //      TimePeriod: 86400,
               //      Amount: '1000000000',
               //      Signature: '',
               // };

               // Optional fields
               await this.setTxOptionalFields(client, mPTokenAuthorizeTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, mPTokenAuthorizeTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating MPT Authorize (no changes will be made)...' : 'Submitting to Ledger...', 200);

               this.ui.paymentTx.push(mPTokenAuthorizeTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, mPTokenAuthorizeTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, mPTokenAuthorizeTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.txResult.push(response.result);
               this.updateTxResult(this.ui.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Modified Firewall successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // Add new destination if valid and not already present
                    this.addNewDestinationFromUser();

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    Promise.resolve().then(() => {
                         this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.updateTickets(updatedAccountObjects);
                    });
               } else {
                    this.ui.successMessage = 'Simulated Modify Firewall successfully!';
               }
          } catch (error: any) {
               console.error('Error:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving modifyFirewall in ${this.executionTime}ms`);
          }
     }

     async authorizeFirewall(authorizeFlag: 'Y' | 'N') {
          console.log('Entering authorizeFirewall');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               senderAddress: this.currentWallet.address,
               amount: this.amountField,
               destination: this.destinationField,
               destinationTag: this.destinationTagField,
               isRegularKeyAddress: this.isRegularKeyAddress,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               useMultiSign: this.useMultiSign,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, destObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, this.destinationField, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               this.utilsService.logObjects('destObjects', destObjects);

               let destination = '';
               inputs.accountInfo = accountInfo;
               if (this.destinationField.includes('...')) {
                    const formattedDestination = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations);
                    inputs.formattedDestination = formattedDestination.address;
                    destination = formattedDestination.address;
               } else {
                    inputs.formattedDestination = this.destinationField;
                    destination = this.destinationField;
               }

               const errors = await this.validateInputs(inputs, 'authorizeFirewall');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               // Check if destination can hold the MPT
               if (!destObjects || !destObjects.result || !destObjects.result.account_objects) {
                    return this.ui.setError(`ERROR: Unable to fetch account objects for destination ${this.destinationField}`);
               }
               const mptTokens = destObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPToken');
               console.debug(`Destination MPT Tokens:`, mptTokens);

               const authorized = mptTokens.some((obj: any) => obj.MPTokenIssuanceID === '');

               if (!authorized) {
                    return this.ui.setError(`ERROR: Destination ${this.destinationField} is not authorized to receive this MPT (issuance ID ${''}).`);
               }

               const sendMptPaymentTx: xrpl.Payment = {
                    TransactionType: 'Payment',
                    Account: wallet.classicAddress,
                    Amount: {
                         mpt_issuance_id: '',
                         value: this.amountField,
                    },
                    Destination: this.destinationField,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    Fee: fee,
               };

               // let firewallWhitelistSetAuthorizeTx:FirewallWhitelistSet;
               if (authorizeFlag === 'Y') {
                    // firewallWhitelistSetAuthorizeTx = {
                    //      TransactionType: 'FirewallWhitelistSet',
                    //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
                    //      Authorize: '',
                    //      Signature: '',
                    // };
               } else {
                    // firewallWhitelistSetAuthorizeTx = {
                    //      TransactionType: 'FirewallWhitelistSet',
                    //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
                    //      Unauthorize: '',
                    //      Signature: '',
                    // };
               }

               // Optional fields
               await this.setTxOptionalFields(client, sendMptPaymentTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, sendMptPaymentTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.updateSpinnerMessage(this.ui.isSimulateEnabled ? 'Simulating Sending MPT (no changes will be made)...' : 'Submitting to Ledger...');

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, sendMptPaymentTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, sendMptPaymentTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Authorized Firewall successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // Add new destination if valid and not already present
                    this.addNewDestinationFromUser();

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    Promise.resolve().then(() => {
                         this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.updateTickets(updatedAccountObjects);
                    });
               } else {
                    this.ui.successMessage = 'Simulated Authorize Firewall successfully!';
               }
          } catch (error: any) {
               console.error('Error:', error);
               return this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving authorizeFirewall in ${this.executionTime}ms`);
          }
     }

     async deleteFirewall() {
          console.log('Entering deleteFirewall');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               isRegularKeyAddress: this.isRegularKeyAddress,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               useMultiSign: this.useMultiSign,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, destObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, this.destinationField, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               this.utilsService.logObjects('destObjects', destObjects);

               let destination = '';
               inputs.accountInfo = accountInfo;
               if (this.destinationField.includes('...')) {
                    const formattedDestination = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations);
                    inputs.formattedDestination = formattedDestination.address;
                    destination = formattedDestination.address;
               } else {
                    inputs.formattedDestination = this.destinationField;
                    destination = this.destinationField;
               }

               const errors = await this.validateInputs(inputs, 'deleteFirewall');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const mPTokenIssuanceDestroyTx: xrpl.MPTokenIssuanceDestroy = {
                    TransactionType: 'MPTokenIssuanceDestroy',
                    Account: wallet.classicAddress,
                    MPTokenIssuanceID: '',
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    Fee: fee,
               };

               // const firewallDeleteTx: FirewallDelete = {
               //      TransactionType: 'FirewallDelete',
               //      Account: 'rU9XRmcZiJXp5J1LDJq8iZFujU6Wwn9cV9',
               //      Signature: '',
               // };

               // Optional fields
               await this.setTxOptionalFields(client, mPTokenIssuanceDestroyTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, mPTokenIssuanceDestroyTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.updateSpinnerMessage(this.ui.isSimulateEnabled ? 'Simulating Deleting MPT (no changes will be made)...' : 'Submitting to Ledger...');

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, mPTokenIssuanceDestroyTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, mPTokenIssuanceDestroyTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.ui.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    return this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Deleted Firewall successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    // Add new destination if valid and not already present
                    this.addNewDestinationFromUser();

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    Promise.resolve().then(() => {
                         this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.updateTickets(updatedAccountObjects);
                    });
               } else {
                    this.ui.successMessage = 'Simulated Delete Firewall successfully!';
               }
          } catch (error: any) {
               console.error('Error in deleteFirewall:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deleteFirewall in ${this.executionTime}ms`);
          }
     }

     private getExistingNfts(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nftPages = (checkObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'NFTokenPage');

          // Flatten all NFTokens from all pages
          const allNfts = nftPages.flatMap((page: any) => {
               return page.NFTokens.map((entry: any) => {
                    const nft = entry.NFToken;

                    return {
                         LedgerEntryType: page.LedgerEntryType,
                         PageIndex: page.index,
                         NFTokenID: nft.NFTokenID,
                         Flags: nft.Flags ?? 0,
                         Issuer: nft.Issuer,
                         Taxon: nft.NFTaxon,
                         TransferFee: nft.TransferFee,
                         Sequence: nft.Sequence,
                         URI_hex: nft.URI,
                         URI: nft.URI ? this.utilsService.decodeHex(nft.URI) : null,
                    };
               });
          });

          this.existingFirewalls = allNfts;

          this.utilsService.logObjects('existingFirewalls', this.existingFirewalls);

          return this.existingFirewalls;
     }

     private addNewDestinationFromUser() {
          if (xrpl.isValidAddress(this.destinationField) && !this.destinations.some(d => d.address === this.destinationField)) {
               this.customDestinations.push({
                    name: `Custom ${this.customDestinations.length + 1}`,
                    address: this.destinationField,
               });
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations));
               this.updateDestinations();
          }
     }

     private async setTxOptionalFields(client: xrpl.Client, firewallTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.selectedSingleTicket) {
               const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!ticketExists) {
                    throw new Error(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
               }
               this.utilsService.setTicketSequence(firewallTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(firewallTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.destinationTagField && parseInt(this.destinationTagField) > 0) {
               this.utilsService.setDestinationTag(firewallTx, this.destinationTagField);
          }

          if (this.memoField) {
               this.utilsService.setMemoField(firewallTx, this.memoField);
          }
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);

          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     private checkForSignerAccounts(accountObjects: xrpl.AccountObjectsResponse): string[] {
          const accountObjectsArray = accountObjects.result?.account_objects;
          if (!Array.isArray(accountObjectsArray)) return [];

          const signerAccounts: string[] = [];

          for (const obj of accountObjectsArray) {
               if (obj.LedgerEntryType === 'SignerList' && Array.isArray(obj.SignerEntries)) {
                    // Set quorum once
                    if (obj.SignerQuorum !== undefined) {
                         this.signerQuorum = obj.SignerQuorum;
                    }

                    for (const entry of obj.SignerEntries) {
                         const account = entry.SignerEntry?.Account;
                         if (account) {
                              signerAccounts.push(`${account}~${entry.SignerEntry.SignerWeight ?? ''}`);
                         }
                    }
               }
          }

          return signerAccounts;
     }

     public cleanUpSingleSelection() {
          // Check if selected ticket still exists in available tickets
          if (this.selectedSingleTicket && !this.ticketArray.includes(this.selectedSingleTicket)) {
               this.selectedSingleTicket = ''; // Reset to "Select a ticket"
          }
     }

     public cleanUpMultiSelection() {
          // Filter out any selected tickets that no longer exist
          this.selectedTickets = this.selectedTickets.filter(ticket => this.ticketArray.includes(ticket));
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);

          // Clean up selections based on current mode
          if (this.multiSelectMode) {
               this.cleanUpMultiSelection();
          } else {
               this.cleanUpSingleSelection();
          }
     }

     private async refreshWallets(client: xrpl.Client, addressesToRefresh?: string[]) {
          console.log('Calling refreshWallets');

          await this.walletDataService.refreshWallets(
               client,
               this.wallets, // pass current wallet list
               this.selectedWalletIndex, // pass selected index
               addressesToRefresh,
               (updatedWalletsList, newCurrentWallet) => {
                    // This callback runs inside NgZone → UI updates safely
                    this.currentWallet = { ...newCurrentWallet };
                    // Optional: trigger change detection if needed
                    this.cdr.markForCheck();
               }
          );
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          // Tickets
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          this.selectedTicket = this.ticketArray[0] || this.selectedTicket;

          // Signer accounts
          const signerAccounts = this.checkForSignerAccounts(accountObjects);
          const hasSignerAccounts = signerAccounts?.length > 0;

          if (hasSignerAccounts) {
               const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.multiSignAddress = signerEntries.map((e: { Account: any }) => e.Account).join(',\n');
               this.multiSignSeeds = signerEntries.map((e: { seed: any }) => e.seed).join(',\n');
          } else {
               this.signerQuorum = 0;
               this.multiSignAddress = 'No Multi-Sign address configured for account';
               this.multiSignSeeds = '';
               this.storageService.removeValue('signerEntries');
          }

          // Boolean flags
          this.multiSigningEnabled = hasSignerAccounts;
          this.useMultiSign = false;
          this.masterKeyDisabled = Boolean(accountInfo?.result?.account_flags?.disableMasterKey);

          this.clearFields(false);
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;

          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;

          // Set regular key properties
          this.setRegularKeyProperties(regularKey, accountData.Account);

          // Set master key property
          this.masterKeyDisabled = isMasterKeyDisabled;

          // Set regular key signing enabled flag
          this.regularKeySigningEnabled = !!regularKey;
     }

     private setRegularKeyProperties(regularKey: string | undefined, account: string): void {
          if (regularKey) {
               this.regularKeyAddress = regularKey;
               this.regularKeySeed = this.storageService.get(`${account}regularKeySeed`) || '';
          } else {
               this.regularKeyAddress = 'No RegularKey configured for account';
               this.regularKeySeed = '';
               this.isRegularKeyAddress = false;
          }
     }

     private async validateInputs(inputs: ValidationInputs, action: string): Promise<string[]> {
          const errors: string[] = [];

          // Early return for empty inputs
          if (!inputs || Object.keys(inputs).length === 0) {
               return ['No inputs provided.'];
          }

          // --- Shared skip helper ---
          const shouldSkipNumericValidation = (value: string | undefined): boolean => {
               return value === undefined || value === null || value.trim() === '';
          };

          // --- Common validators ---
          const isRequired = (value: string | null | undefined, fieldName: string): string | null => {
               if (value == null || !this.utilsService.validateInput(value)) {
                    return `${fieldName} cannot be empty.`;
               }
               return null;
          };

          const isValidXrpAddress = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidAddress(value)) {
                    return `${fieldName} is invalid.`;
               }
               return null;
          };

          const isValidSecret = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidSecret(value)) {
                    return `${fieldName} is invalid.`;
               }
               return null;
          };

          const isNotSelfPayment = (sender: string | undefined, receiver: string | undefined): string | null => {
               if (sender && receiver && sender === receiver) {
                    return `Sender and receiver cannot be the same`;
               }
               return null;
          };

          const isValidNumber = (value: string | undefined, fieldName: string, minValue?: number, maxValue?: number, allowEmpty: boolean = false): string | null => {
               if (value === undefined || (allowEmpty && value === '')) return null; // Skip if undefined or empty (when allowed)
               const num = parseFloat(value);
               if (isNaN(num) || !isFinite(num)) {
                    return `${fieldName} must be a valid number`;
               }
               if (minValue !== undefined && num < minValue) {
                    return `${fieldName} must be greater than or equal to ${minValue}`;
               }
               if (maxValue !== undefined && num > maxValue) {
                    return `${fieldName} must be less than or equal to ${maxValue}`;
               }
               return null;
          };

          const isValidSeed = (value: string | undefined): string | null => {
               if (value) {
                    const { value: detectedValue } = this.utilsService.detectXrpInputType(value);
                    if (detectedValue === 'unknown') {
                         return 'Account seed is invalid';
                    }
               }
               return null;
          };

          const validateMultiSign = (addressesStr: string | undefined, seedsStr: string | undefined): string | null => {
               if (!addressesStr || !seedsStr) return null;
               const addresses = this.utilsService.getMultiSignAddress(addressesStr);
               const seeds = this.utilsService.getMultiSignSeeds(seedsStr);
               if (addresses.length === 0) {
                    return 'At least one signer address is required for multi-signing.';
               }
               if (addresses.length !== seeds.length) {
                    return 'Number of signer addresses must match number of signer seeds.';
               }
               const invalidAddr = addresses.find((addr: string) => !xrpl.isValidAddress(addr));
               if (invalidAddr) {
                    return `Invalid signer address: ${invalidAddr}.`;
               }
               const invalidSeed = seeds.find((seed: string) => !xrpl.isValidSecret(seed));
               if (invalidSeed) {
                    return 'One or more signer seeds are invalid.';
               }
               return null;
          };

          // --- Async validator: check if destination account requires a destination tag ---
          const checkDestinationTagRequirement = async (): Promise<string | null> => {
               if (!inputs.destination) return null; // Skip if no destination provided
               try {
                    const client = await this.xrplService.getClient();
                    const accountInfo = await this.xrplService.getAccountInfo(client, inputs.destination, 'validated', '');
                    if (accountInfo.result.account_flags.requireDestinationTag && (!inputs.destinationTag || inputs.destinationTag.trim() === '')) {
                         return `ERROR: Receiver requires a Destination Tag for payment`;
                    }
               } catch (err) {
                    console.error('Failed to check destination tag requirement:', err);
                    return `Could not validate destination account`;
               }
               return null;
          };

          // --- Action-specific config ---
          const actionConfig: Record<
               string,
               {
                    required: (keyof ValidationInputs)[];
                    customValidators?: (() => string | null)[];
                    asyncValidators?: (() => Promise<string | null>)[];
               }
          > = {
               getFirewallDetails: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed)],
                    asyncValidators: [],
               },
               createFirewall: {
                    required: ['seed'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.assetScaleField, 'Asset scale', 0, 15),
                         () => isValidNumber(inputs.transferFeeField, 'Transfer fee', 0, 1000000),
                         () => isValidNumber(inputs.tokenCountField, 'Token count', 0),
                         () => isNotSelfPayment(inputs.senderAddress, inputs.destination),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                    ],
                    asyncValidators: [checkDestinationTagRequirement],
               },
               modifyFirewall: {
                    required: ['seed', 'mptIssuanceIdField'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isRequired(inputs.mptIssuanceIdField, 'MPT Issuance ID'),
                         () => isNotSelfPayment(inputs.senderAddress, inputs.destination),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                    ],
                    asyncValidators: [],
               },
               authorizeFirewall: {
                    required: ['seed', 'amount', 'destination', 'mptIssuanceIdField'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidXrpAddress(inputs.destination, 'Destination address'),
                         () => isRequired(inputs.mptIssuanceIdField, 'MPT Issuance ID'),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0, undefined, true), // Allow empty
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => isNotSelfPayment(inputs.senderAddress, inputs.destination),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                    ],
                    asyncValidators: [checkDestinationTagRequirement],
               },
               deleteFirewall: {
                    required: ['seed', 'mptIssuanceIdField'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isRequired(inputs.mptIssuanceIdField, 'MPT Issuance ID'),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                    ],
                    asyncValidators: [],
               },
               default: { required: [], customValidators: [], asyncValidators: [] },
          };

          const config = actionConfig[action] || actionConfig['default'];

          // --- Run required checks ---
          config.required.forEach((field: keyof ValidationInputs) => {
               const err = isRequired(inputs[field], field.charAt(0).toUpperCase() + field.slice(1));
               if (err) errors.push(err);
          });

          // Run custom validators
          config.customValidators?.forEach((validator: () => string | null) => {
               const err = validator();
               if (err) errors.push(err);
          });

          // --- Run async validators ---
          if (config.asyncValidators) {
               for (const validator of config.asyncValidators) {
                    const err = await validator();
                    if (err) errors.push(err);
               }
          }

          // --- Always validate optional fields ---
          const multiErr = validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds);
          if (multiErr) errors.push(multiErr);

          const regAddrErr = isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address');
          if (regAddrErr && inputs.regularKeyAddress !== 'No RegularKey configured for account') errors.push(regAddrErr);

          const regSeedErr = isValidSecret(inputs.regularKeySeed, 'Regular Key Seed');
          if (regSeedErr) errors.push(regSeedErr);

          if (errors.length == 0 && inputs.useMultiSign && (inputs.multiSignAddresses === 'No Multi-Sign address configured for account' || inputs.multiSignSeeds === '')) {
               errors.push('At least one signer address is required for multi-signing');
          }

          return errors;
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          if (this.destinations.length > 0 && !this.destinationField) {
               // this.destinationField = this.destinations[0].address;
          }
          this.storageService.set('destinations', this.destinations);
          this.ensureDefaultNotSelected();
     }

     ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet.address;
          if (currentAddress && this.destinations.length > 0) {
               if (!this.destinationField || this.destinationField === currentAddress) {
                    const nonSelectedDest = this.destinations.find(d => d.address !== currentAddress);
                    // this.destinationField = nonSelectedDest ? nonSelectedDest.address : this.destinations[0].address;
               }
          }
          this.cdr.detectChanges();
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult(tx: any) {
          this.ui.txResult = tx;
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          // Use the captured injector to run afterRenderEffect safely
          afterRenderEffect(
               () => {
                    if (this.ui.paymentTx && this.paymentJson?.nativeElement) {
                         const json = JSON.stringify(this.ui.paymentTx, null, 2);
                         this.paymentJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                    }

                    if (this.ui.txResult && this.txResultJson?.nativeElement) {
                         const json = JSON.stringify(this.ui.txResult, null, 2);
                         this.txResultJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                    }
               },
               { injector: this.injector }
          );
     }

     addWhitelistAddress() {
          if (this.newWhitelistAddress && this.newWhitelistAddress.trim()) {
               const knownWhitelistAddress = this.storageService.getKnownWhitelistAddress('knownWhitelistAddress') || {};
               if (knownWhitelistAddress[this.newWhitelistAddress]) {
                    this.ui.setError(`Whitelist Address ${this.newWhitelistAddress} already exists`);
                    return;
               }

               if (!xrpl.isValidAddress(this.newWhitelistAddress.trim())) {
                    this.ui.setError('Invalid issuer address');
                    return;
               }

               knownWhitelistAddress[this.newWhitelistAddress] = this.newWhitelistAddress;
               this.storageService.setKnownWhitelistAddress('knownWhitelistAddress', knownWhitelistAddress);

               this.updateWhitelistAddress();
               this.ui.setSuccess(`Added ${this.newWhitelistAddress} to Whitelist accounts`);
               this.newWhitelistAddress = '';
               this.cdr.markForCheck();
          } else {
               this.ui.setError('Currency code and issuer address are required');
          }
          this.ui.spinner = false;
     }

     removeWhitelistAddress() {
          if (this.whitelistAddressToRemove) {
               const knownWhitelistAddress = this.storageService.getKnownWhitelistAddress('knownWhitelistAddress') || {};

               if (knownWhitelistAddress && knownWhitelistAddress[this.whitelistAddressToRemove]) {
                    delete knownWhitelistAddress[this.whitelistAddressToRemove];
                    this.storageService.setKnownWhitelistAddress('knownWhitelistAddress', knownWhitelistAddress);
               }
               this.ui.setSuccess(`Removed ${this.whitelistAddressToRemove} from the Whitelist accounts`);
               this.updateWhitelistAddress();
               this.whitelistAddressToRemove = '';
               this.cdr.markForCheck();
          } else {
               this.ui.setError('Select a whitelist address to remove');
          }
          this.ui.spinner = false;
     }

     private updateWhitelistAddress() {
          const t = this.storageService.getKnownWhitelistAddress('knownWhitelistAddress') || {};
          this.whitelistAddresses = t ? Object.keys(t) : [];
          this.ui.setSuccess(`whitelistAddresses ${this.whitelistAddresses}`);

          // merge whitelist into destinations
          this.destinations = [...new Set([...Object.values(this.knownDestinations), ...this.whitelistAddresses])].map(address => ({ address }));
     }

     private comineWhiteListDestiationAddresses(storedDestinations: { [key: string]: string }, knownWhitelistAddress: { [key: string]: string }) {
          const convertedDestinations = Object.entries(storedDestinations)
               .filter(([_, value]) => value && value.trim() !== '') // Remove "XRP": ""
               .reduce((acc, [_, value]) => {
                    acc[value] = value;
                    return acc;
               }, {} as { [key: string]: string });

          // Merge both objects
          const combined = {
               ...convertedDestinations,
               ...knownWhitelistAddress,
          };
          return combined;
     }

     copyFirewallID(id: string) {
          navigator.clipboard.writeText(id).then(() => {
               this.ui.showToastMessage('MPT Issuance ID copied!');
          });
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               create: {
                    firewall: this.existingFirewalls,
                    getDescription: (count: number) => (count === 1 ? 'Firewall' : 'Firewalls'),
                    dynamicText: 'created', // Empty for no additional text
                    showLink: false,
               },
               modify: {
                    firewall: this.existingFirewalls,
                    getDescription: (count: number) => (count === 1 ? 'Firewall' : 'Firewalls'),
                    dynamicText: 'created', // Empty for no additional text
                    showLink: false,
               },
               authorize: {
                    firewall: this.existingFirewalls,
                    getDescription: (count: number) => (count === 1 ? 'Firewall' : 'Firewalls'),
                    dynamicText: 'created',
                    showLink: false,
               },
               unauthorize: {
                    firewall: this.existingFirewalls,
                    getDescription: (count: number) => (count === 1 ? 'Firewall' : 'Firewalls'),
                    dynamicText: 'created',
                    showLink: false,
               },
               delete: {
                    firewall: this.existingFirewalls,
                    getDescription: (count: number) => (count === 1 ? 'Firewall' : 'Firewalls'),
                    dynamicText: 'created',
                    showLink: false,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';
          const count = config.firewall.length;

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          let message = `The <code>${walletName}</code> wallet has ${dynamicText}${count} ${config.getDescription(count)}.`;

          if (config.showLink && count > 0) {
               const link = `${this.url}account/${this.currentWallet.address}/checks`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View checks on XRPL Win</a>`;
          }

          return message;
     }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.useMultiSign = false;
               this.isRegularKeyAddress = false;
               this.isMptFlagModeEnabled = false;
               this.amountField = '';
               this.destinationTagField = '';
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

          this.isMemoEnabled = false;
          this.memoField = '';
          this.useMultiSign = false;

          this.selectedTicket = '';
          this.selectedSingleTicket = '';
          this.isTicket = false;
          // this.isTicketEnabled = false;
          this.cdr.markForCheck();
     }

     openDropdown() {
          // update service items (in case destinations changed)
          this.destinationDropdownService.setItems(this.destinations);
          // prepare filtered list
          this.destinationDropdownService.filter(this.destinationField || '');
          // tell service to open -> subscription above will attach overlay
          this.destinationDropdownService.openDropdown();
     }

     // Called by outside click / programmatic close
     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     // Called by chevron toggle
     toggleDropdown() {
          // make sure the service has current items first
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.toggleDropdown();
     }

     // Called on input typing
     onDestinationInput() {
          this.filterQuery = this.destinationField || '';
          this.destinationDropdownService.filter(this.filterQuery);
          this.destinationDropdownService.openDropdown(); // ensure open while typing
     }

     private openDropdownInternal() {
          // If already attached, do nothing
          if (this.overlayRef?.hasAttached()) return;

          // position strategy (your existing logic)
          const positionStrategy = this.overlay
               .position()
               .flexibleConnectedTo(this.dropdownOrigin)
               .withPositions([
                    {
                         originX: 'start',
                         originY: 'bottom',
                         overlayX: 'start',
                         overlayY: 'top',
                         offsetY: 8,
                    },
               ])
               .withPush(false);

          this.overlayRef = this.overlay.create({
               hasBackdrop: true,
               backdropClass: 'cdk-overlay-transparent-backdrop',
               positionStrategy,
               scrollStrategy: this.overlay.scrollStrategies.close(),
          });

          const portal = new TemplatePortal(this.dropdownTemplate, this.viewContainerRef);
          this.overlayRef.attach(portal);

          // Close on backdrop click
          this.overlayRef.backdropClick().subscribe(() => {
               this.destinationDropdownService.closeDropdown(); // close via service so subscribers sync
          });
     }

     private closeDropdownInternal() {
          if (this.overlayRef) {
               this.overlayRef.detach();
               this.overlayRef = null;
          }
     }

     filterDestinations() {
          const query = this.filterQuery.trim().toLowerCase();

          if (query === '') {
               this.filteredDestinations = [...this.destinations];
          } else {
               this.filteredDestinations = this.destinations.filter(d => d.address.toLowerCase().includes(query) || (d.name && d.name.toLowerCase().includes(query)));
          }

          this.highlightedIndex = this.filteredDestinations.length > 0 ? 0 : -1;
     }

     selectDestination(address: string) {
          if (address === this.currentWallet.address) return;

          const dest = this.destinations.find(d => d.address === address);
          if (dest) {
               // show "Name (rABC12...DEF456)"
               this.destinationField = this.destinationDropdownService.formatDisplay(dest);
          } else {
               this.destinationField = `${address.slice(0, 6)}...${address.slice(-6)}`;
          }

          // close via service so subscribers remain in sync
          this.destinationDropdownService.closeDropdown();
          this.cdr.detectChanges();
     }

     onArrowDown() {
          if (!this.showDropdown || this.filteredDestinations.length === 0) return;
          this.highlightedIndex = (this.highlightedIndex + 1) % this.filteredDestinations.length;
     }

     selectHighlighted() {
          if (this.highlightedIndex >= 0 && this.filteredDestinations[this.highlightedIndex]) {
               const addr = this.filteredDestinations[this.highlightedIndex].address;
               if (addr !== this.currentWallet.address) {
                    this.destinationField = addr;
                    this.closeDropdown(); // Also close on Enter
               }
          }
     }
}
