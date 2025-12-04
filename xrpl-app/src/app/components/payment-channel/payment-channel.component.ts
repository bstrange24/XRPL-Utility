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
import { PaymentChannelCreate, PaymentChannelFund, PaymentChannelClaim } from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { sign, verify } from 'ripple-keypairs';
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
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs/operators';
import { DragDropModule } from '@angular/cdk/drag-drop';

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
     imports: [CommonModule, FormsModule, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './payment-channel.component.html',
     styleUrl: './payment-channel.component.css',
})
export class CreatePaymentChannelComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     private readonly injector = inject(Injector);
     public destinationSearch$ = new Subject<string>();
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;

     // Form fields
     activeTab: string = 'create';
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

     // Code preview
     private lastPaymentTx = '';
     private lastTxResult = '';
     executionTime = '';

     // Payment Channel Specific

     paymentChannelCancelAfterTimeField: string = '';
     paymentChannelCancelAfterTimeUnit: string = 'seconds';
     channelIDField: string = '';
     settleDelayField: string = '';
     publicKeyField: string = '';
     channelClaimSignatureField: string = '';
     channelAction: string = 'create';
     renewChannel: boolean = false;
     isMultiSignTransaction: boolean = false;
     ticketSequence: string = '';
     isTicketEnabled: boolean = false;
     authorizedWalletAddress: string = '';
     authorizedWallets: { name?: string; address: string }[] = [];
     selectedWalletIndex: number = 0;
     authorizedWalletIndex: number = 1;
     actions = [
          { value: 'create', label: 'Create' },
          { value: 'fund', label: 'Fund' },
          { value: 'renew', label: 'Renew' },
          { value: 'claim', label: 'Claim' },
          { value: 'close', label: 'Close' },
     ];
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
     walletPaymentChannelCount: number = 0;
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
          this.updateFlagTotal();
          this.environment = this.xrplService.getNet().environment;
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url = AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET;

          // === 1. Listen to wallet list changes (wallets$.valueChanges) ===
          this.walletManagerService.wallets$.pipe(takeUntil(this.destroy$)).subscribe(wallets => {
               this.wallets = wallets;
               this.hasWallets = wallets.length > 0;

               // Rebuild destination dropdown whenever wallets change
               this.updateDestinations();

               // Only set currentWallet on first load if nothing is selected yet
               if (this.hasWallets && !this.currentWallet?.address) {
                    const selectedIndex = this.walletManagerService.getSelectedIndex?.() ?? 0;
                    const selectedWallet = wallets[selectedIndex];
                    if (selectedWallet) {
                         this.currentWallet = { ...selectedWallet };
                         this.getPaymentChannels();
                    }
               }
          });

          // === 2. Listen to selected wallet index changes (ONLY update if address actually changes) ===
          this.walletManagerService.selectedIndex$
               .pipe(
                    map(index => this.wallets[index]?.address),
                    distinctUntilChanged(), // ← Prevents unnecessary emissions
                    filter(address => !!address), // ← Ignore invalid/undefined
                    takeUntil(this.destroy$)
               )
               .subscribe(selectedAddress => {
                    const wallet = this.wallets.find(w => w.address === selectedAddress);
                    if (wallet && this.currentWallet.address !== wallet.address) {
                         console.log('Wallet switched via panel →', wallet.name, wallet.address);
                         this.currentWallet = { ...wallet };
                         this.getPaymentChannels(); // Refresh UI for new wallet
                    }
               });

          // === 3. Load custom destinations from storage ===
          const stored = this.storageService.get('customDestinations');
          this.customDestinations = stored ? JSON.parse(stored) : [];
          this.updateDestinations();

          // === 4. Dropdown search integration (unchanged) ===
          this.destinationSearch$.pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(query => this.destinationDropdownService.filter(query));

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

     trackById(index: number, item: UnifiedPaymentChannel): string {
          return item.id;
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
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

     toggleExistingPaymentChannels() {
          this.existingPaymentChannelsCollapsed = !this.existingPaymentChannelsCollapsed;
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
          this.getPaymentChannels();
     }

     async setTab(tab: string) {
          this.activeTab = tab;
          this.channelAction = this.activeTab;
          await this.getPaymentChannelInfo();
          this.ui.clearMessages();
          this.ui.clearWarning();
          this.updateInfoMessage();
          this.clearFields(true);
          this.clearFlagsValue();
          this.amountField = '';
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

               const errors = await this.validationService.validate('AccountInfo', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.getExistingPaymentChannels(paymentChannelObjects, wallet.classicAddress);
               this.getReceivablePaymentChannels(paymentChannelObjects, wallet.classicAddress);
               this.getClosablePaymentChannels(paymentChannelObjects, wallet.classicAddress);

               // UI updates
               this.walletPaymentChannelCount = paymentChannelObjects.result.account_objects.length;

               // await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getPaymentChannels:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getPaymentChannels in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
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

               const [accountInfo, fee, currentLedger, paymentChannelObjects, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'payment_channel'), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               // this.utilsService.logObjects('paymentChannelObjects', paymentChannelObjects);

               inputs.accountInfo = accountInfo;

               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;

               const action = this.channelAction;
               let response: any;

               if (action === 'create') {
                    const errors = await this.validationService.validate('PaymentChannelCreate', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    let paymentChannelCreateTx: PaymentChannelCreate = {
                         TransactionType: 'PaymentChannelCreate',
                         Account: wallet.classicAddress,
                         Amount: xrpl.xrpToDrops(this.amountField),
                         Destination: resolvedDestination,
                         SettleDelay: parseInt(this.settleDelayField),
                         PublicKey: wallet.publicKey,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, paymentChannelCreateTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, paymentChannelCreateTx, fee)) {
                         return this.ui.setError('Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Create Payment Channel (no changes will be made)...' : 'Submitting Create Payment Channel to Ledger...', 200);

                    this.ui.setPaymentTx(paymentChannelCreateTx);
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
                    const errors = await this.validationService.validate('PaymentChannelFund', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

                    let paymentChannelFundTx: PaymentChannelFund = {
                         TransactionType: 'PaymentChannelFund',
                         Account: wallet.classicAddress,
                         Channel: this.channelIDField,
                         Amount: xrpl.xrpToDrops(this.amountField),
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, paymentChannelFundTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, paymentChannelFundTx, fee)) {
                         return this.ui.setError('Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Funding/Renewing Payment Channel (no changes will be made)...' : 'Submitting Funding/Renewing Payment Channel to Ledger...', 200);

                    this.ui.setPaymentTx(paymentChannelFundTx);
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
                    if (action === 'claim') {
                         const errors = await this.validationService.validate('PaymentChannelClaim', { inputs, client, accountInfo });
                         if (errors.length > 0) {
                              return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         }
                    } else {
                         const errors = await this.validationService.validate('PaymentChannelRenew', { inputs, client, accountInfo });
                         if (errors.length > 0) {
                              return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                         }
                    }

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
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    if (action === 'renew') {
                         paymentChannelClaimTx.Flags = xrpl.PaymentChannelClaimFlags.tfRenew;
                    }

                    await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, paymentChannelClaimTx, fee)) {
                         return this.ui.setError('Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Claiming Payment Channel (no changes will be made)...' : 'Submitting Claiming Payment Channel to Ledger...', 200);

                    this.ui.setPaymentTx(paymentChannelClaimTx);
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
                    const errors = await this.validationService.validate('PaymentChannelClose', { inputs, client, accountInfo });
                    if (errors.length > 0) {
                         return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
                    }

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
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, paymentChannelClaimTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, paymentChannelClaimTx, fee)) {
                         return this.ui.setError('Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Close Payment Channel (no changes will be made)...' : 'Submitting Close Payment Channel to Ledger...', 200);

                    this.ui.setPaymentTx(paymentChannelClaimTx);
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
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = `Simulated ${action} payment channel successfully!`;
               }
          } catch (error: any) {
               console.error('Error in handlePaymentChannelAction:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving handlePaymentChannelAction in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
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

               const errors = await this.validationService.validate('PaymentChannelGenerateCreatorClaimSignature', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.publicKeyField = wallet.publicKey;
               this.channelClaimSignatureField = this.generateChannelSignature(this.channelIDField, this.amountField, wallet);
          } catch (error: any) {
               console.error('Error in generateCreatorClaimSignature:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving generateCreatorClaimSignature in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
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

     private async setTxOptionalFields(client: xrpl.Client, paymentChannelTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.selectedSingleTicket) {
               const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!exists) throw new Error(`Ticket ${this.selectedSingleTicket} not found`);
               this.utilsService.setTicketSequence(paymentChannelTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(paymentChannelTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.destinationTagField && parseInt(this.destinationTagField) > 0) this.utilsService.setDestinationTag(paymentChannelTx, this.destinationTagField);
          if (this.memoField) this.utilsService.setMemoField(paymentChannelTx, this.memoField);
          if (this.publicKeyField) this.utilsService.setPublicKey(paymentChannelTx, this.publicKeyField);

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
          this.authorizedWallets = [...this.wallets.map(w => ({ name: w.name, address: w.address })), ...this.customDestinations];
          this.destinationDropdownService.setItems(this.destinations);
          this.ensureDefaultAuthorizedWallet();
     }

     private ensureDefaultAuthorizedWallet() {
          if (this.wallets.length <= 1) {
               this.authorizedWalletAddress = '';
               return;
          }
          const currentAddress = this.currentWallet.address;
          if (!this.authorizedWalletAddress || this.authorizedWalletAddress === currentAddress) {
               // Find a valid non-current address
               const nonSelectedWallet = this.wallets.find(w => w.address !== currentAddress);
               this.authorizedWalletAddress = nonSelectedWallet ? nonSelectedWallet.address : this.wallets[0].address;
          }
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

     clearFlagsValue() {
          this.flags = {
               renew: false,
               close: false,
          };
          this.totalFlagsValue = 0;
          this.totalFlagsHex = '0x0';
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

     private updateInfoMessage() {
          const walletName = this.currentWallet.name || 'selected';
          const countByTab: Record<string, number> = {
               create: this.existingPaymentChannels.length,
               fund: this.existingPaymentChannels.length,
               claim: this.receivablePaymentChannels.length,
               close: this.closablePaymentChannels.length,
          };

          const count = countByTab[this.activeTab] ?? 0;

          // Early exit if no data for current tab
          if (count === 0 && this.activeTab !== 'create') {
               this.ui.setInfoMessage(`<code>${walletName}</code> wallet has no payment channels ${this.getTabDescription()}.`);
               return;
          }

          const isSingular = count === 1;
          const channelWord = isSingular ? 'payment channel' : 'payment channels';

          let message = `<code>${walletName}</code> wallet has `;

          // Special text per tab
          switch (this.activeTab) {
               case 'create':
                    message += `<strong>${count}</strong> ${channelWord} created.`;
                    break;

               case 'fund':
                    message += `<strong>${count}</strong> ${channelWord} available for funding.`;
                    break;

               case 'claim':
                    message += `<strong>${count}</strong> ${channelWord} with claimable funds.`;
                    break;

               case 'close':
                    message += `<strong>${count}</strong> ${channelWord} that can potentially be closed.`;
                    // Add XRPL Win link only on close tab
                    message += `<br><a href="${this.url}account/${this.currentWallet.address}/payment-channels" 
                             target="_blank" rel="noopener noreferrer" class="xrpl-win-link">
                View Payment Channels on XRPL Win
            </a>`;
                    break;

               default:
                    this.ui.setInfoMessage(null);
                    return;
          }

          this.ui.setInfoMessage(message);
     }

     // Helper to get clean description when count is 0
     private getTabDescription(): string {
          const desc: Record<string, string> = {
               create: 'created',
               fund: 'available for funding',
               claim: 'with claimable funds',
               close: 'that can be closed',
          };
          return desc[this.activeTab] || '';
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     get safeWarningMessage() {
          return this.ui.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     clearFields(all = true) {
          if (all) {
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

     filterDestinations() {
          const query = this.filterQuery.trim().toLowerCase();

          if (query === '') {
               this.filteredDestinations = [...this.destinations];
          } else {
               this.filteredDestinations = this.destinations.filter(d => d.address.toLowerCase().includes(query) || (d.name && d.name.toLowerCase().includes(query)));
          }

          this.highlightedIndex = this.filteredDestinations.length > 0 ? 0 : -1;
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
