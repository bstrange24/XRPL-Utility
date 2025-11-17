import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, NgZone, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
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
import { Subject, takeUntil } from 'rxjs';
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
     selectedAccount?: string;
     senderAddress?: string;
     accountInfo?: any;
     seed?: string;
     formattedDestination?: any;
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
     Account: string;
     Authorize?: string;
     Flags: number;
     PreviousTxnID: string;
     PreviousTxnLgrSeq: number;
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
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './delegate.component.html',
     styleUrl: './delegate.component.css',
})
export class AccountDelegateComponent implements OnInit, AfterViewInit {
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
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     executionTime: string = '';
     isTicket: boolean = false;
     ticketArray: string[] = [];
     isMemoEnabled: boolean = false;
     useMultiSign: boolean = false;
     multiSignAddress: string = '';
     isRegularKeyAddress: boolean = false;
     regularKeyAddress: string = '';
     regularKeySeed: string = '';
     signerQuorum: number = 0;
     multiSignSeeds: string = '';
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     actions: DelegateAction[] = AppConstants.DELEGATE_ACTIONS;
     selected: Set<number> = new Set<number>();
     delegateSelections: Record<string, Set<number>> = {};
     destinationField: string = '';
     leftActions: any;
     rightActions: any;
     masterKeyDisabled: boolean = false;
     memoField: string = '';
     // destinations: { name?: string; address: string }[] = [];
     destinations: DropdownItem[] = [];
     customDestinations: { name?: string; address: string }[] = [];
     showDropdown = false;
     dropdownOpen = false;
     // filteredDestinations: { name?: string; address: string }[] = [];
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
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
     showSecret: boolean = false;
     environment: string = '';
     activeTab: string = 'delegate'; // default
     encryptionType: string = '';
     hasWallets: boolean = true;
     createdDelegations: boolean = true;
     existingDelegations: any = [];
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
          private destinationDropdownService: DestinationDropdownService
     ) {}

     ngOnInit() {
          this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
          this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

          this.environment = this.xrplService.getNet().environment;
          this.encryptionType = this.storageService.getInputValue('encryptionType');

          this.editingIndex = this.walletManagerService.isEditing.bind(this.walletManagerService);

          type EnvKey = keyof typeof AppConstants.XRPL_WIN_URL;
          const env = this.xrplService.getNet().environment.toUpperCase() as EnvKey;
          this.url = AppConstants.XRPL_WIN_URL[env] || AppConstants.XRPL_WIN_URL.DEVNET;

          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               if (!this.wallets) {
                    this.hasWallets = false;
                    return;
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

     // onSubmit() {
     //      if (this.activeTab === 'delegate' || this.activeTab === 'clear') {
     //           this.delegateActions(this.activeTab);
     //      }
     // }

     setTab(tab: string) {
          this.activeTab = tab;
          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
     }

     selectWallet(index: number) {
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

     onWalletListChange(): void {
          if (this.wallets.length <= 0) {
               this.hasWallets = false;
               return;
          }

          if (this.wallets.length === 1 && this.wallets[0].address === '') {
               this.hasWallets = false;
               return;
          }

          if (this.wallets.length > 0 && this.selectedWalletIndex >= this.wallets.length) {
               this.selectedWalletIndex = 0;
               this.refreshBalance(0);
          } else {
               (async () => {
                    const client = await this.xrplService.getClient();
                    await this.refreshWallets(client, [this.wallets[this.selectedWalletIndex].address, this.destinationField ? this.destinationField : '']);
               })();
          }

          this.onAccountChange();
     }

     toggleSecret(index: number) {
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               await this.refreshWallets(client, [walletAddress]);
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
          this.ui.updateSpinnerMessage(``);
          this.ui.showSpinnerWithDelay('Generating new wallet', 5000);
          const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
          const client = await this.xrplService.getClient();
          this.refreshWallets(client, faucetWallet.address);
          this.ui.spinner = false;
          this.ui.clearWarning();
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
          this.saveWallets();

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
               await this.getAccountDetails();
          } else if (this.currentWallet.address) {
               this.ui.setError('Failed to refresh balance');
          }
     }

     toggleCreatedDelegations() {
          this.createdDelegations = !this.createdDelegations;
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

     onTicketToggle(event: any, ticket: string) {
          if (event.target.checked) {
               this.selectedTickets = [...this.selectedTickets, ticket];
          } else {
               this.selectedTickets = this.selectedTickets.filter(t => t !== ticket);
          }
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

     getIconForAction(key: string): string {
          const map: { [key: string]: string } = {
               TrustlineAuthorize: '🔒',
               TrustlineFreeze: '🧊',
               PaymentMint: '🪙',
               AccountDomainSet: '🌐',
               // etc.
          };
          return map[key] || '⚡';
     }

     // toggleSelection(actionId: number, event: Event) {
     //      const checked = (event.target as HTMLInputElement).checked;
     //      if (checked) {
     //           this.selected.add(actionId);
     //      } else {
     //           this.selected.delete(actionId);
     //      }
     // }

     getSelectedActions(): DelegateAction[] {
          return this.actions.filter(a => this.selected.has(a.id));
     }

     async onDestinationChange(event: Event) {
          const value = (event.target as HTMLSelectElement).value;
          console.log('Selected:', value);
          await this.getAccountDetails();
     }

     toggleTicketSequence() {
          this.cdr.markForCheck();
     }

     async getAccountDetails() {
          console.log('Entering getAccountDetails');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

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

               this.getExistingDelegations(accountObjects, wallet.classicAddress);

               this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
               this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

               const selectedActions = this.getSelectedActions();
               console.log(`Selected Actions: `, selectedActions);

               type Section = {
                    title: string;
                    openByDefault: boolean;
                    content?: { key: string; value: string }[];
                    subItems?: {
                         key: string;
                         openByDefault: boolean;
                         content: { key: string; value: string }[];
                    }[];
               };
               const data: { sections: Section[] } = {
                    sections: [],
               };

               // Filter delegates once
               const delegateObjects = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'Delegate' && obj.Authorize === this.destinationField);
               if (!delegateObjects || delegateObjects.length === 0) {
                    // No delegates found → show "no permissioned domains"
                    // Clear all selected sliders when no delegates
                    this.selected.clear();

                    data.sections.push({
                         title: 'Permissioned Domain',
                         openByDefault: true,
                         content: [
                              {
                                   key: 'Status',
                                   value: `No permissioned domains found between <code>${wallet.classicAddress}</code> and <code>${this.destinationField}</code>`,
                              },
                         ],
                    });
               } else {
                    this.selected.clear();

                    delegateObjects.forEach((delegate: any) => {
                         (delegate.Permissions as XRPLPermissionEntry[])?.forEach((p: XRPLPermissionEntry) => {
                              const matchingAction = this.actions.find(a => a.key === p.Permission?.PermissionValue);
                              if (matchingAction) {
                                   this.selected.add(matchingAction.id);
                              }
                         });
                    });

                    this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
                    this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

                    this.cdr.detectChanges();

                    // Build delegate items
                    const delegateItems = delegateObjects.map((delegate: any, index: number) => {
                         return {
                              key: `Delegate ${index + 1}`,
                              openByDefault: index === 0,
                              content: [
                                   { key: 'Owner', value: delegate.Account || 'N/A' },
                                   { key: 'Authorized', value: delegate.Authorize || 'N/A' },
                                   ...delegate.Permissions.flatMap((p: any, pIndex: number) => [
                                        {
                                             key: `Permission ${pIndex + 1}`,
                                             value: p.Permission?.PermissionValue || 'N/A',
                                        },
                                   ]),
                              ],
                         };
                    });

                    data.sections.push({
                         title: `Permissioned Domain (${delegateObjects.length})`,
                         openByDefault: true,
                         subItems: delegateItems,
                    });
               }

               setTimeout(async () => {
                    try {
                         this.refreshUIData(wallet, accountInfo, accountObjects);
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.updateTickets(accountObjects);
                    } catch (err) {
                         console.error('Error in deferred UI updates:', err);
                    }
               }, 0);
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getAccountDetails in ${this.executionTime}ms`);
          }
     }

     async delegateActions(delegate: 'delegate' | 'clear') {
          console.log('Entering delegateActions');
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
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

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

               const errors = await this.validationService.validate('DelegateActions', { inputs, client, accountInfo, currentLedger, serverInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               let permissions: { Permission: { PermissionValue: string } }[] = [];
               if (delegate === 'clear') {
                    console.log(`Clearing all delegate objects`);
               } else {
                    const selectedActions = this.getSelectedActions();
                    console.log(`Selected Actions: `, selectedActions);

                    if (selectedActions.length == 0) {
                         return this.ui.setError(`Select a delegate objects to set.`);
                    }

                    if (selectedActions.length > 10) {
                         return this.ui.setError(`The max delegate objects must be less than 10.`);
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

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, delegateSetTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Delegate Action (no changes will be made)...' : 'Submitting Delegating Actions to the Ledger...', 200);

               this.ui.paymentTx.push(delegateSetTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, delegateSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, delegateSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.setError(userMessage);
               } else {
                    this.ui.setSuccess(this.ui.result);
               }

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Delegate action successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress, this.destinationField]);

                    // Add new destination if valid and not already present
                    if (xrpl.isValidAddress(this.destinationField) && !this.destinations.some(d => d.address === this.destinationField)) {
                         this.customDestinations.push({
                              name: `Custom ${this.customDestinations.length + 1}`,
                              address: this.destinationField,
                         });
                         this.storageService.set('customDestinations', JSON.stringify(this.customDestinations));
                         this.updateDestinations();
                    }

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.ui.successMessage = 'Simulated Delegate action successfully!';
               }
          } catch (error: any) {
               console.error('Error in delegateAction:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving delegateActions in ${this.executionTime}ms`);
          }
     }

     private getExistingDelegations(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          this.existingDelegations = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Credential' && obj.Issuer === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         // CredentialType: obj.CredentialType ? this.decodeHex(obj.CredentialType) : 'Unknown Type',
                         Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
                         Issuer: obj.Issuer,
                         Subject: obj.Subject,
                         // URI: this.decodeHex(obj.URI),
                         Flags: this.utilsService.getCredentialStatus(obj.Flags),
                    };
               })
               .sort((a, b) => a.Expiration.localeCompare(b.Expiration));
          this.utilsService.logObjects('existingDelegations', this.existingDelegations);
     }

     private async setTxOptionalFields(client: xrpl.Client, delegateSetTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.selectedSingleTicket) {
               const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!ticketExists) {
                    this.ui.setError(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
               }
               this.utilsService.setTicketSequence(delegateSetTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(delegateSetTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.memoField) {
               this.utilsService.setMemoField(delegateSetTx, this.memoField);
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

     private getAccountTickets(accountObjects: xrpl.AccountObjectsResponse): string[] {
          const objects = accountObjects.result?.account_objects;
          if (!Array.isArray(objects)) return [];

          const tickets = objects.reduce((acc: number[], obj) => {
               if (obj.LedgerEntryType === 'Ticket' && typeof obj.TicketSequence === 'number') {
                    acc.push(obj.TicketSequence);
               }
               return acc;
          }, []);

          return tickets.sort((a, b) => a - b).map(String);
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
          this.ticketArray = this.getAccountTickets(accountObjects);

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
          this.ticketArray = this.getAccountTickets(accountObjects);
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
          const wallet = await this.utilsService.getWallet(this.currentWallet.seed);
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     saveWallets() {
          this.storageService.set('wallets', JSON.stringify(this.wallets));
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

     copyDelegateId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.ui.showToastMessage('Delegate Id copied!');
          });
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               delegate: {
                    delegations: this.existingDelegations,
                    getDescription: (count: number) => (count === 1 ? 'delegation' : 'delegations'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';
          const count = config.delegations.length ? config.delegations.length : 0;

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          let message = `The <code>${walletName}</code> wallet has ${dynamicText}${count} ${config.getDescription(count)}.`;

          // if (config.showLink && count > 0) {
          //      const link = `${this.url}account/${this.currentWallet.address}/checks`;
          //      message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View checks on XRPL Win</a>`;
          // }

          return message;
     }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.ui.isSimulateEnabled = false;
               this.useMultiSign = false;
               this.isRegularKeyAddress = false;
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

          this.selectedTicket = '';
          this.selectedSingleTicket = '';
          this.isTicket = false;
          this.selectedTicket = '';
          this.isMemoEnabled = false;
          this.memoField = '';
          this.cdr.detectChanges();
     }

     clearDelegateActions() {
          this.selected.clear();
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
