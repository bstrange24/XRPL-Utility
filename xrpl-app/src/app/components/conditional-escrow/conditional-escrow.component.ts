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
import * as cc from 'five-bells-condition';
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
import { WalletGeneratorService } from '../../services/wallets/generator/wallet-generator.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';

declare var Prism: any;

interface ValidationInputs {
     senderAddress?: string;
     accountInfo?: any;
     seed?: string;
     amount?: string;
     destination?: string;
     conditionField?: string;
     fulfillment?: string;
     finishTime?: string;
     escrowSequence?: string;
     cancelTime?: string;
     sequence?: string;
     selectedIssuer?: string;
     currency?: string;
     escrow_objects?: any;
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

interface EscrowObject {
     Account: string;
     index: string;
     Expiration?: number;
     Destination: string;
     Condition: string;
     CancelAfter: string;
     FinshAfter: string;
     Amount: string;
     DestinationTag: string;
     Balance: string;
     SourceTag: number;
     PreviousTxnID: string;
     Memo: string | null | undefined;
     Sequence: number | null | undefined;
     TicketSequence: number | null | undefined;
}

interface EscrowDataForUI {
     Account: string;
     Amount?: string | { currency: string; value: string } | { mpt_issuance_id: string; value: string };
     CancelAfter?: number;
     Destination: string;
     DestinationNode?: string;
     FinishAfter?: number;
     Condition?: string;
     Fulfillment?: string;
     DestinationTag?: number;
     Sequence?: number | null;
     EscrowSequence?: string | null;
     TxHash?: number | null;
}

interface RippleState {
     LedgerEntryType: 'RippleState';
     Balance: { currency: string; value: string };
     HighLimit: { issuer: string };
}

interface MPToken {
     LedgerEntryType?: string;
     index?: string;
     mpt_issuance_id?: string;
     MPTokenIssuanceID?: string;
     PreviousTxnID?: string;
     Flags?: number;
     MPTAmount?: string | number;
     MaximumAmount?: string | number;
     OutstandingAmount?: string | number;
     TransferFee?: string | number;
     MPTokenMetadata?: string;
}

interface IssuerItem {
     name: string;
     address: string;
}

@Component({
     selector: 'app-conditional-escrow',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './conditional-escrow.component.html',
     styleUrl: './conditional-escrow.component.css',
})
export class CreateConditionalEscrowComponent implements OnInit, AfterViewInit {
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

     // Escrow Specific
     currencyFieldDropDownValue: string = 'XRP';
     issuerFields: string = '';
     currencyBalanceField: string = '';
     gatewayBalance: string = '0';
     ticketSequence: string = '';
     escrowFinishTimeField: string = '';
     escrowFinishTimeUnit: string = 'seconds';
     escrowCancelTimeUnit: string = 'seconds';
     escrowConditionField: string = '';
     escrowFulfillmentField: string = '';
     escrowCancelTimeField: string = '';
     escrowOwnerField: string = '';
     escrowSequenceNumberField: string = '';
     selectedEscrow: any = null;
     mptIssuanceIdField: string = '';
     tokenBalance: string = '0';
     private knownTrustLinesIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerToRemove: string = '';
     currencies: string[] = [];
     userAddedCurrencyFieldDropDownValue: string[] = [];
     userAddedissuerFields: string = '';
     allKnownIssuers: string[] = [];
     storedIssuers: IssuerItem[] = [];
     selectedIssuer: string = '';
     newCurrency: string = '';
     newIssuer: string = '';
     tokenToRemove: string = '';
     escrowCancelDateTimeField: string = '';
     escrowFinishDateTimeField: string = '';
     selectedWalletIndex: number = 0;
     issuers: { name?: string; address: string }[] = [];
     lastCurrency: string = '';
     lastIssuer: string = '';
     expiredOrFulfilledEscrows: any = [];
     finishEscrow: any = [];
     existingEscrow: any = [];
     exsitingMpt: any = [];
     existingIOUs: any = [];
     outstandingEscrowCollapsed = true;
     outstandingMptCollapsed: boolean = true;
     outstandingIOUCollapsed: boolean = true;
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
          private cdr: ChangeDetectorRef,
          private trustlineCurrency: TrustlineCurrencyService
     ) {}

     ngOnInit() {
          this.loadKnownIssuers();
          this.refreshStoredIssuers();

          this.environment = this.xrplService.getNet().environment;
          const envKey = this.xrplService.getNet().environment.toUpperCase() as keyof typeof AppConstants.XRPL_WIN_URL;
          this.url = AppConstants.XRPL_WIN_URL[envKey] || AppConstants.XRPL_WIN_URL.DEVNET;
          this.currencyFieldDropDownValue = 'XRP';

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
                         this.getEscrows();
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
                         this.getEscrows(); // Refresh UI for new wallet
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

          // Subscribe once
          this.trustlineCurrency.currencies$.subscribe(currencies => {
               this.currencies = currencies;
               if (currencies.length > 0 && !this.currencyFieldDropDownValue) {
                    this.currencyFieldDropDownValue = currencies[0];
                    this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue, this.currentWallet.address);
               }
          });

          this.trustlineCurrency.issuers$.subscribe(issuers => {
               this.issuers = issuers;
          });

          this.trustlineCurrency.selectedIssuer$.subscribe(issuer => {
               this.issuerFields = issuer;
          });

          this.trustlineCurrency.balance$.subscribe(balance => {
               this.currencyBalanceField = balance; // ← This is your live balance!
          });
     }

     ngAfterViewInit() {
          this.scheduleHighlight();
     }

     ngOnDestroy() {
          this.destroy$.next();
          this.destroy$.complete();
     }

     trackByAddress(index: number, item: DropdownItem): string {
          return item.address;
     }

     trackByWalletAddress(index: number, wallet: Wallet): string {
          return wallet.address;
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

          // Re-load currency + issuer balance for new wallet
          if (this.currencyFieldDropDownValue) {
               this.onCurrencyChange(this.currencyFieldDropDownValue);
          }

          this.getEscrows();
     }

     async setTab(tab: string) {
          const previousTab = this.activeTab;
          this.activeTab = tab;

          // Only clear messages when actually changing tabs
          if (previousTab !== tab) {
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

          if (Object.keys(this.knownTrustLinesIssuers).length > 0 && this.issuerFields === '') {
               this.currencyFieldDropDownValue = Object.keys(this.knownTrustLinesIssuers)[0];
          }

          if (this.activeTab === 'cancel' || this.activeTab === 'finish') {
               const client = await this.xrplService.getClient();
               const escrowObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'escrow');
               this.getExpiredOrFulfilledEscrows(client, escrowObjects, this.currentWallet.address);
          }

          if (this.activeTab === 'create') {
               const client = await this.xrplService.getClient();
               const accountObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', '');
               this.getExistingEscrows(accountObjects, this.currentWallet.address);
               this.getExistingMpts(accountObjects, this.currentWallet.address);
               this.getExistingIOUs(accountObjects, this.currentWallet.address);
          }

          if (this.currencyFieldDropDownValue !== 'XRP') {
               this.onCurrencyChange(this.currencyFieldDropDownValue);
          }

          this.resetEscrowSelection();
          this.updateInfoMessage();

          this.clearFields(true);
          this.ui.clearMessages();
          this.ui.clearWarning();
     }

     toggleOutstandingEscrows() {
          this.outstandingEscrowCollapsed = !this.outstandingEscrowCollapsed;
     }

     toggleOutstandingMpt() {
          this.outstandingMptCollapsed = !this.outstandingMptCollapsed;
     }

     toggleOutstandingIOU() {
          this.outstandingIOUCollapsed = !this.outstandingIOUCollapsed;
     }

     async getEscrows() {
          console.log('Entering getEscrows');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const errors = await this.validationService.validate('AccountInfo', { inputs: { seed: this.currentWallet.seed, accountInfo }, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.getExistingEscrows(accountObjects, wallet.classicAddress);
               this.getExistingMpts(accountObjects, this.currentWallet.address);
               this.getExistingIOUs(accountObjects, this.currentWallet.address);
               this.getExpiredOrFulfilledEscrows(client, accountObjects, wallet.classicAddress);

               if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT' && this.issuerFields !== '') {
                    // const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');
                    // const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
                    // this.currencyBalanceField = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
                    this.trustlineCurrency.selectCurrency(this.currencyFieldDropDownValue, this.currentWallet.address);
               }

               this.refreshUIData(wallet, accountInfo, accountObjects);
               // this.getEscrowOwnerAddress();
               this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
               this.updateTickets(accountObjects);
               this.clearFields(false);
               this.updateInfoMessage();
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getEscrows:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getEscrows in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async createConditionalEscrow() {
          console.log('Entering createConditionalEscrow');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               senderAddress: this.currentWallet.address,
               amount: this.amountField,
               destination: this.destinationField,
               conditionField: this.escrowConditionField,
               finishTime: this.escrowFinishTimeField,
               cancelTime: this.escrowCancelTimeField,
               destinationTag: this.destinationTagField,
               selectedIssuer: this.selectedIssuer,
               currency: this.currencyFieldDropDownValue,
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

               const [accountInfo, trustLines, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logObjects('trustLines', trustLines);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               if (this.destinationField === '') {
                    return this.ui.setError(`Destination cannot be empty.`);
               }
               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;

               const errors = await this.validationService.validate('CreateTimeBasedEscrow', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const finishAfterTime = this.utilsService.addTime(this.escrowFinishTimeField, this.escrowFinishTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               const cancelAfterTime = this.utilsService.addTime(this.escrowCancelTimeField, this.escrowCancelTimeUnit as 'seconds' | 'minutes' | 'hours' | 'days');
               console.log(`finishUnit: ${this.escrowFinishTimeUnit} cancelUnit: ${this.escrowCancelTimeUnit}`);
               console.log(`finishTime: ${this.utilsService.convertXRPLTime(finishAfterTime)} cancelTime: ${this.utilsService.convertXRPLTime(cancelAfterTime)}`);

               // Build amount object depending on currency
               const amountToCash =
                    this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY
                         ? xrpl.xrpToDrops(this.amountField)
                         : {
                                value: this.amountField,
                                currency: this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue),
                                issuer: this.issuerFields,
                           };

               let escrowCreateTx: xrpl.EscrowCreate = {
                    TransactionType: 'EscrowCreate',
                    Account: wallet.address,
                    Amount: amountToCash,
                    Destination: resolvedDestination,
                    FinishAfter: finishAfterTime,
                    CancelAfter: cancelAfterTime,
                    Condition: this.escrowConditionField,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, escrowCreateTx, wallet, accountInfo, 'create');

               if (this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY) {
                    if (this.amountField || this.amountField === '') {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, escrowCreateTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    } else {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, escrowCreateTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    }
               } else if (this.currencyFieldDropDownValue !== 'MPT') {
                    if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, escrowCreateTx, resolvedDestination)) {
                         return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
                    }
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Create Conditional Escrow (no changes will be made)...' : 'Submitting Create Conditional Escrow to Ledger...', 200);

               this.ui.setPaymentTx(escrowCreateTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, escrowCreateTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, escrowCreateTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Created escrow successfully!';
                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                         // await this.updateCurrencyBalance(gatewayBalances, wallet);
                         this.onCurrencyChange(this.currencyFieldDropDownValue);
                    }
                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    // Add new destination if valid and not already present
                    this.addNewDestinationFromUser();

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Escrow create successfully!';
               }
          } catch (error: any) {
               console.error('Error in createConditionalEscrow:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving createConditionalEscrow in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async finishConditionalEscrow() {
          console.log('Entering finishConditionalEscrow');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               conditionField: this.escrowConditionField,
               fulfillment: this.escrowFulfillmentField,
               escrowSequence: this.escrowSequenceNumberField.toString(),
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

          // If condition is provided, fulfillment is required
          if (this.escrowConditionField && !this.utilsService.validateInput(this.escrowFulfillmentField)) {
               return this.ui.setError('ERROR: Fulfillment is required when a condition is provided');
          }

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, escrowObjects, escrow, trustLines, fee, currentLedger, serverInfo] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'escrow'),
                    this.xrplService.getEscrowBySequence(client, wallet.classicAddress, Number(this.escrowSequenceNumberField)),
                    this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                    String(4 * Number(await this.xrplService.calculateTransactionFee(client))),
                    this.xrplService.getLastLedgerIndex(client),
                    this.xrplService.getXrplServerInfo(client, 'current', ''),
               ]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logObjects('trustLines', trustLines);
               // this.utilsService.logEscrowObjects(escrowObjects, escrow);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.destination = this.escrowOwnerField;
               inputs.accountInfo = accountInfo;
               inputs.escrow_objects = escrowObjects;

               const errors = await this.validationService.validate('FinishTimeBasedEscrow', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // Check if the escrow can be canceled based on the CancelAfter time
               const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
               const escrowStatus = this.utilsService.checkEscrowStatus({ FinishAfter: escrow.FinshAfter ? Number(escrow.FinshAfter) : undefined, CancelAfter: escrow.CancelAfter ? Number(escrow.CancelAfter) : undefined, Condition: this.escrowConditionField, owner: this.escrowOwnerField }, currentRippleTime, wallet.classicAddress, 'finishEscrow', this.escrowFulfillmentField);

               if (!escrowStatus.canFinish && !escrowStatus.canCancel) {
                    return this.ui.setError(`\n${escrowStatus.reasonCancel}\n${escrowStatus.reasonFinish}`);
               }

               if (!escrowStatus.canFinish) {
                    return this.ui.setError(`${escrowStatus.reasonFinish}`);
               }

               let escrowFinishTx: xrpl.EscrowFinish = {
                    TransactionType: 'EscrowFinish',
                    Account: wallet.classicAddress,
                    Owner: this.escrowOwnerField,
                    OfferSequence: parseInt(this.escrowSequenceNumberField),
                    Condition: this.escrowConditionField,
                    Fulfillment: this.escrowFulfillmentField,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, escrowFinishTx, wallet, accountInfo, 'finish');

               if (this.currencyFieldDropDownValue === AppConstants.XRP_CURRENCY) {
                    if (this.amountField || this.amountField === '') {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, escrowFinishTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    } else {
                         if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, this.amountField, wallet.classicAddress, escrowFinishTx, fee)) {
                              return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                         }
                    }
               } else if (this.currencyFieldDropDownValue !== 'MPT') {
                    // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, escrowFinishTx, resolvedDestination)) {
                    //      return this.ui.setError('ERROR: Not enough IOU balance for this transaction');
                    // }
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Finishing Conditional Escrow (no changes will be made)...' : 'Submitting Finish Conditional Escrow to Ledger...', 200);

               this.ui.setPaymentTx(escrowFinishTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, escrowFinishTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, escrowFinishTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Finished escrow successfully!';
                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                    this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress, this.escrowOwnerField]).catch(console.error);

                    this.addNewDestinationFromUser();

                    if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                         // await this.updateCurrencyBalance(gatewayBalances, wallet);
                         this.onCurrencyChange(this.currencyFieldDropDownValue);
                    }

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Escrow finish successfully!';
               }
          } catch (error: any) {
               console.error('Error in finishConditionalEscrow:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving finishConditionalEscrow in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     async cancelEscrow() {
          console.log('Entering cancelEscrow');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               escrowSequence: this.escrowSequenceNumberField.toString(),
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

               const [accountInfo, escrowObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'escrow'), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logEscrowObjects(escrowObjects, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               if (this.destinationField === '') {
                    return this.ui.setError(`Destination cannot be empty.`);
               }
               const isShortForm = this.destinationField.includes('...');
               const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;

               inputs.destination = resolvedDestination;
               inputs.accountInfo = accountInfo;
               inputs.escrow_objects = escrowObjects;

               const errors = await this.validationService.validate('CancelTimeBasedEscrow', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               let foundSequenceNumber = false;
               let escrowOwner = this.currentWallet.address;
               let escrow: EscrowObject | undefined = undefined;
               for (const [ignore, obj] of escrowObjects.result.account_objects.entries()) {
                    if (obj.PreviousTxnID) {
                         const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                         if (sequenceTx.result.tx_json.Sequence === Number(this.escrowSequenceNumberField)) {
                              foundSequenceNumber = true;
                              escrow = obj as unknown as EscrowObject;
                              escrowOwner = escrow.Account;
                              break;
                         } else if (sequenceTx.result.tx_json.TicketSequence != undefined && sequenceTx.result.tx_json.TicketSequence === Number(this.escrowSequenceNumberField)) {
                              foundSequenceNumber = true;
                              escrow = obj as unknown as EscrowObject;
                              escrowOwner = escrow.Account;
                              break;
                         }
                    }
               }

               if (!escrow) {
                    return this.ui.setError(`No escrow found for sequence ${this.escrowSequenceNumberField}`);
               }

               // Check if the escrow can be canceled based on the CancelAfter time
               const currentRippleTime = await this.xrplService.getCurrentRippleTime(client);
               // Ensure FinishAfter and CancelAfter are numbers
               const finishAfterNum = escrow.FinshAfter !== undefined ? Number(escrow.FinshAfter) : undefined;
               const cancelAfterNum = escrow.CancelAfter !== undefined ? Number(escrow.CancelAfter) : undefined;
               const escrowStatus = this.utilsService.checkTimeBasedEscrowStatus({ FinishAfter: finishAfterNum, CancelAfter: cancelAfterNum, owner: escrowOwner }, currentRippleTime, wallet.classicAddress, 'cancelEscrow');

               if (!escrowStatus.canCancel) {
                    return this.ui.setError(`${escrowStatus.reasonCancel}`);
               }

               let escrowCancelTx: xrpl.EscrowCancel = {
                    TransactionType: 'EscrowCancel',
                    Account: wallet.classicAddress,
                    Owner: escrowOwner,
                    OfferSequence: parseInt(this.escrowSequenceNumberField),
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, escrowCancelTx, wallet, accountInfo, 'cancel');

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, escrowCancelTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Cancelling Conditional Escrow (no changes will be made)...' : 'Submitting Cancel Conditional Escrow to Ledger...', 200);

               this.ui.setPaymentTx(escrowCancelTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, escrowCancelTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, escrowCancelTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.ui.successMessage = 'Cancelled escrow successfully!';

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress, resolvedDestination]).catch(console.error);

                    this.addNewDestinationFromUser();

                    // Re-fetch and update the "Available Escrows to cancel" list
                    this.getExpiredOrFulfilledEscrows(client, updatedAccountObjects, wallet.classicAddress);

                    // Refresh existingEscrow list (this powers the infoMessage on the Create tab, but also keeps data consistent)
                    if (this.activeTab === 'cancel') {
                         this.getExistingEscrows(updatedAccountObjects, wallet.classicAddress);
                         this.getExistingMpts(updatedAccountObjects, wallet.classicAddress);
                         this.getExistingIOUs(updatedAccountObjects, wallet.classicAddress);
                    }

                    if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                         // await this.updateCurrencyBalance(gatewayBalances, wallet);
                         this.onCurrencyChange(this.currencyFieldDropDownValue);
                    }

                    this.resetEscrowSelection();
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.updateInfoMessage();
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Escrow cancel successfully!';
               }
          } catch (error: any) {
               console.error('Error in cancelEscrow:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving cancelEscrow in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     private getExistingEscrows(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string): EscrowDataForUI[] {
          this.existingEscrow = (escrowObjects.result.account_objects ?? [])
               .filter(
                    (obj: any) =>
                         obj.LedgerEntryType === 'Escrow' &&
                         obj.Account === classicAddress &&
                         // Only condition-based escrows:
                         (obj.FinishAfter || obj.CancelAfter) &&
                         !!obj.Condition
               )
               .map((obj: any): EscrowDataForUI => {
                    const sendMax = obj.Amount;
                    let amount = '0';
                    let currency = '';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                         currency = '';
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                    }

                    return {
                         Account: obj.Account,
                         Amount: `${amount} ${currency}`,
                         Destination: obj.Destination,
                         DestinationTag: obj.DestinationTag,
                         CancelAfter: obj.CancelAfter,
                         FinishAfter: obj.FinishAfter,
                         TxHash: obj.PreviousTxnID,
                         Sequence: obj.PreviousTxnID,
                    };
               })
               .sort((a, b) => a.Destination.localeCompare(b.Destination));

          this.utilsService.logObjects('existingEscrow', this.existingEscrow);
          return this.existingEscrow;
     }

     private getExistingMpts(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string): MPToken[] {
          this.exsitingMpt = (escrowObjects.result.account_objects ?? [])
               .filter((obj: any) => (obj.LedgerEntryType === 'MPToken' || obj.LedgerEntryType === 'MPTokenIssuance') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any): MPToken => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         MPTAmount: obj.MaximumAmount ? obj.MaximumAmount : obj.MPTAmount,
                         mpt_issuance_id: obj.mpt_issuance_id ? obj.mpt_issuance_id : obj.MPTokenIssuanceID,
                    };
               })
               .sort((a, b) => {
                    const ai = a.mpt_issuance_id ?? '';
                    const bi = b.mpt_issuance_id ?? '';
                    return ai.localeCompare(bi);
               });

          this.utilsService.logObjects('exsitingMpt', this.exsitingMpt);
          return this.exsitingMpt;
     }

     private getExistingIOUs(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string): RippleState[] {
          this.existingIOUs = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'RippleState')
               .map((obj: any): RippleState => {
                    const balance = obj.Balance?.value ?? '0';
                    const currency = this.utilsService.normalizeCurrencyCode(obj.Balance?.currency);

                    // Determine if this account is the issuer or holder
                    const issuer = obj.HighLimit?.issuer === classicAddress ? obj.LowLimit?.issuer : obj.HighLimit?.issuer;

                    return {
                         LedgerEntryType: 'RippleState',
                         Balance: {
                              currency,
                              value: balance,
                         },
                         HighLimit: {
                              issuer,
                         },
                    };
               })
               // Sort alphabetically by issuer or currency if available
               .sort((a, b) => a.HighLimit.issuer.localeCompare(b.HighLimit.issuer));

          this.utilsService.logObjects('existingIOUs', this.existingIOUs);
          return this.existingIOUs;
     }

     // private async getExpiredOrFulfilledEscrows(client: xrpl.Client, escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
     //      const currentLedger = await client.request({ command: 'ledger', ledger_index: 'validated' });
     //      const ledgerTime = xrpl.rippleTimeToUnixTime(currentLedger.result.ledger.close_time);

     //      const filteredEscrows = (escrowObjects.result.account_objects ?? []).filter((obj: any) => {
     //           if (obj.LedgerEntryType !== 'Escrow') return false;

     //           const isCancelMode = this.activeTab === 'cancel';
     //           const isOwner = obj.Account === classicAddress;
     //           const isRecipient = obj.Destination === classicAddress;

     //           // Basic ownership filtering
     //           if (isCancelMode && !isOwner) return false;
     //           if (!isCancelMode && !isRecipient) return false;

     //           // Check expiration / fulfillment conditions
     //           const cancelAfter = obj.CancelAfter ? xrpl.rippleTimeToUnixTime(obj.CancelAfter) : null;
     //           const finishAfter = obj.FinishAfter ? xrpl.rippleTimeToUnixTime(obj.FinishAfter) : null;

     //           // For cancel: can cancel if escrow is expired (CancelAfter < now)
     //           if (isCancelMode && cancelAfter && cancelAfter > ledgerTime) return false;

     //           // For finish: can finish if still active (CancelAfter not passed)
     //           if (!isCancelMode && cancelAfter && cancelAfter <= ledgerTime) return false;

     //           // If FinishAfter is set and not yet reached, can't finish yet
     //           if (!isCancelMode && finishAfter && finishAfter > ledgerTime) return false;

     //           return true;
     //      });

     //      // Process remaining escrows in parallel
     //      const processedEscrows = await Promise.all(
     //           filteredEscrows.map(async (obj: any) => {
     //                const sendMax = obj.Amount;
     //                let amount = '0';

     //                if (typeof sendMax === 'string') {
     //                     amount = String(xrpl.dropsToXrp(sendMax));
     //                } else if (sendMax?.value) {
     //                     amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
     //                }

     //                let EscrowSequence: number | null = null;
     //                if (obj.PreviousTxnID) {
     //                     try {
     //                          const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
     //                          EscrowSequence = sequenceTx?.result?.tx_json?.Sequence ?? null;
     //                     } catch (error) {
     //                          console.warn(`Failed to fetch escrow sequence for ${obj.PreviousTxnID}:`, error);
     //                     }
     //                }

     //                return {
     //                     Amount: amount,
     //                     Sender: obj.Account,
     //                     Destination: obj.Destination,
     //                     EscrowSequence,
     //                };
     //           })
     //      );

     //      this.expiredOrFulfilledEscrows = processedEscrows.sort((a, b) => a.Sender.localeCompare(b.Sender));

     //      this.utilsService.logObjects('expiredOrFulfilledEscrows', this.expiredOrFulfilledEscrows);
     // }

     private async getExpiredOrFulfilledEscrows(client: xrpl.Client, escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const filteredEscrows = (escrowObjects.result.account_objects ?? []).filter(
               (obj: any) =>
                    obj.LedgerEntryType === 'Escrow' &&
                    (this.activeTab === 'cancel'
                         ? obj.Account === classicAddress // owner can cancel
                         : obj.Destination === classicAddress) // receiver can finish
          );

          const processedEscrows = await Promise.all(
               filteredEscrows.map(async (obj: any) => {
                    const sendMax = obj.Amount;
                    let amount = '0';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }

                    let EscrowSequence: number | null = null;
                    if (obj.PreviousTxnID) {
                         try {
                              const sequenceTx = await this.xrplService.getTxData(client, obj.PreviousTxnID);
                              EscrowSequence = sequenceTx?.result?.tx_json?.Sequence ?? null;
                         } catch (error) {
                              console.warn(`Failed to fetch escrow sequence for ${obj.PreviousTxnID}:`, error);
                         }
                    }

                    return {
                         Amount: amount,
                         Sender: obj.Account,
                         Destination: obj.Destination,
                         EscrowSequence,
                    };
               })
          );

          this.expiredOrFulfilledEscrows = processedEscrows.sort((a, b) => a.Sender.localeCompare(b.Sender));

          this.utilsService.logObjects('expiredOrFulfilledEscrows', this.expiredOrFulfilledEscrows);
     }

     get availableCurrencies(): string[] {
          return [
               'XRP',
               ...Object.keys(this.knownTrustLinesIssuers)
                    .filter(c => c && c !== 'XRP' && c !== 'MPT')
                    .sort((a, b) => a.localeCompare(b)),
          ];
     }

     private async setTxOptionalFields(client: xrpl.Client, escrowTx: any, wallet: xrpl.Wallet, accountInfo: any, txType: string) {
          if (this.selectedSingleTicket) {
               const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!exists) throw new Error(`Ticket ${this.selectedSingleTicket} not found`);
               this.utilsService.setTicketSequence(escrowTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(escrowTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.destinationTagField && parseInt(this.destinationTagField) > 0) this.utilsService.setDestinationTag(escrowTx, this.destinationTagField);
          if (this.memoField) this.utilsService.setMemoField(escrowTx, this.memoField);

          if (txType === 'create') {
               if (this.currencyFieldDropDownValue === 'MPT') {
                    const isShortForm = this.destinationField.includes('...');
                    const resolvedDestination = isShortForm ? this.walletManagerService.getDestinationFromDisplay(this.destinationField, this.destinations)?.address : this.destinationField;
                    const accountObjects = await this.xrplService.getAccountObjects(client, resolvedDestination, 'validated', '');
                    const mptTokens = accountObjects.result.account_objects.filter((obj: any) => obj.LedgerEntryType === 'MPToken');
                    console.debug(`Destination MPT Tokens:`, mptTokens);
                    console.debug('MPT Issuance ID:', this.mptIssuanceIdField);
                    const authorized = mptTokens.some((obj: any) => obj.MPTokenIssuanceID === this.mptIssuanceIdField);

                    if (!authorized) {
                         throw new Error(`Destination ${resolvedDestination} is not authorized to receive this MPT (issuance ID ${this.mptIssuanceIdField}). Please ensure authorization has been completed.`);
                    }

                    const curr: xrpl.MPTAmount = {
                         mpt_issuance_id: this.mptIssuanceIdField,
                         value: this.amountField,
                    };
                    escrowTx.Amount = curr;
               } else if (this.currencyFieldDropDownValue !== 'XRP' && this.currencyFieldDropDownValue !== 'MPT') {
                    const curr: xrpl.IssuedCurrencyAmount = {
                         currency: this.currencyFieldDropDownValue.length > 3 ? this.utilsService.encodeCurrencyCode(this.currencyFieldDropDownValue) : this.currencyFieldDropDownValue,
                         issuer: this.issuerFields,
                         value: this.amountField,
                    };
                    escrowTx.Amount = curr;
               } else {
                    escrowTx.Amount = xrpl.xrpToDrops(this.amountField);
               }
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

     onEscrowSelect(selected: any) {
          if (selected) {
               this.escrowSequenceNumberField = selected.EscrowSequence;
               this.escrowOwnerField = selected.Sender; // or selected.Account depending on your data
          }
     }

     async getEscrowOwnerAddress() {
          console.log('Entering getEscrowOwnerAddress');
          const startTime = Date.now();

          try {
               const client = await this.xrplService.getClient();
               const accountInfo = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', '');
               // this.utilsService.logObjects('accountInfo', accountInfo);

               const inputs: ValidationInputs = { seed: this.currentWallet.seed, senderAddress: this.currentWallet.address, accountInfo: accountInfo };

               const errors = await this.validationService.validate('EscrowOwner', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               const escrowObjects = accountInfo.result.account_objects;
               if (escrowObjects.length === 0) {
                    this.escrowOwnerField = this.currentWallet.address;
                    return;
               }

               const targetSequence = Number(this.escrowSequenceNumberField);
               if (isNaN(targetSequence)) {
                    this.escrowOwnerField = this.currentWallet.address;
                    return;
               }

               const txPromises = escrowObjects.map(async escrow => {
                    const previousTxnID = escrow.PreviousTxnID;
                    if (typeof previousTxnID !== 'string') {
                         return Promise.resolve({ escrow, sequence: null });
                    }
                    try {
                         const sequenceTx = await this.xrplService.getTxData(client, previousTxnID);
                         const offerSequence = sequenceTx.result.tx_json.Sequence;
                         return { escrow, sequence: offerSequence ?? null };
                    } catch (err: any) {
                         console.error(`Failed to fetch tx ${previousTxnID}:`, err.message || err);
                         return { escrow, sequence: null };
                    }
               });

               const results = await Promise.all(txPromises);

               const match = results.find(r => r.sequence === targetSequence);
               if (match && 'Account' in match.escrow) {
                    this.escrowOwnerField = match.escrow.Account;
               } else {
                    this.escrowOwnerField = this.currentWallet.address; // safe fallback
               }
          } catch (error: any) {
               console.error('Error in getEscrowOwnerAddress:', error);
               this.ui.setError(`${error.message || 'Unknown error'}`);
               this.escrowOwnerField = this.currentWallet.address; // safe fallback
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               const executionTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
               console.log(`Leaving getEscrowOwnerAddress in ${this.executionTime} ms ${executionTimeSeconds} seconds`);
          }
     }

     // private async updateCurrencyBalance(gatewayBalance: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet) {
     //      const parsedBalances = this.parseAllGatewayBalances(gatewayBalance, wallet);
     //      if (parsedBalances && Object.keys(parsedBalances).length > 0) {
     //           this.currencyBalanceField = parsedBalances[this.currencyFieldDropDownValue]?.[wallet.classicAddress] ?? parsedBalances[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
     //      } else {
     //           this.currencyBalanceField = '0';
     //      }
     // }

     // private parseAllGatewayBalances(gatewayBalances: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet) {
     //      const result = gatewayBalances.result;
     //      const grouped: Record<string, Record<string, string>> = {};
     //      // structure: { [currency]: { [issuer]: balance } }

     //      // --- Case 1: Obligations (this account is the gateway/issuer)
     //      if (result.obligations && Object.keys(result.obligations).length > 0) {
     //           for (const [currencyCode, value] of Object.entries(result.obligations)) {
     //                const decodedCurrency = this.utilsService.normalizeCurrencyCode(currencyCode);

     //                if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};

     //                // Obligations are what the gateway owes → negative
     //                const formatted = '-' + this.utilsService.formatTokenBalance(value, 18);
     //                grouped[decodedCurrency][wallet.address] = formatted;
     //           }
     //      }

     //      // --- Case 2: Assets (tokens issued by others, held by this account)
     //      if (result.assets && Object.keys(result.assets).length > 0) {
     //           for (const [issuer, assetArray] of Object.entries(result.assets)) {
     //                assetArray.forEach(asset => {
     //                     const decodedCurrency = this.utilsService.normalizeCurrencyCode(asset.currency);

     //                     if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};
     //                     grouped[decodedCurrency][issuer] = this.utilsService.formatTokenBalance(asset.value, 18);
     //                });
     //           }
     //      }

     //      // --- Case 3: Balances (owed TO this account)
     //      if (result.balances && Object.keys(result.balances).length > 0) {
     //           for (const [issuer, balanceArray] of Object.entries(result.balances)) {
     //                balanceArray.forEach(balanceObj => {
     //                     const decodedCurrency = this.utilsService.normalizeCurrencyCode(balanceObj.currency);

     //                     if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};
     //                     grouped[decodedCurrency][issuer] = this.utilsService.formatTokenBalance(balanceObj.value, 18);
     //                });
     //           }
     //      }

     //      return grouped;
     // }

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

     copyEscrowTxHash(PreviousTxnID: string) {
          navigator.clipboard.writeText(PreviousTxnID).then(() => {
               this.ui.showToastMessage('Escrow Tx Hash copied!');
          });
     }

     copyMptIssuanceIdHash(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.ui.showToastMessage('MPT Issuance ID copied!');
          });
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.ui.showToastMessage('IOU Token Issuer copied!');
          });
     }

     private updateInfoMessage() {
          const walletName = this.currentWallet.name || 'selected';
          const address = this.currentWallet.address;
          const baseUrl = this.url;

          let message = '';

          // ==================================================================
          // 1.create TAB → Show escrows + IOUs + MPTs
          // ==================================================================
          if (this.activeTab === 'create') {
               const escrowCount = this.existingEscrow.length;
               const iouCount = this.existingIOUs.length;
               const mptCount = this.exsitingMpt?.length || 0; // fix typo: exsitingMpt → exsMpt

               const items: string[] = [];
               if (escrowCount > 0) items.push(`${escrowCount} escrow${escrowCount > 1 ? 's' : ''}`);
               if (iouCount > 0) items.push(`${iouCount} IOU${iouCount > 1 ? 's' : ''}`);
               if (mptCount > 0) items.push(`${mptCount} MPT${mptCount > 1 ? 's' : ''}`);

               if (items.length === 0) {
                    message = `<code>${walletName}</code> wallet has no escrows, IOUs or MPTs yet.`;
               } else {
                    const list = items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

                    message = `<code>${walletName}</code> wallet has ${list} on the ledger.`;

                    const links: string[] = [];
                    if (escrowCount > 0) links.push(`<a href="${baseUrl}account/${address}/escrows" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Escrows</a>`);
                    if (mptCount > 0) links.push(`<a href="${baseUrl}account/${address}/mpts/owned" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View MPTs</a>`);
                    if (iouCount > 0) links.push(`<a href="${baseUrl}account/${address}/tokens" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View IOUs</a>`);

                    if (links.length > 0) {
                         message += `<br>${links.join(' | ')} on XRPL Win`;
                    }
               }
          }

          // ==================================================================
          // 2. cancel & finish TABS → Only cancellable/finishable escrows
          // ==================================================================
          else if (this.activeTab === 'cancel' || this.activeTab === 'finish') {
               let relevantEscrows: any[] = [];
               let action = '';

               if (this.activeTab === 'cancel') {
                    // Owner + CancelAfter passed
                    relevantEscrows = this.expiredOrFulfilledEscrows.filter((e: any) => e.Sender === address);
                    action = 'cancelled';
               } else {
                    // Destination + (FinishAfter passed or no CancelAfter)
                    relevantEscrows = this.expiredOrFulfilledEscrows.filter((e: any) => e.Destination === address);
                    action = 'finished';
               }

               const count = relevantEscrows.length;

               if (count === 0) {
                    message = `<code>${walletName}</code> wallet has no escrows that can be ${action}.`;
               } else {
                    const word = count === 1 ? 'escrow' : 'escrows';
                    message = `<code>${walletName}</code> wallet has <strong>${count}</strong> ${word} that can be ${action}.`;
                    message += `<br><a href="${baseUrl}account/${address}/escrows" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">
                View Escrows on XRPL Win
            </a>`;
               }
          }

          // Default fallback
          else {
               this.ui.setInfoMessage(null);
               return;
          }

          // Send to service — will be safely rendered with <code>, <strong>, <br>, <a>
          this.ui.setInfoMessage(message);
     }

     // Helper to nicely join parts like "1 escrow", "2 IOUs", and "1 MPT"
     private formatParts(parts: string[]): string {
          if (parts.length === 1) return parts[0];
          if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
          return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
     }

     formatIOUXrpAmountUI(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && amount.split(' ').length === 1) {
               // XRP in drops
               return `${amount} XRP`;
          } else if (amount.split(' ').length === 2) {
               const splitAmount = amount.split(' ');
               return `${splitAmount[0]} ${splitAmount[1]}`;
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, issuer, value } = amount;
               return `${value} ${currency} (issuer: ${issuer})`;
          }

          return 'Unknown';
     }

     formatIOUXrpAmountOutstanding(amount: any): string {
          if (!amount) return 'Unknown';

          if (typeof amount === 'string' && /^[0-9]+$/.test(amount)) {
               return `${xrpl.dropsToXrp(amount)} XRP`;
          }

          if (typeof amount === 'object') {
               // Issued currency
               const { currency, value } = amount;
               return `${value} ${this.utilsService.decodeIfNeeded(currency)}`;
          }

          return `${amount} XRP`;
     }

     formatInvoiceId(invoiceId: any): string {
          return this.utilsService.formatInvoiceId(invoiceId ? invoiceId : '');
     }

     formatXrplTimestamp(timestamp: number): string {
          return this.utilsService.convertXRPLTime(timestamp);
     }

     get safeWarningMessage() {
          return this.ui.warningMessage?.replace(/</g, '&lt;').replace(/>/g, '&gt;');
     }

     private loadKnownIssuers() {
          const data = this.storageService.getKnownIssuers('knownIssuers');
          if (data) {
               this.knownTrustLinesIssuers = data;
               this.updateCurrencies();
          }
     }

     clearFields(all = true) {
          if (all) {
               this.escrowConditionField = '';
               this.escrowFulfillmentField = '';
               this.escrowCancelTimeField = '';
               this.escrowFinishTimeField = '';
          }

          this.escrowSequenceNumberField = '';
          this.escrowOwnerField = '';
          this.amountField = '';
          this.destinationTagField = '';
          this.isMemoEnabled = false;
          this.memoField = '';
          this.ticketSequence = '';
          this.isTicket = false;
          this.cdr.detectChanges();
     }

     private resetEscrowSelection() {
          this.selectedEscrow = null;
          this.escrowSequenceNumberField = '';
          this.escrowOwnerField = '';
     }

     onCurrencyChange(currency: string) {
          this.trustlineCurrency.selectCurrency(currency, this.currentWallet.address);
     }

     onIssuerChange(issuer: string) {
          this.trustlineCurrency.selectIssuer(issuer);
     }

     private refreshStoredIssuers() {
          this.storedIssuers = [];
          for (const currency in this.knownTrustLinesIssuers) {
               if (currency === 'XRP') continue;
               for (const address of this.knownTrustLinesIssuers[currency]) {
                    this.storedIssuers.push({
                         name: currency,
                         address: address,
                    });
               }
          }
          // Optional: sort by currency
          this.storedIssuers.sort((a, b) => a.name.localeCompare(b.name));
     }

     private updateCurrencies() {
          // Get all currencies except XRP
          const allCurrencies = Object.keys(this.knownTrustLinesIssuers);
          const filtered = allCurrencies.filter(c => c !== 'XRP');
          // allCurrencies.push('MPT');

          // Sort alphabetically
          this.currencies = filtered.sort((a, b) => a.localeCompare(b));

          // AUTO-SELECT FIRST CURRENCY — SAFE WAY
          if (this.currencies.length > 0) {
               // Only set if nothing is selected OR current selection is invalid/removed
               const shouldSelectFirst = !this.currencyFieldDropDownValue || !this.currencies.includes(this.currencyFieldDropDownValue);

               if (shouldSelectFirst) {
                    this.currencyFieldDropDownValue = this.currencies[0];
                    // Trigger issuer load — but do it in next tick so binding is ready
                    Promise.resolve().then(() => {
                         if (this.currencyFieldDropDownValue) {
                              this.onCurrencyChange(this.currencyFieldDropDownValue);
                         }
                    });
               }
          } else {
               // No currencies left
               this.currencyFieldDropDownValue = '';
               this.issuerFields = '';
               this.issuers = [];
          }
     }

     getCondition() {
          const { condition, fulfillment } = this.generateCondition();
          this.escrowConditionField = condition;
          this.escrowFulfillmentField = fulfillment;
     }

     generateCondition(): { condition: string; fulfillment: string } {
          console.log('Generating a cryptographic condition and fulfillment for XRPL escrow');

          // Use Web Crypto API to generate 32 random bytes
          const preimage = new Uint8Array(32);
          globalThis.crypto.getRandomValues(preimage); // Browser-compatible random bytes

          // Create a PREIMAGE-SHA-256 condition
          const fulfillment = new cc.PreimageSha256();
          fulfillment.setPreimage(Buffer.from(preimage)); // Convert Uint8Array to Buffer

          // Get the condition (hash of the preimage) in hexadecimal
          const condition = fulfillment.getConditionBinary().toString('hex').toUpperCase();

          // Get the fulfillment (preimage) in hexadecimal, to be kept secret
          const fulfillment_hex = fulfillment.serializeBinary().toString('hex').toUpperCase();

          console.log('Condition:', condition);
          console.log('Fulfillment (keep secret until ready to finish escrow):', fulfillment_hex);

          return { condition, fulfillment: fulfillment_hex };
     }

     populateDefaultDateTime() {
          if (!this.escrowCancelDateTimeField) {
               const now = new Date();

               const year = now.getFullYear();
               const month = String(now.getMonth() + 1).padStart(2, '0');
               const day = String(now.getDate()).padStart(2, '0');
               const hours = String(now.getHours()).padStart(2, '0');
               const minutes = String(now.getMinutes()).padStart(2, '0');
               const seconds = String(now.getSeconds()).padStart(2, '0');

               this.escrowCancelDateTimeField = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
          }
     }

     displayAmount(amount: any): string {
          let displayAmount;
          if (typeof amount === 'string') {
               // Native XRP escrow
               displayAmount = `${xrpl.dropsToXrp(amount)} XRP`;
          } else if (typeof amount === 'object' && amount.currency) {
               // IOU or MPT
               let currency = amount.currency;

               // Detect hex MPT currency code
               if (/^[0-9A-F]{40}$/i.test(currency)) {
                    try {
                         currency = this.utilsService.normalizeCurrencyCode(currency);
                    } catch (e) {
                         // fallback: leave as hex if decode fails
                    }
               }

               displayAmount = `${amount.value} ${currency} Issuer: <code>${amount.issuer}</code>`;
          } else {
               displayAmount = 'N/A';
          }
          return displayAmount;
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
