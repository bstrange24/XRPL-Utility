import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
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
import { Subject, takeUntil } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

declare var Prism: any;

interface ValidationInputs {
     selectedAccount?: string;
     senderAddress?: string;
     accountInfo?: any;
     seed?: string;
     // formattedDestination?: any;
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
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './delegate.component.html',
     styleUrl: './delegate.component.css',
})
export class AccountDelegateComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;

     // Form fields
     activeTab: string = 'delegate';
     amountField = '';
     destinationField: string = '';
     destinationTagField = '';
     sourceTagField = '';
     invoiceIdField = '';
     memoField: string = '';
     isMemoEnabled: boolean = false;
     useMultiSign: boolean = false;
     isRegularKeyAddress: boolean = false;
     isTicket: boolean = false;
     selectedSingleTicket: string = '';
     selectedTickets: string[] = [];
     multiSelectMode: boolean = false;
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     selectedTicket: string = '';

     // Wallet state (now driven by WalletPanelComponent via service)
     currentWallet: Wallet = {} as Wallet;
     wallets: Wallet[] = [];
     hasWallets: boolean = true;
     environment = '';
     url = '';
     showDropdown: boolean = false;
     dropdownOpen: boolean = false;

     // Multi-sign & Regular Key
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     regularKeyAddress: string = '';
     regularKeySeed: string = '';
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     ticketArray: string[] = [];
     masterKeyDisabled: boolean = false;

     // Dropdown
     private overlayRef: OverlayRef | null = null;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     destinations: DropdownItem[] = [];
     customDestinations: { name?: string; address: string }[] = [];

     // Delegate Specific
     private lastPaymentTx = '';
     private lastTxResult = '';
     executionTime = '';
     actions: DelegateAction[] = AppConstants.DELEGATE_ACTIONS;
     selected: Set<number> = new Set<number>();
     delegateSelections: Record<string, Set<number>> = {};
     leftActions: any;
     rightActions: any;
     selectedWalletIndex: number = 0;
     createdDelegations: boolean = true;
     existingDelegations: any = [];
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     filterQuery: string = '';

     constructor(
          private xrplService: XrplService,
          private utilsService: UtilsService,
          private storageService: StorageService,
          private xrplTransactions: XrplTransactionService,
          private walletManagerService: WalletManagerService,
          public ui: TransactionUiService,
          public downloadUtilService: DownloadUtilService,
          public copyUtilService: CopyUtilService,
          private walletDataService: WalletDataService,
          private validationService: ValidationService,
          private overlay: Overlay,
          private viewContainerRef: ViewContainerRef,
          private destinationDropdownService: DestinationDropdownService,
          private cdr: ChangeDetectorRef
     ) {}

     ngOnInit() {
          this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
          this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

          this.environment = this.xrplService.getNet().environment;
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url = AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET;

          // Listen to selected wallet changes (critical!)
          this.walletManagerService.selectedIndex$.pipe(takeUntil(this.destroy$)).subscribe(index => {
               if (this.wallets[index]) {
                    this.currentWallet = { ...this.wallets[index] };
                    // this.getAccountDetails();
               }
          });

          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               this.hasWallets = wallets.length > 0;

               // If panel hasn't emitted yet (e.g. on page load), set current wallet manually
               if (wallets.length > 0 && !this.currentWallet.address) {
                    const index = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    this.currentWallet = { ...wallets[index] };
                    this.getAccountDetails();
               }

               this.updateDestinations();
          });

          // Load custom destinations
          const stored = this.storageService.get('customDestinations');
          this.customDestinations = stored ? JSON.parse(stored) : [];
          this.updateDestinations();

          // Dropdown service sync
          this.destinationSearch$.pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(query => {
               this.destinationDropdownService.filter(query);
          });
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.filtered$.pipe(takeUntil(this.destroy$)).subscribe(list => {
               this.filteredDestinations = list;
               this.highlightedIndex = list.length > 0 ? 0 : -1;
               this.cdr.detectChanges();
          });
          this.destinationDropdownService.isOpen$.pipe(takeUntil(this.destroy$)).subscribe(open => {
               open ? this.openDropdownInternal() : this.closeDropdownInternal();
          });
     }

     ngAfterViewInit() {
          this.scheduleHighlight();
     }

     ngOnDestroy() {
          this.destroy$.next();
          this.destroy$.complete();
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     async toggleMultiSign() {
          try {
               this.utilsService.toggleMultiSign(this.useMultiSign, this.signers, (await this.getWallet()).classicAddress);
          } catch (error: any) {
               this.ui.setError(`${error.message}`);
          }
     }

     onWalletSelected(wallet: Wallet) {
          this.currentWallet = { ...wallet };

          // Prevent setting self as the destination after switching wallet
          const currentDest = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address || this.destinationField;
          if (currentDest === wallet.address) {
               this.destinationField = '';
          }

          // This triggers refresh balance, signer list, etc.
          this.getAccountDetails();
     }

     setTab(tab: string) {
          this.activeTab = tab;
          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
     }

     toggleCreatedDelegations() {
          this.createdDelegations = !this.createdDelegations;
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

     async getAccountDetails() {
          console.log('Entering getAccountDetails');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);
          this.updateDestinations();

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

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

               // type Section = {
               //      title: string;
               //      openByDefault: boolean;
               //      content?: { key: string; value: string }[];
               //      subItems?: {
               //           key: string;
               //           openByDefault: boolean;
               //           content: { key: string; value: string }[];
               //      }[];
               // };
               // const data: { sections: Section[] } = {
               //      sections: [],
               // };

               // // Filter delegates once
               // const delegateObjects = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'Delegate' && obj.Authorize === this.destinationField);
               // if (!delegateObjects || delegateObjects.length === 0) {
               //      // No delegates found → show "no permissioned domains"
               //      // Clear all selected sliders when no delegates
               //      this.selected.clear();

               //      data.sections.push({
               //           title: 'Permissioned Domain',
               //           openByDefault: true,
               //           content: [
               //                {
               //                     key: 'Status',
               //                     value: `No permissioned domains found between <code>${wallet.classicAddress}</code> and <code>${this.destinationField}</code>`,
               //                },
               //           ],
               //      });
               // } else {
               //      this.selected.clear();

               //      delegateObjects.forEach((delegate: any) => {
               //           (delegate.Permissions as XRPLPermissionEntry[])?.forEach((p: XRPLPermissionEntry) => {
               //                const matchingAction = this.actions.find(a => a.key === p.Permission?.PermissionValue);
               //                if (matchingAction) {
               //                     this.selected.add(matchingAction.id);
               //                }
               //           });
               //      });

               //      this.leftActions = this.actions.slice(0, Math.ceil(this.actions.length / 2));
               //      this.rightActions = this.actions.slice(Math.ceil(this.actions.length / 2));

               //      this.cdr.detectChanges();

               //      // Build delegate items
               //      const delegateItems = delegateObjects.map((delegate: any, index: number) => {
               //           return {
               //                key: `Delegate ${index + 1}`,
               //                openByDefault: index === 0,
               //                content: [
               //                     { key: 'Owner', value: delegate.Account || 'N/A' },
               //                     { key: 'Authorized', value: delegate.Authorize || 'N/A' },
               //                     ...delegate.Permissions.flatMap((p: any, pIndex: number) => [
               //                          {
               //                               key: `Permission ${pIndex + 1}`,
               //                               value: p.Permission?.PermissionValue || 'N/A',
               //                          },
               //                     ]),
               //                ],
               //           };
               //      });

               //      data.sections.push({
               //           title: `Permissioned Domain (${delegateObjects.length})`,
               //           openByDefault: true,
               //           subItems: delegateItems,
               //      });
               // }

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getAccountDetails in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
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
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const isShortForm = this.destinationField.includes('...');
               const resolved = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolved;
               const destination = resolved;

               // let destination = '';
               // inputs.accountInfo = accountInfo;
               // if (this.destinationField.includes('...')) {
               //      const formattedDestination = this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations);
               //      destination = formattedDestination.address;
               //      inputs.destination = formattedDestination.address;
               // } else {
               //      destination = this.destinationField;
               //      inputs.destination = this.destinationField;
               // }

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

               this.ui.setPaymentTx(delegateSetTx);
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

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.ui.setTxResult(response.result);
               this.updateTxResult();

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
                    this.ui.successMessage = 'Delegate action successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    this.getExistingDelegations(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    // Add new destination if valid and not already present
                    this.addNewDestinationFromUser();

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Delegate action successfully!';
               }
          } catch (error: any) {
               console.error('Error in delegateAction:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving delegateAction in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
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
                    throw new Error(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
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
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);
          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     updateTickets(accountObjects: xrpl.AccountObjectsResponse) {
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          if (this.multiSelectMode) {
               this.selectedSingleTicket = this.utilsService.cleanUpMultiSelection(this.selectedTickets, this.ticketArray);
          } else {
               this.selectedSingleTicket = this.utilsService.cleanUpSingleSelection(this.selectedTickets, this.ticketArray);
          }
     }

     private async refreshWallets(client: xrpl.Client, addresses?: string[]) {
          await this.walletDataService.refreshWallets(client, this.wallets, this.walletManagerService.getSelectedIndex(), addresses, (updatedList, newCurrent) => {
               this.currentWallet = { ...newCurrent };
          });
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          // Tickets
          this.ticketArray = this.utilsService.getAccountTickets(accountObjects);
          this.selectedTicket = this.ticketArray[0] || this.selectedTicket;

          // Signer accounts
          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          this.signerQuorum = signerQuorum;
          const hasSignerAccounts = signerAccounts?.length > 0;
          this.checkForMultiSigners(hasSignerAccounts, wallet);

          // Boolean flags
          this.multiSigningEnabled = hasSignerAccounts;
          this.useMultiSign = false;
          this.masterKeyDisabled = Boolean(accountInfo?.result?.account_flags?.disableMasterKey);

          this.clearFields(false);
     }

     private checkForMultiSigners(hasSignerAccounts: boolean, wallet: xrpl.Wallet) {
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
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;

          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;

          // Set regular key properties
          const rkProps = this.utilsService.setRegularKeyProperties(regularKey, accountData.Account) || { regularKeyAddress: 'No RegularKey configured for account', regularKeySeed: '', isRegularKeyAddress: false };
          this.regularKeyAddress = rkProps.regularKeyAddress;
          this.regularKeySeed = rkProps.regularKeySeed;

          // Set master key property
          this.masterKeyDisabled = isMasterKeyDisabled;

          // Set regular key signing enabled flag
          this.regularKeySigningEnabled = !!regularKey;
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.destinationDropdownService.setItems(this.destinations);
     }

     private async getWallet() {
          const encryptionAlgorithm = this.currentWallet.encryptionAlgorithm || AppConstants.ENCRYPTION.ED25519;
          const wallet = await this.utilsService.getWalletWithEncryptionAlgorithm(this.currentWallet.seed, encryptionAlgorithm as 'ed25519' | 'secp256k1');
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     private addNewDestinationFromUser() {
          const addr = this.destinationField.includes('...') ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

          if (addr && xrpl.isValidAddress(addr) && !this.destinations.some(d => d.address === addr)) {
               this.customDestinations.push({ name: `Custom ${this.customDestinations.length + 1}`, address: addr });
               this.storageService.set('customDestinations', JSON.stringify(this.customDestinations));
               this.updateDestinations();
          }
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

     get safeWarningMessage() {
          return this.ui.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     clearFields(all = true) {
          if (all) {
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

     // Dropdown controls
     openDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     closeDropdown() {
          this.destinationDropdownService.closeDropdown();
     }

     toggleDropdown() {
          this.destinationDropdownService.setItems(this.destinations);
          this.destinationDropdownService.toggleDropdown();
     }

     onDestinationInput() {
          this.destinationDropdownService.filter(this.destinationField || '');
          this.destinationDropdownService.openDropdown();
     }

     selectDestination(address: string) {
          if (address === this.currentWallet.address) return;
          const dest = this.destinations.find(d => d.address === address);
          this.destinationField = dest ? this.destinationDropdownService.formatDisplay(dest) : `${address.slice(0, 6)}...${address.slice(-6)}`;
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

     updatePaymentTx() {
          this.scheduleHighlight();
     }

     updateTxResult() {
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          afterRenderEffect(
               () => {
                    const paymentStr = JSON.stringify(this.ui.paymentTx, null, 2);
                    const resultStr = JSON.stringify(this.ui.txResult, null, 2);

                    if (this.paymentJson?.nativeElement && paymentStr !== this.lastPaymentTx) {
                         this.paymentJson.nativeElement.textContent = paymentStr;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                         this.lastPaymentTx = paymentStr;
                    }

                    if (this.txResultJson?.nativeElement && resultStr !== this.lastTxResult) {
                         this.txResultJson.nativeElement.textContent = resultStr;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                         this.lastTxResult = resultStr;
                    }

                    this.cdr.detectChanges();
               },
               { injector: this.injector }
          );
     }
}
