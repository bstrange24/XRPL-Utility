import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { PaymentChannelCreate, PaymentChannelFund, PaymentChannelClaim } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { sign, verify } from 'ripple-keypairs';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { AppWalletDynamicInputComponent } from '../app-wallet-dynamic-input/app-wallet-dynamic-input.component';
import { InfoMessageConstants } from '../../core/info-message.constants';
import { NavbarComponent } from '../navbar/navbar.component';
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
     accountInfo?: any;
     seed?: string;
     amount?: string;
     destination?: string;
     settleDelay?: string;
     channelID?: string;
     channelClaimSignatureField?: string;
     publicKeyField?: string;
     destinationTag?: string;
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

interface PaymentChannelObject {
     Account: string;
     index: string;
     Expiration?: number;
     CancelAfter?: number;
     Destination: string;
     Amount: string;
     Balance: string;
     SettleDelay: number;
     PublicKey: string;
}

interface UnifiedPaymentChannel {
     id: string;
     totalAmount: string;
     balance: string;
     remaining: string;
     destination: string;
     settleDelay: string;
     expiration: any;
     status: string;
     canClose: any;
     publicKey?: string; // optional, since not all objects have it
}

@Component({
     selector: 'app-account',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './payment-channel.component.html',
     styleUrl: './payment-channel.component.css',
})
export class CreatePaymentChannelComponent implements OnInit, AfterViewInit {
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
     // result: string = '';
     // isError: boolean = false;
     // isSuccess: boolean = false;
     // isEditable: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     paymentChannelCancelAfterTimeField: string = '';
     paymentChannelCancelAfterTimeUnit: string = 'seconds';
     channelIDField: string = '';
     settleDelayField: string = '';
     // ownerCount: string = '';
     // totalXrpReserves: string = '';
     executionTime: string = '';
     amountField: string = '';
     destinationField: string = '';
     destinations: DropdownItem[] = [];
     customDestinations: { name?: string; address: string }[] = [];
     showDropdown: boolean = false;
     dropdownOpen: boolean = false;
     filteredDestinations: DropdownItem[] = [];
     highlightedIndex = -1;
     destinationTagField: string = '';
     publicKeyField: string = '';
     channelClaimSignatureField: string = '';
     channelAction: string = 'create';
     renewChannel: boolean = false;
     memoField: string = '';
     isMemoEnabled: boolean = false;
     isMultiSignTransaction: boolean = false;
     ticketSequence: string = '';
     isTicket: boolean = false;
     isTicketEnabled: boolean = false;
     useMultiSign: boolean = false;
     multiSignSeeds: string = '';
     multiSignAddress: string = '';
     isRegularKeyAddress: boolean = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     signerQuorum: number = 0;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     // spinner: boolean = false;
     // spinnerMessage: string = '';
     masterKeyDisabled: boolean = false;
     // isSimulateEnabled: boolean = false;
     authorizedWalletAddress: string = '';
     authorizedWallets: { name?: string; address: string }[] = [];
     // destinations: { name?: string; address: string }[] = [];
     wallets: Wallet[] = [];
     selectedWalletIndex: number = 0;
     authorizedWalletIndex: number = 1; // Default to second wallet
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
     actions = [
          { value: 'create', label: 'Create' },
          { value: 'fund', label: 'Fund' },
          { value: 'renew', label: 'Renew' },
          { value: 'claim', label: 'Claim' },
          { value: 'close', label: 'Close' },
     ];
     signers: { account: string; seed: string; weight: number }[] = [{ account: '', seed: '', weight: 1 }];
     environment: string = '';
     // paymentTx: any[] = [];
     // txResult: any[] = [];
     // txHash: string = '';
     activeTab = 'create'; // default
     private cachedReserves: any = null;
     hasWallets = true;
     // successMessage: string = '';
     encryptionType: string = '';
     flags = {
          renew: false,
          close: true,
     };
     totalFlagsValue = 0;
     totalFlagsHex = '0x0';

     private flagValues = {
          renew: 0x00010000,
          close: 0x00020000,
     };
     // showToast: boolean = false;
     // toastMessage: string = '';
     walletPaymentChannelCount: number = 0;
     url = '';
     editingIndex!: (index: number) => boolean;
     tempName = '';
     filterQuery: string = '';
     existingPaymentChannels: any = [];
     receivablePaymentChannels: any = [];
     closablePaymentChannels: any = [];
     existingPaymentChannelsCollapsed = true;
     console: any;
     private _cachedVisibleChannels: UnifiedPaymentChannel[] = [];
     private _lastTab: string | undefined;
     private _lastExisting: any[] = [];
     private _lastReceivable: any[] = [];
     // warningMessage: string | null = null;

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
          this.updateFlagTotal();
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

     trackById(index: number, item: UnifiedPaymentChannel): string {
          return item.id;
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
     }

     onSubmit() {
          if (this.activeTab !== '') {
               this.channelAction = this.activeTab;
               this.handlePaymentChannelAction();
          }
     }

     async setTab(tab: string) {
          this.activeTab = tab;
          await this.getPaymentChannelInfo();
          this.ui.clearMessages();
          this.ui.clearWarning();
          this.clearFields(true);
          this.clearFlagsValue();
          this.amountField = '';
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
          }

          this.onAccountChange();
     }

     toggleSecret(index: number) {
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
     }

     toggleFlag(key: 'renew' | 'close') {
          if (key === 'close') {
               // Do nothing – tfClose is locked
               return;
          }
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.flags.renew) sum |= this.flagValues.renew;
          if (this.flags.close) sum |= this.flagValues.close; // always included

          this.totalFlagsValue = sum;
          this.totalFlagsHex = '0x' + sum.toString(16).toUpperCase().padStart(8, '0');
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
               this.ensureDefaultAuthorizedWallet();
               await this.getPaymentChannels();
          } else if (this.currentWallet.address) {
               this.ui.setError('Failed to refresh balance');
          }
     }

     toggleExistingPaymentChannels() {
          this.existingPaymentChannelsCollapsed = !this.existingPaymentChannelsCollapsed;
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

     async getPaymentChannels() {
          console.log('Entering getPaymentChannels');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, paymentChannelObjects, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel'), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               // this.utilsService.logObjects('paymentChannelObjects', paymentChannelObjects);

               const inputs: ValidationInputs = { seed: this.currentWallet.seed, accountInfo: accountInfo };

               const errors = await this.validateInputs(inputs, 'getPaymentChannels');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.getExistingPaymentChannels(paymentChannelObjects, wallet.classicAddress);
               this.getReceivablePaymentChannels(paymentChannelObjects, wallet.classicAddress);
               this.getClosablePaymentChannels(paymentChannelObjects, wallet.classicAddress);

               // UI updates
               this.walletPaymentChannelCount = paymentChannelObjects.result.account_objects.length;

               await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);

               this.updateTickets(accountObjects);

               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getPaymentChannels:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getPaymentChannels in ${this.executionTime}ms`);
          }
     }

     async handlePaymentChannelAction() {
          console.log('Entering handlePaymentChannelAction');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               selectedAccount: this.currentWallet.address,
               destination: this.destinationField,
               amount: this.amountField,
               settleDelay: this.settleDelayField,
               channelID: this.channelIDField,
               channelClaimSignatureField: this.channelClaimSignatureField,
               destinationTag: this.destinationTagField,
               publicKeyField: this.publicKeyField,
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

               const [accountInfo, fee, currentLedger, accountObject, paymentChannelObjects, serverInfo] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.calculateTransactionFee(client),
                    this.xrplService.getLastLedgerIndex(client),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel'),
                    this.xrplService.getXrplServerInfo(client, 'current', ''),
               ]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObject);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               // this.utilsService.logObjects('paymentChannelObjects', paymentChannelObjects);

               inputs.accountInfo = accountInfo;

               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;

               const errors = await this.validateInputs(inputs, this.channelAction);
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const action = this.channelAction;
               let response: any;

               if (action === 'create') {
                    let paymentChannelCreateTx: PaymentChannelCreate = {
                         TransactionType: 'PaymentChannelCreate',
                         Account: wallet.classicAddress,
                         Amount: xrpl.xrpToDrops(this.amountField),
                         Destination: resolvedDestination,
                         SettleDelay: parseInt(this.settleDelayField),
                         PublicKey: wallet.publicKey,
                         Fee: fee,
                    };

                    await this.setTxOptionalFields(client, paymentChannelCreateTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, paymentChannelCreateTx, fee)) {
                         return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Create Payment Channel (no changes will be made)...' : 'Submitting Create Payment Channel to Ledger...', 200);

                    this.ui.paymentTx.push(paymentChannelCreateTx);
                    this.updatePaymentTx();

                    if (this.ui.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, paymentChannelCreateTx);
                    } else {
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, paymentChannelCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                         }

                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    }
               } else if (action === 'fund') {
                    let paymentChannelFundTx: PaymentChannelFund = {
                         TransactionType: 'PaymentChannelFund',
                         Account: wallet.classicAddress,
                         Channel: this.channelIDField,
                         Amount: xrpl.xrpToDrops(this.amountField),
                    };

                    await this.setTxOptionalFields(client, paymentChannelFundTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, paymentChannelFundTx, fee)) {
                         return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Funding/Renewing Payment Channel (no changes will be made)...' : 'Submitting Funding/Renewing Payment Channel to Ledger...', 200);

                    this.ui.paymentTx.push(paymentChannelFundTx);
                    this.updatePaymentTx();

                    if (this.ui.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, paymentChannelFundTx);
                    } else {
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, paymentChannelFundTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                         }

                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    }
               } else if (action === 'claim' || action === 'renew') {
                    const authorizedWallet = await this.getPaymentChannelAuthorizedWallet(this.authorizedWalletAddress);
                    const [signatureVerified, isChannelAuthorized] = await Promise.all([this.xrplService.getChannelVerifiy(client, this.channelIDField, this.amountField, this.publicKeyField, this.channelClaimSignatureField), this.xrplService.getPaymentChannelAuthorized(client, this.channelIDField, this.amountField, authorizedWallet)]);
                    // this.utilsService.logObjects('signatureVerified', signatureVerified);
                    // this.utilsService.logObjects('isChannelAuthorized', isChannelAuthorized);

                    // Get payment channel details to verify creator and receiver
                    const channels = paymentChannelObjects.result.account_objects as PaymentChannelObject[];
                    const channel = channels.find(c => c.index === this.channelIDField);
                    if (!channel) {
                         return this.ui.setError(`ERROR: Payment channel ${this.channelIDField} not found`);
                    }

                    // Determine if the selected account is the creator or receiver
                    const isReceiver = channel.Destination === wallet.classicAddress;
                    let signature = this.channelClaimSignatureField;
                    if (!signatureVerified.result.signature_verified) {
                         return this.ui.setError('ERROR: Invalid signature');
                    }

                    // if (isChannelAuthorized.result.signature !== signature) {
                    //      return this.ui.setError('Wallet is invalid for payment channel.');
                    // }

                    let paymentChannelClaimTx: PaymentChannelClaim = {
                         TransactionType: 'PaymentChannelClaim',
                         Account: wallet.classicAddress,
                         Channel: this.channelIDField,
                         Balance: xrpl.xrpToDrops(this.amountField),
                         Signature: signature,
                         PublicKey: isReceiver ? this.publicKeyField : wallet.publicKey,
                         Fee: fee,
                    };

                    if (action === 'renew') {
                         paymentChannelClaimTx.Flags = xrpl.PaymentChannelClaimFlags.tfRenew;
                    }

                    await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, paymentChannelClaimTx, fee)) {
                         return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Claiming Payment Channel (no changes will be made)...' : 'Submitting Claiming Payment Channel to Ledger...', 200);

                    this.ui.paymentTx.push(paymentChannelClaimTx);
                    this.updatePaymentTx();

                    if (this.ui.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, paymentChannelClaimTx);
                    } else {
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, paymentChannelClaimTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                         }

                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    }
               } else if (action === 'close') {
                    const channels = paymentChannelObjects.result.account_objects as PaymentChannelObject[];
                    const channel = channels.find(c => c.index === this.channelIDField);
                    if (!channel) {
                         return this.ui.setError(`ERROR: Payment channel ${this.channelIDField} not found`);
                    }

                    let isOwnerCancelling = false;
                    if (wallet.classicAddress == channel.Account) {
                         isOwnerCancelling = true;
                    }

                    const currentLedgerTime = await this.xrplService.getLedgerCloseTime(client);
                    if (channel.Expiration && channel.Expiration > currentLedgerTime) {
                         return this.ui.setError('ERROR: Cannot close channel before expiration');
                    }

                    let hasChannelExpired = this.checkChannelExpired(channel);

                    const ownerCancelling = !!isOwnerCancelling;
                    const expired = !!hasChannelExpired;

                    if (ownerCancelling || expired) {
                         // skip balance check — allowed to close (owner or expired)
                    } else {
                         const amount = BigInt(channel.Amount ?? '0');
                         const balance = BigInt(channel.Balance ?? '0');
                         const remaining = amount - balance;
                         if (remaining > 0n) {
                              return this.ui.setError(`ERROR: Cannot close channel with non-zero balance. ${xrpl.dropsToXrp(remaining.toString())} XRP still available to claim.`);
                         }
                    }

                    let paymentChannelClaimTx: PaymentChannelClaim = {
                         TransactionType: 'PaymentChannelClaim',
                         Account: wallet.classicAddress,
                         Channel: this.channelIDField,
                         Flags: xrpl.PaymentChannelClaimFlags.tfClose,
                         Fee: fee,
                    };

                    await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, paymentChannelClaimTx, fee)) {
                         return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Close Payment Channel (no changes will be made)...' : 'Submitting Close Payment Channel to Ledger...', 200);

                    this.ui.paymentTx.push(paymentChannelClaimTx);
                    this.updatePaymentTx();

                    if (this.ui.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, paymentChannelClaimTx);
                    } else {
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, paymentChannelClaimTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                         }

                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    }
               }

               // this.utilsService.logObjects('response', response);
               // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

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
                    this.ui.successMessage = `${action} payment channel successfully!`;

                    const [updatedAccountInfo, updatedAccountObjects, paymentChannelObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel')]);

                    this.walletPaymentChannelCount = paymentChannelObjects.result.account_objects.length;

                    await this.getPaymentChannelInfo();

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.addNewDestinationFromUser();

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = `Simulated ${action} payment channel successfully!`;
               }
          } catch (error: any) {
               console.error('Error in handlePaymentChannelAction:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving handlePaymentChannelAction in ${this.executionTime}ms`);
          }
     }

     async getPaymentChannelInfo() {
          if (this.activeTab === 'close') {
               const client = await this.xrplService.getClient();
               const paymentChannelObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'payment_channel');
               this.getClosablePaymentChannels(paymentChannelObjects, this.currentWallet.address);
          } else if (this.activeTab === 'create' || this.activeTab === 'fund' || this.activeTab === 'renew' || this.activeTab === 'claim') {
               if (this.activeTab === 'create' || this.activeTab === 'fund' || this.activeTab === 'renew') {
                    const client = await this.xrplService.getClient();
                    const paymentChannelObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'payment_channel');
                    this.getExistingPaymentChannels(paymentChannelObjects, this.currentWallet.address);
               }

               if (this.activeTab === 'claim') {
                    const client = await this.xrplService.getClient();
                    const paymentChannelObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'payment_channel');
                    this.getReceivablePaymentChannels(paymentChannelObjects, this.currentWallet.address);
               }
          }
     }

     // EXISTING PAYMENT CHANNELS (walletA created)
     private getExistingPaymentChannels(channelObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nowUnix = Math.floor(Date.now() / 1000);
          this.existingPaymentChannels = (channelObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PayChannel' && obj.Account === classicAddress)
               .map((obj: any) => {
                    const total = xrpl.dropsToXrp(obj.Amount);
                    const balance = xrpl.dropsToXrp(obj.Balance ?? '0');
                    // const total = parseFloat(xrpl.dropsToXrp(obj.Amount.toString()));
                    // const balance = parseFloat(xrpl.dropsToXrp(String(obj.Balance ?? '0')));
                    const remaining = (total - balance).toFixed(6);

                    // Convert Ripple epoch to Unix
                    const expirationUnix = obj.Expiration ? Number(obj.Expiration) + 946684800 : null;
                    const expired = expirationUnix ? nowUnix > expirationUnix : false;
                    const status = expired ? 'Expired' : remaining === '0.000000' ? 'Fully Claimed' : 'Open';

                    return {
                         id: obj.index,
                         totalAmount: `${total} XRP`,
                         balance: `${balance} XRP`,
                         remaining: `${remaining} XRP`,
                         destination: obj.Destination,
                         settleDelay: obj.SettleDelay,
                         expiration: expirationUnix ? new Date(expirationUnix * 1000).toLocaleString() : '—',
                         publicKey: obj.PublicKey,
                         status,
                         canClose: status !== 'Open',
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));

          this.utilsService.logObjects('existingPaymentChannels', this.existingPaymentChannels);
     }

     // RECEIVABLE PAYMENT CHANNELS (walletA can claim)
     private getReceivablePaymentChannels(channelObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nowUnix = Math.floor(Date.now() / 1000);
          this.receivablePaymentChannels = (channelObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PayChannel' && obj.Destination === classicAddress)
               .map((obj: any) => {
                    const total = xrpl.dropsToXrp(obj.Amount);
                    const balance = xrpl.dropsToXrp(obj.Balance ?? '0');
                    // const total = parseFloat(xrpl.dropsToXrp(obj.Amount));
                    // const balance = parseFloat(xrpl.dropsToXrp(obj.Balance ?? '0'));
                    const remaining = (total - balance).toFixed(6);

                    const expirationUnix = obj.Expiration ? Number(obj.Expiration) + 946684800 : null;
                    const expired = expirationUnix ? nowUnix > expirationUnix : false;
                    const status = expired ? 'Expired' : remaining === '0.000000' ? 'Fully Claimed' : 'Claimable';

                    return {
                         id: obj.index,
                         totalAmount: `${total} XRP`,
                         balance: `${balance} XRP`,
                         remaining: `${remaining} XRP`,
                         sender: obj.Account,
                         settleDelay: obj.SettleDelay,
                         expiration: expirationUnix ? new Date(expirationUnix * 1000).toLocaleString() : '—',
                         status,
                         canClaim: status === 'Claimable',
                    };
               })
               .sort((a, b) => a.sender.localeCompare(b.sender));

          this.utilsService.logObjects('receivablePaymentChannels', this.receivablePaymentChannels);
     }

     // CLOSABLE PAYMENT CHANNELS (walletA can close)
     private getClosablePaymentChannels(channelObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const nowUnix = Math.floor(Date.now() / 1000);
          this.closablePaymentChannels = (channelObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PayChannel' && obj.Account === classicAddress)
               .map((obj: any) => {
                    const total = xrpl.dropsToXrp(obj.Amount);
                    const balance = xrpl.dropsToXrp(obj.Balance ?? '0');
                    // const total = parseFloat(xrpl.dropsToXrp(obj.Amount));
                    // const balance = parseFloat(xrpl.dropsToXrp(obj.Balance ?? '0'));
                    const remaining = (total - balance).toFixed(6);

                    const expirationUnix = obj.Expiration ? Number(obj.Expiration) + 946684800 : null;
                    const expired = expirationUnix ? nowUnix > expirationUnix : false;
                    const status = expired ? 'Expired' : remaining === '0.000000' ? 'Fully Claimed' : 'Open';

                    return {
                         id: obj.index,
                         totalAmount: `${total} XRP`,
                         balance: `${balance} XRP`,
                         remaining: `${remaining} XRP`,
                         destination: obj.Destination,
                         settleDelay: obj.SettleDelay,
                         expiration: expirationUnix ? new Date(expirationUnix * 1000).toLocaleString() : '—',
                         status,
                         canClose: status !== 'Open',
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));

          this.utilsService.logObjects('closablePaymentChannels', this.closablePaymentChannels);
     }

     get visiblePaymentChannels(): UnifiedPaymentChannel[] {
          if (this.activeTab !== this._lastTab || this.existingPaymentChannels !== this._lastExisting || this.receivablePaymentChannels !== this._lastReceivable) {
               this._lastTab = this.activeTab;
               this._lastExisting = this.existingPaymentChannels;
               this._lastReceivable = this.receivablePaymentChannels;

               this._cachedVisibleChannels =
                    this.activeTab === 'claim'
                         ? this.receivablePaymentChannels.map((ch: any) => ({
                                id: ch.id,
                                totalAmount: ch.totalAmount,
                                balance: ch.balance,
                                remaining: ch.remaining,
                                destination: ch.sender,
                                settleDelay: ch.settleDelay,
                                expiration: ch.expiration,
                                status: ch.status,
                                canClose: ch.canClaim,
                                publicKey: '',
                           }))
                         : this.existingPaymentChannels.map((ch: any) => ({
                                id: ch.id,
                                totalAmount: ch.totalAmount,
                                balance: ch.balance,
                                remaining: ch.remaining,
                                destination: ch.destination,
                                settleDelay: ch.settleDelay,
                                expiration: ch.expiration,
                                status: ch.status,
                                canClose: ch.canClose,
                                publicKey: ch.publicKey,
                           }));
          }

          return this._cachedVisibleChannels;
     }

     private async getPaymentChannelAuthorizedWallet(authorizedWalletAddress: string) {
          if (!this.wallets || this.wallets.length === 0) {
               throw new Error('ERROR: No wallets available');
          }
          if (!authorizedWalletAddress || authorizedWalletAddress === this.currentWallet.address) {
               throw new Error('ERROR: Invalid authorized wallet address (must be different from selected)');
          }
          const authorizedWalletData = this.wallets.find(w => w.address === authorizedWalletAddress);
          if (!authorizedWalletData) {
               throw new Error('ERROR: Authorized wallet not found');
          }
          const authorizedSeed = authorizedWalletData.seed || authorizedWalletData.mnemonic || authorizedWalletData.secretNumbers;
          if (!authorizedSeed) {
               throw new Error('ERROR: No seed available for authorized wallet');
          }
          const authorizedWallet = await this.utilsService.getWallet(authorizedSeed);
          if (!authorizedWallet) {
               throw new Error('ERROR: Authorized wallet could not be created or is undefined');
          }
          return authorizedWallet;
     }

     async generateCreatorClaimSignature() {
          console.log('Entering generateCreatorClaimSignature');
          const startTime = Date.now();
          this.ui.clearMessages();

          let inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               destination: this.destinationField,
               amount: this.amountField,
               channelID: this.channelIDField,
          };

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const accountInfo = await this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', '');

               inputs.accountInfo = accountInfo;

               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;

               const errors = await this.validateInputs(inputs, 'generateCreatorClaimSignature');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               this.publicKeyField = wallet.publicKey;
               this.channelClaimSignatureField = this.generateChannelSignature(this.channelIDField, this.amountField, wallet);
          } catch (error: any) {
               console.error('Error:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateCreatorClaimSignature in ${this.executionTime}ms`);
          }
     }

     generateChannelSignature(channelID: string, amountXRP: BigNumber.Value, wallet: xrpl.Wallet) {
          try {
               if (!/^[0-9A-Fa-f]{64}$/.test(channelID)) {
                    throw new Error('Invalid channelID: must be a 64-character hexadecimal string');
               }

               if (!amountXRP || amountXRP.toString().trim() === '') {
                    throw new Error('Invalid amountXRP: must be a valid number or string');
               }
               const amountDrops = xrpl.xrpToDrops(amountXRP);
               if (isNaN(parseFloat(this.amountField)) || parseFloat(this.amountField) <= 0) {
                    throw new Error('Invalid amountXRP: must be a valid number or string');
               }

               // Convert the amount to 8-byte big-endian buffer
               const amountBuffer = Buffer.alloc(8);
               amountBuffer.writeBigUInt64BE(BigInt(amountDrops), 0);

               // Create the message buffer: 'CLM\0' + ChannelID (hex) + Amount (8 bytes)
               const message = Buffer.concat([
                    Buffer.from('CLM\0'), // Prefix for channel claims
                    Buffer.from(channelID, 'hex'), // 32-byte channel ID
                    amountBuffer, // 8-byte drop amount
               ]);

               // Sign the message using ripple-keypairs
               const messageHex = message.toString('hex');
               const signature = sign(messageHex, wallet.privateKey);

               // Verify the signature
               const isValid = verify(messageHex, signature, wallet.publicKey);
               if (!isValid) {
                    throw new Error('Generated signature is invalid');
               }

               return signature.toUpperCase();
          } catch (error: any) {
               throw new Error(`Failed to generate channel signature: ${error.message}`);
          }
     }

     checkChannelExpired(channel: any) {
          if (channel.CancelAfter) {
               const unixExpiration = channel.CancelAfter + 946684800;
               console.log('Expiration (UTC):', new Date(unixExpiration * 1000).toISOString());
               let isExpired = Date.now() / 1000 > unixExpiration;
               console.log('Expired?', isExpired);
               if (isExpired) {
                    return true;
               }
               return false;
          } else {
               console.log('This channel has no expiration set.');
               return false;
          }
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

     private async setTxOptionalFields(client: xrpl.Client, paymentChannelTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.selectedSingleTicket) {
               const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!ticketExists) {
                    this.ui.setError(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
               }
               this.utilsService.setTicketSequence(paymentChannelTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(paymentChannelTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.destinationTagField && parseInt(this.destinationTagField) > 0) {
               this.utilsService.setDestinationTag(paymentChannelTx, this.destinationTagField);
          }
          if (this.memoField) {
               this.utilsService.setMemoField(paymentChannelTx, this.memoField);
          }
          if (this.publicKeyField) {
               this.utilsService.setPublicKey(paymentChannelTx, this.publicKeyField);
          }

          if (this.paymentChannelCancelAfterTimeField) {
               const cancelAfterTime = this.utilsService.addTime(this.paymentChannelCancelAfterTimeField, this.paymentChannelCancelAfterTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               console.log(`cancelTime: ${this.paymentChannelCancelAfterTimeField} cancelUnit: ${this.paymentChannelCancelAfterTimeUnit}`);
               console.log(`cancelTime: ${this.utilsService.convertXRPLTime(cancelAfterTime)}`);
               const currentLedgerTime = await this.xrplService.getLedgerCloseTime(client); // Implement this in xrplService
               if (cancelAfterTime <= currentLedgerTime) {
                    return this.ui.setError('ERROR: Cancel After time must be in the future');
               }
               this.utilsService.setCancelAfter(paymentChannelTx, cancelAfterTime);
          }

          if (this.paymentChannelCancelAfterTimeField && (this.channelAction === 'fund' || this.channelAction === 'renew')) {
               const newExpiration = this.utilsService.addTime(this.paymentChannelCancelAfterTimeField, this.paymentChannelCancelAfterTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               const currentLedgerTime = await this.xrplService.getLedgerCloseTime(client);
               if (newExpiration <= currentLedgerTime) {
                    return this.ui.setError('ERROR: New expiration time must be in the future');
               }
               this.utilsService.setExpiration(paymentChannelTx, newExpiration);
          }
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);

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
                    if (fieldName === 'SettleDelay') {
                         return `Settle Delay cannot be empty. `;
                    }
                    if (fieldName === 'DeleteTicketSequence') {
                         return `Ticket Sequence cannot be empty. `;
                    }
                    return `${fieldName} cannot be empty. `;
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
                    return `Sender and receiver cannot be the same.`;
               }
               return null;
          };

          const isValidNumber = (value: string | undefined, fieldName: string, minValue?: number, allowEmpty: boolean = false): string | null => {
               // Skip number validation if value is empty — required() will handle it
               if (shouldSkipNumericValidation(value) || (allowEmpty && value === '')) return null;

               // Type-safe parse
               const num = parseFloat(value as string);

               if (isNaN(num) || !isFinite(num)) {
                    return `${fieldName} must be a valid number.`;
               }
               if (minValue !== undefined && num <= minValue) {
                    return `${fieldName} must be greater than ${minValue}.`;
               }
               return null;
          };

          const isValidSeed = (value: string | undefined): string | null => {
               if (value) {
                    const { type } = this.utilsService.detectXrpInputType(value);
                    if (type === 'unknown') {
                         return 'Account seed or mnemonic is invalid.';
                    }
               }
               return null;
          };

          const isValidChannelId = (value: string | undefined): string | null => {
               if (value && !/^[0-9A-Fa-f]{64}$/.test(value)) {
                    return 'Channel ID must be a 64-character hexadecimal string.';
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

          // Action-specific config: required fields and custom rules
          const checkDestinationTagRequirement = async (): Promise<string | null> => {
               if (!inputs.destination) return null; // Skip if no destination provided
               try {
                    const client = await this.xrplService.getClient();
                    const accountInfo = await this.xrplService.getAccountInfo(client, inputs.destination, 'validated', '');
                    if (accountInfo.result.account_flags.requireDestinationTag && (!inputs.destinationTag || inputs.destinationTag.trim() === '')) {
                         return `ERROR: Receiver requires a Destination Tag for payment.`;
                    }
               } catch (err) {
                    console.error('Failed to check destination tag requirement:', err);
                    return `Could not validate destination account.`;
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
               getPaymentChannels: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null)],
               },
               create: {
                    required: ['seed', 'amount', 'destination', 'settleDelay'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidNumber(inputs.settleDelay, 'Settle Delay', 0),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0, true), // Allow empty
                         () => isNotSelfPayment(inputs.selectedAccount, inputs.destination),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
               },
               fund: {
                    required: ['seed', 'amount', 'channelID', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidChannelId(inputs.channelID),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isNotSelfPayment(inputs.selectedAccount, inputs.destination),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [checkDestinationTagRequirement],
               },
               renew: {
                    required: ['seed', 'amount', 'channelID', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidChannelId(inputs.channelID),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isNotSelfPayment(inputs.selectedAccount, inputs.destination),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [checkDestinationTagRequirement],
               },
               claim: {
                    required: ['seed', 'amount', 'channelID', 'channelClaimSignatureField', 'publicKeyField'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidChannelId(inputs.channelID),
                         () => isRequired(inputs.channelClaimSignatureField, 'Channel Claim Signature'),
                         () => isRequired(inputs.publicKeyField, 'Public Key'),
                         () => isNotSelfPayment(inputs.selectedAccount, inputs.destination),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [checkDestinationTagRequirement],
               },
               close: {
                    required: ['seed', 'channelID'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidChannelId(inputs.channelID),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
               },
               generateCreatorClaimSignature: {
                    required: ['seed', 'amount', 'channelID', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidChannelId(inputs.channelID),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
               },
               default: { required: [], customValidators: [], asyncValidators: [] },
          };

          const config = actionConfig[action] || actionConfig['default'];

          // --- Run required checks ---
          config.required.forEach((field: keyof ValidationInputs) => {
               const err = isRequired(inputs[field], field.charAt(0).toUpperCase() + field.slice(1));
               if (err) errors.push(err);
          });

          // --- Run sync custom validators ---
          config.customValidators?.forEach(validator => {
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

     ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet.address;
          if (currentAddress && this.destinations.length > 0) {
               if (!this.destinationField || this.destinationField === currentAddress) {
                    const nonSelectedDest = this.destinations.find(d => d.address !== currentAddress);
                    // this.destinationField = nonSelectedDest ? nonSelectedDest.address : this.destinations[0].address;
               }
          }
     }

     private ensureDefaultAuthorizedWallet() {
          if (this.wallets.length <= 1) {
               this.authorizedWalletAddress = '';
               this.cdr.detectChanges();
               return;
          }
          const currentAddress = this.currentWallet.address;
          if (!this.authorizedWalletAddress || this.authorizedWalletAddress === currentAddress) {
               // Find a valid non-current address
               const nonSelectedWallet = this.wallets.find(w => w.address !== currentAddress);
               this.authorizedWalletAddress = nonSelectedWallet ? nonSelectedWallet.address : this.wallets[0].address;
          }
          this.cdr.detectChanges();
     }

     updateDestinations() {
          this.destinations = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.authorizedWallets = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          if (this.destinations.length > 0 && !this.destinationField) {
               // this.destinationField = this.destinations[0].address;
          }
          this.storageService.set('destinations', this.destinations);
          this.ensureDefaultNotSelected();
          this.ensureDefaultAuthorizedWallet();
     }

     // updateDestinations() {
     //      this.destinations = this.wallets.map(w => ({ name: w.name, address: w.address }));
     //      this.authorizedWallets = this.wallets.map(w => ({ name: w.name, address: w.address }));
     //      this.ensureDefaultNotSelected();
     //      this.ensureDefaultAuthorizedWallet();
     // }

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

     clearFlagsValue() {
          this.flags = {
               renew: false,
               close: false,
          };
          this.totalFlagsValue = 0;
          this.totalFlagsHex = '0x0';
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

     public copyPaymentChannelId(txHash: string): void {
          if (!txHash) {
               console.warn('no txHash');
               return;
          }

          navigator.clipboard
               .writeText(txHash)
               .then(() => {
                    this.channelIDField = txHash; // always set — remove conditional
                    this.ui.showToastMessage?.('Payment Channel Hash copied!');
               })
               .catch(err => console.error('Clipboard copy failed:', err));
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               create: {
                    channels: this.existingPaymentChannels,
                    description: '',
                    dynamicText: 'created', // Empty for no additional text
                    showLink: false,
               },
               fund: {
                    channels: this.existingPaymentChannels,
                    description: 'available for funding',
                    dynamicText: '', // Empty for no additional text
                    showLink: false,
               },
               claim: {
                    channels: this.receivablePaymentChannels,
                    description: 'with claimable funds',
                    dynamicText: '', // Empty for no additional text
                    showLink: false,
               },
               close: {
                    channels: this.closablePaymentChannels,
                    description: 'that can potentially be closed',
                    dynamicText: '', // Empty for no additional text
                    showLink: true,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';
          const count = config.channels.length;

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          const channelText = count === 1 ? 'payment channel' : 'payment channels';

          let message = `The <code>${walletName}</code> wallet has ${dynamicText}${count} ${channelText} ${config.description}.`;

          return message;
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.amountField = '';
               this.destinationTagField = '';
               this.channelIDField = '';
               this.publicKeyField = '';
               this.channelClaimSignatureField = '';
               this.settleDelayField = '';
               this.paymentChannelCancelAfterTimeField = '';
               this.flags.renew = false;
          }

          this.isMemoEnabled = false;
          this.memoField = '';
          this.ticketSequence = '';
          this.isTicket = false;
          this.renewChannel = false;
          this.cdr.detectChanges();
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
