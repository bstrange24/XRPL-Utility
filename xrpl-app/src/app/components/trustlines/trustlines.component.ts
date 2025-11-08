import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, EventEmitter, Output, ViewChildren, QueryList, NgZone, inject, afterRenderEffect, runInInjectionContext, Injector } from '@angular/core';
import { trigger, state, style, transition, animate, group, query } from '@angular/animations';
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
declare var Prism: any;

interface ValidationInputs {
     account_info?: any;
     seed?: string;
     amount?: string;
     destination?: string;
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

@Component({
     selector: 'app-trustlines',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './trustlines.component.html',
     styleUrl: './trustlines.component.css',
})
export class TrustlinesComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     private readonly injector = inject(Injector);
     result: string = '';
     isError: boolean = false;
     isSuccess: boolean = false;
     isEditable: boolean = true;
     currencyFieldDropDownValue: string = 'CTZ';
     destinationField: string = '';
     issuerFields: string = '';
     currencyBalanceField: string = '';
     gatewayBalance: string = '';
     amountField: string = '';
     ticketSequence: string = '';
     isTicket: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     outstandingChecks: string = '';
     ownerCount: string = '';
     totalXrpReserves: string = '';
     executionTime: string = '';
     destinationTagField: string = '';
     useMultiSign: boolean = false;
     multiSignAddress: string = '';
     multiSignSeeds: string = '';
     signerQuorum: number = 0;
     multiSigningEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     memoField: string = '';
     isMemoEnabled = false;
     isRegularKeyAddress = false;
     regularKeySeed: string = '';
     regularKeyAddress: string = '';
     spinner: boolean = false;
     spinnerMessage: string = '';
     masterKeyDisabled: boolean = false;
     isSimulateEnabled: boolean = false;
     knownTrustLinesIssuers: { [key: string]: string[] } = { XRP: [] };
     issuerToRemove: string = '';
     currencies: string[] = [];
     newCurrency: string = '';
     newIssuer: string = '';
     tokenToRemove: string = '';
     showTrustlineOptions: boolean = false; // default off
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
     destinations: { name?: string; address: string }[] = [];
     issuers: { name?: string; address: string }[] = [];
     private lastCurrency: string = '';
     private lastIssuer: string = '';
     trustlineFlags: Record<string, boolean> = { ...AppConstants.TRUSTLINE.FLAGS };
     trustlineFlagList = AppConstants.TRUSTLINE.FLAG_LIST;
     flagMap = AppConstants.TRUSTLINE.FLAG_MAP;
     ledgerFlagMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;
     showManageTokens = false;
     environment: string = '';
     paymentTx: any[] = [];
     txResult: any[] = [];
     txHash: string = '';
     txHashes: string[] = [];
     activeTab = 'setTrustline'; // default
     private cachedReserves: any = null;
     successMessage: string = '';
     private isInitialLoad = true;
     encryptionType: string = '';
     hasWallets: boolean = true;
     showToast: boolean = false;
     toastMessage: string = '';
     cancellableChecks: any = [];
     cashableChecks: any = [];
     existingChecks: any = [];
     // Controls whether the panel is expanded or collapsed
     outstandingChecksCollapsed = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     warningMessage: string | null = null;

     constructor(private readonly xrplService: XrplService, private readonly utilsService: UtilsService, private readonly cdr: ChangeDetectorRef, private readonly storageService: StorageService, private readonly xrplTransactions: XrplTransactionService, private ngZone: NgZone, private walletGenerator: WalletGeneratorService, private walletManagerService: WalletManagerService) {}

     ngOnInit() {
          const storedIssuers = this.storageService.getKnownIssuers('knownIssuers');
          if (storedIssuers) {
               this.knownTrustLinesIssuers = storedIssuers;
          }
          this.updateCurrencies();
          this.currencyFieldDropDownValue = 'CTZ';
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

     onSubmit() {
          if (this.activeTab === 'setTrustline') {
               this.setTrustLine();
          } else if (this.activeTab === 'removeTrustline') {
               this.removeTrustline();
          } else if (this.activeTab === 'issueCurrency') {
               this.issueCurrency();
          } else if (this.activeTab === 'clawbackTokens') {
               this.clawbackTokens();
          }
     }

     async setTab(tab: string) {
          this.activeTab = tab;
          if (this.activeTab === 'setTrustline') {
               // const client = await this.xrplService.getClient();
               // const checkObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'check');
               // this.getCancelableChecks(checkObjects, this.currentWallet.address);
          }

          if (this.activeTab === 'removeTrustline') {
               // const client = await this.xrplService.getClient();
               // const checkObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'check');
               // this.getExistingChecks(checkObjects, this.currentWallet.address);
          }

          if (this.activeTab === 'issueCurrency') {
               // const client = await this.xrplService.getClient();
               // const checkObjects = await this.xrplService.getAccountObjects(client, this.currentWallet.address, 'validated', 'check');
               // this.getCashableChecks(checkObjects, this.currentWallet.address);
          }

          if (this.activeTab === 'clawbackTokens') {
          }

          this.toggleIssuerField();

          this.clearMessages();
          this.clearFields(true);
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
          this.walletManagerService.saveEdit(this.tempName); // ← PASS IT!
          this.tempName = '';
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

     handleTransactionResult(event: { result: string; isError: boolean; isSuccess: boolean }) {
          this.result = event.result;
          this.isError = event.isError;
          this.isSuccess = event.isSuccess;
          this.isEditable = !this.isSuccess;
          this.cdr.detectChanges();
     }

     toggleSecret(index: number) {
          this.wallets[index].showSecret = !this.wallets[index].showSecret;
          this.cdr.detectChanges();
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               await this.refreshWallets(client, [walletAddress]);
               this.cdr.detectChanges();
          } catch (err) {
               this.setError('Failed to refresh balance');
          }
     }

     copyAddress(address: string) {
          navigator.clipboard.writeText(address).then(() => {
               this.showToastMessage('Address copied to clipboard!');
          });
     }

     private showToastMessage(message: string, duration: number = 2000) {
          this.toastMessage = message;
          this.showToast = true;
          setTimeout(() => {
               this.showToast = false;
          }, duration);
     }

     copySeed(seed: string) {
          navigator.clipboard
               .writeText(seed)
               .then(() => {
                    this.showToastMessage('Seed copied to clipboard!');
               })
               .catch(err => {
                    console.error('Failed to copy seed:', err);
                    this.showToastMessage('Failed to copy. Please select and copy manually.');
               });
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
          this.updateSpinnerMessage(``);
          this.showSpinnerWithDelay('Generating new wallet', 5000);
          const faucetWallet = await this.walletGenerator.generateNewAccount(this.wallets, this.environment, this.encryptionType);
          const client = await this.xrplService.getClient();
          this.refreshWallets(client, faucetWallet.address);
          this.spinner = false;
          this.clearWarning();
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
               this.clearWarning();
               this.updateDestinations();
               await this.toggleIssuerField();
          } else if (this.currentWallet.address) {
               this.setError('Invalid XRP address');
          }
     }

     toggleOutstandingChecks() {
          this.outstandingChecksCollapsed = !this.outstandingChecksCollapsed;
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
               console.log(`ERROR getting wallet in toggleMultiSign' ${error.message}`);
               this.setError('ERROR getting wallet in toggleMultiSign');
          }
     }

     async toggleUseMultiSign() {
          if (this.multiSignAddress === 'No Multi-Sign address configured for account') {
               this.multiSignSeeds = '';
          }
     }

     toggleTicketSequence() {
          this.cdr.markForCheck();
     }

     onTicketToggle(event: any, ticket: string) {
          if (event.target.checked) {
               this.selectedTickets = [...this.selectedTickets, ticket];
          } else {
               this.selectedTickets = this.selectedTickets.filter(t => t !== ticket);
          }
     }

     onFlagChange(flag: string) {
          if (this.trustlineFlags[flag]) {
               AppConstants.TRUSTLINE.CONFLICTS[flag]?.forEach((conflict: string | number) => {
                    this.trustlineFlags[conflict] = false;
               });
          }
     }

     async getTrustlinesForAccount() {
          console.log('Entering getTrustlinesForAccount');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects, accountCurrencies] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountCurrencies(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logObjects('accountCurrencies', accountCurrencies);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    account_info: accountInfo,
               };

               const errors = await this.validateInputs(inputs, 'getTrustlinesForAccount');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Errors:\n${errors.join('\n')}`);
               }

               // Extract RippleState entries
               const rippleStates = (accountObjects.result.account_objects || []).filter(obj => obj.LedgerEntryType === 'RippleState');

               // Filter for selected currency and non-zero state
               const activeTrustLines = rippleStates.filter((line: xrpl.LedgerEntry.RippleState) => {
                    const currency = this.utilsService.decodeIfNeeded(line.Balance.currency);
                    const balance = parseFloat(line.Balance.value || '0');
                    const lowLimit = parseFloat(line.LowLimit.value || '0');
                    const highLimit = parseFloat(line.HighLimit.value || '0');

                    // Exclude fully zeroed-out trust lines
                    return currency === this.currencyFieldDropDownValue && !(balance === 0 && lowLimit === 0 && highLimit === 0);
               });

               // Build UI data structure
               const data = { sections: [] as any[] };

               // --- Trust Lines Section ---
               if (activeTrustLines.length === 0) {
                    data.sections.push({
                         title: 'Trust Lines',
                         openByDefault: true,
                         content: [
                              {
                                   key: 'Status',
                                   value: `No active trust lines found for <code>${this.currencyFieldDropDownValue}</code> and <code>${wallet.classicAddress}</code>`,
                              },
                         ],
                    });
                    this.gatewayBalance = '';
               } else {
                    const trustLineItems = activeTrustLines
                         .map((line, index) => {
                              const currency = this.utilsService.decodeIfNeeded(line.Balance.currency);
                              const isLow = wallet.classicAddress === line.LowLimit.issuer;
                              const isHigh = wallet.classicAddress === line.HighLimit.issuer;

                              if (!isLow && !isHigh) return null; // Should not happen

                              const counterparty = isLow ? line.HighLimit.issuer : line.LowLimit.issuer;
                              const ourLimit = isLow ? line.LowLimit.value : line.HighLimit.value;
                              const theirLimit = isLow ? line.HighLimit.value : line.LowLimit.value;

                              // Correct balance interpretation:
                              // Balance is from Low -> High
                              // So if we are Low, positive balance = we owe
                              // If we are High, positive balance = they owe us → our balance is +value
                              let ourBalance = parseFloat(line.Balance.value);
                              if (isHigh) {
                                   ourBalance = -ourBalance; // We are debtor → negative balance from our POV
                              }
                              // If we are High, ourBalance stays positive (they owe us)

                              return {
                                   key: `Trust Line ${index + 1} (${currency}, Counterparty: ${counterparty})`,
                                   openByDefault: false,
                                   content: [
                                        { key: 'Currency', value: currency },
                                        { key: 'Your Balance', value: `${this.utilsService.formatTokenBalance(ourBalance.toString(), 2)} ${currency}` },
                                        { key: 'Your Limit', value: ourLimit },
                                        { key: 'Counterparty', value: `<code>${counterparty}</code>` },
                                        { key: 'Counterparty Limit', value: theirLimit },
                                        { key: 'Flags', value: this.decodeRippleStateFlags(line.Flags).join(', ') || 'None' },
                                   ],
                              };
                         })
                         .filter(Boolean);

                    data.sections.push({
                         title: `Trust Lines (${activeTrustLines.length})`,
                         openByDefault: true,
                         subItems: trustLineItems,
                    });
               }

               this.setSuccess(this.result);

               // --- Defer: Fetch additional data and enhance UI ---
               setTimeout(async () => {
                    try {
                         const tokenBalance = await this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '');

                         // Add Obligations
                         if (tokenBalance.result.obligations && Object.keys(tokenBalance.result.obligations).length > 0) {
                              data.sections.push({
                                   title: `Obligations (${Object.keys(tokenBalance.result.obligations).length})`,
                                   openByDefault: true,
                                   subItems: Object.entries(tokenBalance.result.obligations).map(([currency, amount], i) => ({
                                        key: `Obligation ${i + 1} (${this.utilsService.decodeIfNeeded(currency)})`,
                                        openByDefault: false,
                                        content: [
                                             { key: 'Currency', value: this.utilsService.decodeIfNeeded(currency) },
                                             { key: 'Amount', value: this.utilsService.formatTokenBalance(amount.toString(), 18) },
                                        ],
                                   })),
                              });
                         }

                         // Add Balances
                         if (tokenBalance.result.assets && Object.keys(tokenBalance.result.assets).length > 0) {
                              const balanceItems = [];
                              for (const [issuer, currencies] of Object.entries(tokenBalance.result.assets)) {
                                   for (const { currency, value } of currencies) {
                                        const displayCurrency = this.utilsService.formatCurrencyForDisplay(currency);
                                        balanceItems.push({
                                             key: `${displayCurrency} from ${issuer.slice(0, 8)}...`,
                                             openByDefault: false,
                                             content: [
                                                  { key: 'Currency', value: displayCurrency },
                                                  { key: 'Issuer', value: `<code>${issuer}</code>` },
                                                  { key: 'Amount', value: this.utilsService.formatTokenBalance(value, 2) },
                                             ],
                                        });
                                   }
                              }
                              data.sections.push({
                                   title: `Balances (${balanceItems.length})`,
                                   openByDefault: true,
                                   subItems: balanceItems,
                              });
                         }

                         // Add Account Currencies
                         // const { receive, send } = this.processAccountCurrencies(accountCurrencies);
                         // if (receive.length > 0) {
                         //      data.sections.push({
                         //           title: 'Received Currencies',
                         //           openByDefault: true,
                         //           content: [{ key: 'Status', value: receive.join(', ') }],
                         //      });
                         // }
                         // if (send.length > 0) {
                         //      data.sections.push({
                         //           title: 'Sent Currencies',
                         //           openByDefault: true,
                         //           content: [{ key: 'Status', value: send.join(', ') }],
                         //      });
                         // }

                         // Update balance field
                         const parsedBalances = this.parseAllGatewayBalances(tokenBalance, wallet);
                         this.currencyBalanceField = parsedBalances?.[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';

                         // Final UI sync
                         this.refreshUIData(wallet, accountInfo, accountObjects);
                         this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                         this.clearFields(false);
                         this.updateTrustLineFlagsInUI(accountObjects, wallet);
                         this.updateTickets(accountObjects);
                    } catch (err) {
                         console.error('Failed to load extended token data:', err);
                         this.setError('Partial data loaded. Failed to fetch full token balances.');
                    }
               }, 0);
          } catch (error: any) {
               console.error('Error in getTrustlinesForAccount:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getTrustlinesForAccount in ${this.executionTime}ms`);
          }
     }

     async setTrustLine() {
          console.log('Entering setTrustLine');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
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
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, fee, currentLedger, accountLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               this.utilsService.logObjects(`accountLines`, accountLines);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'setTrustLine');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               if (this.trustlineFlags['tfSetNoRipple'] && this.trustlineFlags['tfClearNoRipple']) {
                    return this.setError('ERROR: Cannot set both tfSetNoRipple and tfClearNoRipple');
               }
               if (this.trustlineFlags['tfSetFreeze'] && this.trustlineFlags['tfClearFreeze']) {
                    return this.setError('ERROR: Cannot set both tfSetFreeze and tfClearFreeze');
               }

               let currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               if (!/^[A-Z0-9]{3}$|^[0-9A-Fa-f]{40}$/.test(currencyFieldTemp)) {
                    throw new Error('Invalid currency code. Must be a 3-character code (e.g., USDC) or 40-character hex.');
               }

               // Calculate flags
               // let flags = 0;
               // Object.entries(this.trustlineFlags).forEach(([key, value]) => {
               //      if (value) {
               //           flags |= AppConstants.TRUSTLINE.FLAG_MAP[key as keyof typeof AppConstants.TRUSTLINE.FLAG_MAP];
               //      }
               // });

               let trustSetTx: xrpl.TrustSet = {
                    TransactionType: 'TrustSet',
                    Account: wallet.classicAddress,
                    LimitAmount: {
                         currency: currencyFieldTemp,
                         issuer: this.issuerFields,
                         value: this.amountField,
                    },
                    // Flags: flags,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, trustSetTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Setting Trustline (no changes will be made)...' : 'Submitting to Ledger...', 200);

               this.paymentTx.push(trustSetTx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, trustSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, trustSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txResult.push(response.result);
               this.updateTxResult(this.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.setError(userMessage);
               } else {
                    this.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.isSimulateEnabled) {
                    this.successMessage = 'Trustline set successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    // Filter specific types using the helper
                    const checkObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['Check']);
                    this.utilsService.logObjects('checkObjects', checkObjects);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.getExistingChecks(checkObjects, wallet.classicAddress);
                    await this.refreshWallets(client, [wallet.classicAddress ?? wallet.address, this.destinationField]);

                    setTimeout(async () => {
                         try {
                              this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = 'Simulated Trustline set successfully!';
               }
          } catch (error: any) {
               console.error('Error in setTrustLine:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setTrustLine in ${this.executionTime}ms`);
          }
     }

     async removeTrustline() {
          console.log('Entering removeTrustline');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
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
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, serverInfo, fee, currentLedger] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client)]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'removeTrustline');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               if (this.trustlineFlags['tfSetNoRipple'] && this.trustlineFlags['tfClearNoRipple']) {
                    return this.setError('ERROR: Cannot set both tfSetNoRipple and tfClearNoRipple');
               }
               if (this.trustlineFlags['tfSetFreeze'] && this.trustlineFlags['tfClearFreeze']) {
                    return this.setError('ERROR: Cannot set both tfSetFreeze and tfClearFreeze');
               }

               const trustLines = await this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', '');
               this.utilsService.logObjects('trustLines', trustLines);

               const trustLine = trustLines.result.lines.find((line: any) => {
                    const lineCurrency = this.utilsService.decodeIfNeeded(line.currency);
                    return line.account === this.issuerFields && lineCurrency === this.currencyFieldDropDownValue;
               });

               if (!trustLine) {
                    // this.resultField.nativeElement.innerHTML = `No trust line found for ${this.currencyFieldDropDownValue} to issuer ${this.destinationField}`;
                    // this.resultField.nativeElement.classList.add('error');
                    this.setErrorProperties();
                    return;
               }

               // Validate all trustlines are removable
               for (const line of trustLines.result.lines) {
                    const check = this.canRemoveTrustline(line);
                    if (!check.canRemove) {
                         return this.setError(`Cannot remove trustline ${line.currency}/${line.account}: ${check.reasons}`);
                    }
               }

               let currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               // let flags = 0;
               // Object.entries(this.trustlineFlags).forEach(([key, value]) => {
               //      if (value) {
               //           flags |= AppConstants.TRUSTLINE.FLAG_MAP[key as keyof typeof AppConstants.TRUSTLINE.FLAG_MAP];
               //      }
               // });

               const trustSetTx: xrpl.TrustSet = {
                    TransactionType: 'TrustSet',
                    Account: wallet.classicAddress,
                    LimitAmount: {
                         currency: currencyFieldTemp,
                         issuer: this.issuerFields,
                         value: '0',
                    },
                    // Flags: 0,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               // trustSetTx.Flags = xrpl.TrustSetFlags.tfClearNoRipple | xrpl.TrustSetFlags.tfClearFreeze;
               // trustSetTx.Flags = flags;
               // delete trustSetTx.Flags; // Removing trustline — no flags needed

               await this.setTxOptionalFields(client, trustSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, trustSetTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Removing Trustline (no changes will be made)...' : 'Submitting to Ledger...', 200);

               // STORE IT FOR DISPLAY
               this.paymentTx.push(trustSetTx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, trustSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, trustSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.setError('ERROR: Failed to sign transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txResult.push(response.result);
               this.updateTxResult(this.txResult);

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.setError(userMessage);
               } else {
                    this.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.isSimulateEnabled) {
                    this.successMessage = 'Trustline removed successfully!';
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
                    // Filter specific types using the helper
                    const checkObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['Check']);
                    this.utilsService.logObjects('checkObjects', checkObjects);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    this.getCashableChecks(checkObjects, wallet.classicAddress ?? wallet.address);
                    this.getExistingChecks(checkObjects, wallet.classicAddress ?? wallet.address);

                    await this.refreshWallets(client, [wallet.classicAddress ?? wallet.address, this.destinationField]);

                    setTimeout(async () => {
                         try {
                              this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = 'Simulated Trustline removal successfully!';
               }
          } catch (error: any) {
               console.error('Error in removeTrustline:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving removeTrustline in ${this.executionTime}ms`);
          }
     }

     async issueCurrency() {
          console.log('Entering issueCurrency');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               destinationTag: this.destinationTagField,
               amount: this.amountField,
               destination: this.destinationField,
               isRegularKeyAddress: this.isRegularKeyAddress,
               useMultiSign: this.useMultiSign,
               regularKeyAddress: this.isRegularKeyAddress ? this.regularKeyAddress : undefined,
               regularKeySeed: this.isRegularKeyAddress ? this.regularKeySeed : undefined,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedTicket: this.selectedTicket,
               selectedSingleTicket: this.selectedSingleTicket,
          };

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               let [accountInfo, fee, lastLedgerIndex, trustLines, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, lastLedgerIndex, serverInfo);
               this.utilsService.logObjects('trustLines', trustLines);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'issueCurrency');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

               const accountFlags = accountInfo.result.account_data.Flags;
               const asfDefaultRipple = 0x00800000;
               let data: { sections: any[] } = { sections: [] };

               if ((accountFlags & asfDefaultRipple) === 0) {
                    // Need to enable DefaultRipple first
                    const accountSetTx: xrpl.AccountSet = {
                         TransactionType: 'AccountSet',
                         Account: wallet.classicAddress,
                         SetFlag: 8, // asfDefaultRipple
                         Fee: fee,
                         LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
                    };

                    await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                         return this.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    let response: any;

                    if (this.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
                    } else {
                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              return this.setError('ERROR: Failed to sign AccountSet transaction.');
                         }

                         const response = await this.xrplTransactions.submitTransaction(client, signedTx);

                         const isSuccess = this.utilsService.isTxSuccessful(response);
                         if (!isSuccess) {
                              const resultMsg = this.utilsService.getTransactionResultMessage(response);
                              const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                              console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                              (response.result as any).errorMessage = userMessage;
                         }

                         data.sections.push({
                              title: 'DefaultRipple Enabled',
                              openByDefault: true,
                              content: [{ key: 'Status', value: `Enabled via AccountSet transaction for <code>${wallet.classicAddress}</code>` }],
                         });
                    }
                    // Update lastLedgerIndex for next transaction
                    lastLedgerIndex = await this.xrplService.getLastLedgerIndex(client);
               }

               // PHASE 4: Prepare Payment transaction for currency issuance
               const curr = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               const paymentTx: xrpl.Payment = {
                    TransactionType: 'Payment',
                    Account: wallet.classicAddress,
                    Destination: this.destinationField,
                    Amount: {
                         currency: curr,
                         value: this.amountField,
                         issuer: this.issuerFields,
                    },
                    Fee: fee,
                    LastLedgerSequence: lastLedgerIndex + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, paymentTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, paymentTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               // if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, paymentTx, this.destinationField)) {
               //      return this.setError('ERROR: Not enough IOU balance for this transaction');
               // }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Currency Issuance (no changes will be made)...' : 'Submitting Currency Issuance to Ledger...', 200);

               // STORE IT FOR DISPLAY
               this.paymentTx.push(paymentTx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, paymentTx);
               } else {
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, paymentTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               this.utilsService.logObjects('response', response);
               this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

               this.txResult.push(response.result);
               this.updateTxResult(this.txResult);
               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
                    this.setError(userMessage);
               } else {
                    this.setSuccess(this.result);
               }

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.isSimulateEnabled) {
                    // // Fetch updated trust lines and gateway balances in parallel
                    // const [updatedTrustLines, gatewayBalances, newBalance] = await Promise.all([this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', ''), client.getXrpBalance(wallet.classicAddress)]);

                    // // Add New Balance section
                    // const decodedCurrency = this.utilsService.decodeIfNeeded(this.currencyFieldDropDownValue);
                    // const newTrustLine = updatedTrustLines.result.lines.find((line: any) => line.currency === decodedCurrency && (line.account === this.destinationField || line.account === this.destinationField));

                    // // Optional: Avoid heavy stringify in logs
                    // console.debug(`updatedTrustLines :`, updatedTrustLines.result);
                    // console.debug(`newTrustLine :`, newTrustLine);
                    // console.debug(`gatewayBalances :`, gatewayBalances.result);

                    // data.sections.push({
                    //      title: 'New Balance',
                    //      openByDefault: true,
                    //      content: [
                    //           { key: 'Destination', value: `<code>${this.destinationField}</code>` },
                    //           { key: 'Currency', value: this.currencyFieldDropDownValue },
                    //           { key: 'Balance', value: newTrustLine ? this.utilsService.formatTokenBalance(newTrustLine.balance.toString(), 2) : 'Unknown' },
                    //      ],
                    // });

                    // Add Issuer Obligations section
                    // if (gatewayBalances.result.obligations && Object.keys(gatewayBalances.result.obligations).length > 0) {
                    //      data.sections.push({
                    //           title: `Issuer Obligations (${Object.keys(gatewayBalances.result.obligations).length})`,
                    //           openByDefault: true,
                    //           subItems: Object.entries(gatewayBalances.result.obligations).map(([oblCurrency, amount], index) => ({
                    //                key: `Obligation ${index + 1} (${oblCurrency})`,
                    //                openByDefault: false,
                    //                content: [
                    //                     { key: 'Currency', value: oblCurrency },
                    //                     { key: 'Amount', value: this.utilsService.formatTokenBalance(amount.toString(), 2) },
                    //                ],
                    //           })),
                    //      });
                    // } else {
                    //      data.sections.push({
                    //           title: 'Issuer Obligations',
                    //           openByDefault: true,
                    //           content: [{ key: 'Status', value: 'No obligations issued' }],
                    //      });
                    // }

                    // Add Account Details section
                    // data.sections.push({
                    //      title: 'Account Details',
                    //      openByDefault: true,
                    //      content: [
                    //           { key: 'Issuer Address', value: `<code>${wallet.classicAddress}</code>` },
                    //           { key: 'Destination Address', value: `<code>${this.destinationField}</code>` },
                    //           { key: 'XRP Balance (Issuer)', value: this.utilsService.formatTokenBalance(newBalance.toString(), 2) },
                    //           { key: 'XRP Balance (Issuer)', value: (await client.getXrpBalance(wallet.classicAddress)).toString() },
                    //      ],
                    // });

                    (response.result as any).clearInnerHtml = false;
                    this.setSuccess(this.result);

                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalances] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

                    // Filter specific types using the helper
                    const checkObjects = this.xrplService.filterAccountObjectsByTypes(updatedAccountObjects, ['Check']);
                    this.utilsService.logObjects('checkObjects', checkObjects);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    this.getCancelableChecks(checkObjects, wallet.classicAddress ?? wallet.address);
                    this.getExistingChecks(checkObjects, wallet.classicAddress);

                    await this.refreshWallets(client, [wallet.classicAddress ?? wallet.address]);

                    setTimeout(async () => {
                         try {
                              await this.updateCurrencyBalance(gatewayBalances, wallet);
                              // this.updateGatewayBalance(gatewayBalances, wallet);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = 'Simulated Issued currency successfully!';
               }
          } catch (error: any) {
               console.error('Error in issueCurrency:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving issueCurrency in ${this.executionTime}ms`);
          }
     }

     async clawbackTokens() {
          console.log('Entering clawbackTokens');
          const startTime = Date.now();
          this.setSuccessProperties();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               seed: this.currentWallet.seed,
               amount: this.amountField,
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
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects, trustLines, serverInfo, fee, currentLedger] = await Promise.all([
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountLines(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getXrplServerInfo(client, 'current', ''),
                    this.xrplService.calculateTransactionFee(client),
                    this.xrplService.getLastLedgerIndex(client),
               ]);

               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);
               this.utilsService.logObjects('trustLines', trustLines);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'clawbackTokens');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const currencyFieldTemp = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               if (!/^[A-Z0-9]{3}$|^[0-9A-Fa-f]{40}$/.test(currencyFieldTemp)) {
                    throw new Error('Invalid currency code. Must be a 3-character code (e.g., USDC) or 40-character hex.');
               }

               let clawbackTx: xrpl.Clawback = {
                    TransactionType: 'Clawback',
                    Account: wallet.classicAddress,
                    Amount: {
                         currency: currencyFieldTemp,
                         issuer: this.destinationField,
                         value: this.amountField,
                    },
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, clawbackTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, clawbackTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               if (this.utilsService.isInsufficientIouTrustlineBalance(trustLines, clawbackTx, this.destinationField)) {
                    return this.setError('ERROR: Not enough IOU balance for this transaction');
               }

               this.updateSpinnerMessage(this.isSimulateEnabled ? 'Simulating Token Clawback (no tokens will be moved)...' : 'Submitting Clawback to Ledger...');

               let response;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, clawbackTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, clawbackTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.setError('ERROR: Failed to sign transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
               }

               const isSuccess = this.utilsService.isTxSuccessful(response);
               if (!isSuccess) {
                    const resultMsg = this.utilsService.getTransactionResultMessage(response);
                    const userMessage = 'Transaction failed.\n' + this.utilsService.processErrorMessageFromLedger(resultMsg);

                    console.error(`Transaction ${this.isSimulateEnabled ? 'simulation' : 'submission'} failed: ${resultMsg}`, response);
                    (response.result as any).errorMessage = userMessage;
               }

               this.setSuccess(this.result);

               if (!this.isSimulateEnabled) {
                    const [updatedAccountInfo, updatedAccountObjects, gatewayBalancePromise] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);
                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);

                    setTimeout(async () => {
                         try {
                              await this.updateCurrencyBalance(gatewayBalancePromise, wallet);
                              // this.updateGatewayBalance(gatewayBalancePromise, wallet);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               }
          } catch (error: any) {
               console.error('Error in clawbackTokens:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving clawbackTokens in ${this.executionTime}ms`);
          }
     }

     async toggleIssuerField(): Promise<void> {
          console.log('Entering toggleIssuerField');
          const startTime = Date.now();

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [gatewayBalances] = await Promise.all([this.xrplService.getTokenBalance(client, wallet.classicAddress, 'validated', '')]);

               let balanceTotal = 0;
               const currency = this.utilsService.formatCurrencyForDisplay(this.currencyFieldDropDownValue);

               if (gatewayBalances.result.assets) {
                    for (const [issuer, currencies] of Object.entries(gatewayBalances.result.assets)) {
                         for (const { currency: cur, value } of currencies) {
                              if (this.utilsService.formatCurrencyForDisplay(cur) === currency) {
                                   balanceTotal += Number(value);
                              }
                         }
                    }
               }

               this.gatewayBalance = this.utilsService.formatTokenBalance(balanceTotal.toString(), 18);

               const encodedCurr = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
               const issuerPromises = this.wallets
                    .filter(w => xrpl.isValidAddress(w.address))
                    .map(async w => {
                         try {
                              const tokenBalance = await this.xrplService.getTokenBalance(client, w.address, 'validated', '');
                              const hasObligation = tokenBalance.result.obligations?.[encodedCurr];

                              if (hasObligation && hasObligation !== '0') {
                                   return { name: w.name, address: w.address };
                              } else if (w.isIssuer === true) {
                                   return { name: w.name, address: w.address };
                              }
                         } catch (err) {
                              console.warn(`Issuer check failed for ${w.address}:`, err);
                         }
                         return null;
                    });

               const issuerResults = await Promise.all(issuerPromises);

               // Step 1: filter out nulls
               const nonNullIssuers = issuerResults.filter((i): i is { name: string; address: string } => {
                    const isValid = i !== null;
                    console.debug('Filtering null:', i, '->', isValid);
                    return isValid;
               });

               // Step 2: remove duplicates by address
               const uniqueIssuers = nonNullIssuers.filter((candidate, index, self) => {
                    const firstIndex = self.findIndex(c => c.address === candidate.address);
                    const isUnique = index === firstIndex;
                    console.debug('Checking uniqueness:', candidate, 'Index:', index, 'First index:', firstIndex, 'Unique?', isUnique);
                    return isUnique;
               });

               console.debug('Unique issuers:', uniqueIssuers);

               this.issuers = uniqueIssuers;

               const knownIssuers = this.knownTrustLinesIssuers[this.currencyFieldDropDownValue] || [];

               if (!this.issuerFields || !this.issuers.some(iss => iss.address === this.issuerFields)) {
                    let newIssuer = '';

                    // Find the first matching known issuer that exists in available issuers
                    const matchedKnownIssuer = knownIssuers.find(known => this.issuers.some(iss => iss.address === known));

                    if (matchedKnownIssuer) {
                         newIssuer = matchedKnownIssuer;
                    } else if (this.issuers.length > 0) {
                         newIssuer = this.issuers[0].address;
                    } else {
                         newIssuer = '';
                    }

                    this.issuerFields = newIssuer;
               }

               if (this.issuers.length === 0) {
                    console.warn(`No issuers found among wallets for currency: ${this.currencyFieldDropDownValue}`);
               }

               this.ensureDefaultNotSelected();

               await this.updateCurrencyBalance(gatewayBalances, wallet);

               const currencyChanged = this.lastCurrency !== this.currencyFieldDropDownValue;
               const issuerChanged = this.lastIssuer !== this.issuerFields;
               if (currencyChanged || issuerChanged) {
                    this.lastCurrency = this.currencyFieldDropDownValue;
                    this.lastIssuer = this.issuerFields;
               }

               // ✅ Only call getTrustlinesForAccount after the first load
               if (!this.isInitialLoad) {
                    await this.getTrustlinesForAccount();
               } else {
                    this.isInitialLoad = false; // mark that we've completed the first load
                    await this.getTrustlinesForAccount(); // Explicitly call for initial load
               }
               // await this.getTrustlinesForAccount();
          } catch (error: any) {
               this.currencyBalanceField = '0';
               this.gatewayBalance = '0';
               console.error('Error in toggleIssuerField:', error);
               this.setError(`ERROR: Failed to fetch balance - ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               console.log(`Leaving toggleIssuerField in ${(Date.now() - startTime).toString()}ms`);
          }
     }

     private async setTxOptionalFields(client: xrpl.Client, trustSetTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          try {
               if (this.selectedSingleTicket) {
                    const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
                    if (!ticketExists) {
                         // return this.setError(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
                         throw `ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`;
                    }
                    this.utilsService.setTicketSequence(trustSetTx, this.selectedSingleTicket, true);
               } else {
                    if (this.multiSelectMode && this.selectedTickets.length > 0) {
                         console.log('Setting multiple tickets:', this.selectedTickets);
                         this.utilsService.setTicketSequence(trustSetTx, accountInfo.result.account_data.Sequence, false);
                    }
               }

               if (this.destinationTagField && parseInt(this.destinationTagField) > 0) {
                    this.utilsService.setDestinationTag(trustSetTx, this.destinationTagField);
               }
               if (this.memoField) {
                    this.utilsService.setMemoField(trustSetTx, this.memoField);
               }
          } catch (error: any) {
               throw new Error(error.message);
          }
     }

     private getExistingChecks(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          this.existingChecks = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Account === classicAddress)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';
                    let currency = '';

                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = sendMax.value;
                         currency = this.utilsService.normalizeCurrencyCode(sendMax.currency);
                    }

                    return {
                         id: obj.index,
                         amount: `${amount} ${currency}`,
                         destination: obj.Destination,
                         sendMax,
                         expiration: obj.Expiration,
                         destinationTag: obj.DestinationTag,
                         sourceTag: obj.SourceTag,
                         invoiceId: obj.InvoiceID,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          this.utilsService.logObjects('existingChecks', this.existingChecks);
     }

     private getCashableChecks(checkObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          this.cashableChecks = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Destination === classicAddress)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';
                    if (typeof sendMax === 'string') {
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }
                    return {
                         id: obj.index,
                         amount,
                         sender: obj.Account,
                         sendMax,
                    };
               })
               .sort((a, b) => a.sender.localeCompare(b.sender));
          this.utilsService.logObjects('cashableChecks', this.cashableChecks);
     }

     private getCancelableChecks(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          this.cancellableChecks = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Check' && obj.Account === sender)
               .map((obj: any) => {
                    const sendMax = obj.SendMax;
                    let amount = '0';

                    if (typeof sendMax === 'string') {
                         // XRP (drops)
                         amount = String(xrpl.dropsToXrp(sendMax));
                    } else if (sendMax?.value) {
                         // IOU
                         amount = `${sendMax.value} ${this.utilsService.normalizeCurrencyCode(sendMax.currency)}`;
                    }

                    return {
                         id: obj.index, // <-- CheckID
                         amount,
                         destination: obj.Destination,
                         sendMax,
                    };
               })
               .sort((a, b) => a.destination.localeCompare(b.destination));
          this.utilsService.logObjects('cancellableChecks', this.cancellableChecks);
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
          console.log('Entering refreshWallets');
          const REFRESH_THRESHOLD_MS = 3000;
          const now = Date.now();

          try {
               // Determine which wallets to refresh
               const walletsToUpdate = this.wallets.filter(w => {
                    const needsUpdate = !w.lastUpdated || now - w.lastUpdated > REFRESH_THRESHOLD_MS;
                    const inFilter = addressesToRefresh ? addressesToRefresh.includes(w.classicAddress ?? w.address) : true;
                    return needsUpdate && inFilter;
               });

               if (!walletsToUpdate.length) {
                    console.debug('No wallets need updating.');
                    return;
               }

               console.debug(`Refreshing ${walletsToUpdate.length} wallet(s)...`);

               //Fetch all accountInfo data in parallel (faster, single request per wallet)
               const accountInfos = await Promise.all(walletsToUpdate.map(w => this.xrplService.getAccountInfo(client, w.classicAddress ?? w.address, 'validated', '')));

               //Cache reserves (only once per session)
               if (!this.cachedReserves) {
                    this.cachedReserves = await this.utilsService.getXrplReserve(client);
                    console.debug('Cached XRPL reserve data:', this.cachedReserves);
               }

               // Heavy computation outside Angular (no UI reflows)
               this.ngZone.runOutsideAngular(async () => {
                    const updatedWallets = await Promise.all(
                         walletsToUpdate.map(async (wallet, i) => {
                              try {
                                   const accountInfo = accountInfos[i];
                                   const address = wallet.classicAddress ?? wallet.address;

                                   // --- Derive balance directly from accountInfo to avoid extra ledger call ---
                                   const balanceInDrops = String(accountInfo.result.account_data.Balance);
                                   const balanceXrp = xrpl.dropsToXrp(balanceInDrops); // returns string

                                   // --- Get ownerCount + total reserve ---
                                   const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, address);

                                   const spendable = parseFloat(String(balanceXrp)) - parseFloat(String(totalXrpReserves || '0'));

                                   return {
                                        ...wallet,
                                        ownerCount,
                                        xrpReserves: totalXrpReserves,
                                        balance: spendable.toFixed(6),
                                        spendableXrp: spendable.toFixed(6),
                                        lastUpdated: now,
                                   };
                              } catch (err) {
                                   console.error(`Error updating wallet ${wallet.address}:`, err);
                                   return wallet;
                              }
                         })
                    );

                    console.log('updatedWallets', updatedWallets);
                    // Apply updates inside Angular (UI updates + service sync)
                    this.ngZone.run(() => {
                         updatedWallets.forEach(updated => {
                              const idx = this.wallets.findIndex(existing => (existing.classicAddress ?? existing.address) === (updated.classicAddress ?? updated.address));
                              if (idx !== -1) {
                                   this.walletManagerService.updateWallet(idx, updated);
                              }
                         });
                         // Ensure Selected Account Summary refreshes
                         if (this.selectedWalletIndex !== null && this.wallets[this.selectedWalletIndex]) {
                              this.currentWallet = { ...this.wallets[this.selectedWalletIndex] };
                         }
                    });
               });
          } catch (error: any) {
               console.error('Error in refreshWallets:', error);
          } finally {
               this.executionTime = (Date.now() - now).toString();
               console.log(`Leaving refreshWallets in ${this.executionTime}ms`);
          }
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

     private updateTrustLineFlagsInUI(accountObjects: xrpl.AccountObjectsResponse, wallet: xrpl.Wallet) {
          const currency = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue ? this.currencyFieldDropDownValue : '');

          const rippleState = accountObjects.result.account_objects.find(obj => obj.LedgerEntryType === 'RippleState' && obj.Balance && obj.Balance.currency === currency) as xrpl.LedgerEntry.RippleState | undefined;

          if (rippleState) {
               this.debugTrustlineFlags(rippleState, wallet);
               const flagsNumber: number = rippleState.Flags ?? 0;

               // Correct way: check if your wallet is the low side
               const isLowAddress = wallet.classicAddress === rippleState.LowLimit.issuer;

               if (isLowAddress) {
                    this.trustlineFlags['tfSetfAuth'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfLowAuth);
                    this.trustlineFlags['tfSetNoRipple'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfNoRipple); // Adjusted key
                    this.trustlineFlags['tfSetFreeze'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfLowFreeze);
               } else {
                    this.trustlineFlags['tfSetfAuth'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfHighAuth);
                    this.trustlineFlags['tfSetNoRipple'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfNoRipple); // Adjusted for high (note: constants may need lsfHighNoRipple: 0x00200000)
                    this.trustlineFlags['tfSetFreeze'] = !!(flagsNumber & AppConstants.TRUSTLINE.LEDGER_FLAG_MAP.lsfHighFreeze);
               }

               // Clear flags are just inverses
               this.trustlineFlags['tfClearNoRipple'] = !this.trustlineFlags['tfSetNoRipple'];
               this.trustlineFlags['tfClearFreeze'] = !this.trustlineFlags['tfSetFreeze'];

               // Not applicable for trustlines
               this.trustlineFlags['tfPartialPayment'] = false;
               this.trustlineFlags['tfNoDirectRipple'] = false;
               this.trustlineFlags['tfLimitQuality'] = false;

               this.showTrustlineOptions = true;
          } else {
               // No trustline → reset UI
               this.trustlineFlags = { ...AppConstants.TRUSTLINE.FLAGS };
               this.showTrustlineOptions = false;
          }
     }

     private debugTrustlineFlags(rippleState: xrpl.LedgerEntry.RippleState, wallet: xrpl.Wallet) {
          const flagsNumber: number = rippleState.Flags ?? 0;
          const isLowAddress = wallet.classicAddress === rippleState.LowLimit.issuer;
          const ledgerMap = AppConstants.TRUSTLINE.LEDGER_FLAG_MAP;

          console.debug('Trustline Debug\n -----------------------------------------');
          console.debug('Currency:', rippleState.Balance.currency);
          console.debug('You are the', isLowAddress ? 'LOW side' : 'HIGH side');
          console.debug('Flags (decimal):', flagsNumber, ' hex:', '0x' + flagsNumber.toString(16));

          if (isLowAddress) {
               console.debug('LowAuth:', !!(flagsNumber & ledgerMap.lsfLowAuth));
               console.debug('LowNoRipple:', !!(flagsNumber & ledgerMap.lsfNoRipple)); // Adjusted
               console.debug('LowFreeze:', !!(flagsNumber & ledgerMap.lsfLowFreeze));
          } else {
               console.debug('HighAuth:', !!(flagsNumber & ledgerMap.lsfHighAuth));
               console.debug('HighNoRipple:', !!(flagsNumber & ledgerMap.lsfNoRipple)); // Adjusted
               console.debug('HighFreeze:', !!(flagsNumber & ledgerMap.lsfHighFreeze));
          }
          console.debug('-----------------------------------------');
     }

     private decodeRippleStateFlags(flags: number): string[] {
          return Object.entries(AppConstants.TRUSTLINE.LEDGER_FLAG_MAP)
               .filter(([_, bit]) => (flags & bit) !== 0)
               .map(([name]) => name);
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
                    return `${fieldName} must be a valid number`;
               }
               if (minValue !== undefined && num <= minValue) {
                    return `${fieldName} must be greater than ${minValue}`;
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

          const validateMultiSign = (addressesStr: string | undefined, seedsStr: string | undefined): string | null => {
               if (!addressesStr || !seedsStr) return null;
               const addresses = this.utilsService.getMultiSignAddress(addressesStr);
               const seeds = this.utilsService.getMultiSignSeeds(seedsStr);
               if (addresses.length === 0) {
                    return 'At least one signer address is required for multi-signing';
               }
               if (addresses.length !== seeds.length) {
                    return 'Number of signer addresses must match number of signer seeds';
               }
               const invalidAddr = addresses.find((addr: string) => !xrpl.isValidAddress(addr));
               if (invalidAddr) {
                    return `Invalid signer address: ${invalidAddr}`;
               }
               const invalidSeed = seeds.find((seed: string) => !xrpl.isValidSecret(seed));
               if (invalidSeed) {
                    return 'One or more signer seeds are invalid';
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
                         return `Receiver requires a Destination Tag for payment.`;
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
               getTrustlinesForAccount: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null)],
                    asyncValidators: [],
               },
               setTrustLine: {
                    required: ['seed', 'amount', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [],
               },
               removeTrustline: {
                    required: ['seed', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0),
                         () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         () => (inputs.isRegularKeyAddress && !inputs.useMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
                    asyncValidators: [],
               },
               issueCurrency: {
                    required: ['seed', 'amount', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0, true), // Allow empty
                         () => isNotSelfPayment(this.currentWallet.address, inputs.destination),
                         () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
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
               toggleIssuerField: {
                    required: ['seed'],
                    customValidators: [() => isValidSeed(inputs.seed), () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null)],
                    asyncValidators: [],
               },
               clawbackTokens: {
                    required: ['seed', 'amount', 'destination'],
                    customValidators: [
                         () => isValidSeed(inputs.seed),
                         () => isValidNumber(inputs.amount, 'Amount', 0),
                         () => isValidXrpAddress(inputs.destination, 'Destination'),
                         () => isValidNumber(inputs.destinationTag, 'Destination Tag', 0, true), // Allow empty
                         () => isNotSelfPayment(this.currentWallet.address, inputs.destination),
                         () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.useMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
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

          if (errors.length === 0 && inputs.useMultiSign && (inputs.multiSignAddresses === 'No Multi-Sign address configured for account' || inputs.multiSignSeeds === '')) {
               errors.push('At least one signer address is required for multi-signing');
          }

          const regAddrErr = isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address');
          if (regAddrErr && inputs.regularKeyAddress !== 'No RegularKey configured for account') errors.push(regAddrErr);

          const regSeedErr = isValidSecret(inputs.regularKeySeed, 'Regular Key Seed');
          if (regSeedErr) errors.push(regSeedErr);

          return errors;
     }

     updateDestinations() {
          this.destinations = this.wallets.map(w => ({ name: w.name, address: w.address }));
          this.issuers = this.wallets.map(w => ({ name: w.name, address: w.address }));
          this.ensureDefaultNotSelected();
          this.cdr.detectChanges();
     }

     onTokenChange(): void {
          const issuers = this.knownTrustLinesIssuers[this.tokenToRemove] || [];

          if (issuers.length > 0) {
               // Auto-select the first issuer
               this.issuerToRemove = issuers[0];
          } else {
               // No issuers found
               this.issuerToRemove = '';
          }
     }

     get currencyOptions(): string[] {
          return Object.values(this.currencies).filter(key => key !== 'XRP');
     }

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.amountField = '';
               this.destinationTagField = '';
          }
          this.isMemoEnabled = false;
          this.memoField = '';
          this.ticketSequence = '';
          this.isTicket = false;
          this.cdr.detectChanges();
     }

     private updateSpinnerMessage(message: string) {
          this.spinnerMessage = message;
          this.cdr.detectChanges();
     }

     private async updateCurrencyBalance(gatewayBalance: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet) {
          const parsedBalances = this.parseAllGatewayBalances(gatewayBalance, wallet);
          if (parsedBalances && Object.keys(parsedBalances).length > 0) {
               this.currencyBalanceField = parsedBalances[this.currencyFieldDropDownValue]?.[wallet.classicAddress] ?? parsedBalances[this.currencyFieldDropDownValue]?.[this.issuerFields] ?? '0';
          } else {
               this.currencyBalanceField = '0';
          }
     }

     private updateGatewayBalance(gatewayBalances: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet, issuer?: string) {
          const result = gatewayBalances.result;
          const displayCurrency = this.utilsService.encodeIfNeeded(this.currencyFieldDropDownValue);
          let balance = '0';

          // --- Case 1: This account is the gateway (it issues IOUs)
          if (result.obligations && Object.keys(result.obligations).length > 0) {
               if (result.obligations[displayCurrency]) {
                    // Obligations do NOT have an issuer field (they’re from this gateway)
                    balance = this.utilsService.formatTokenBalance(result.obligations[displayCurrency], 18);
               }
          }

          // --- Case 2: This account holds assets issued BY someone else
          else if (result.assets && Object.keys(result.assets).length > 0) {
               let foundBalance: string | null = null;

               // result.assets looks like: { [issuer]: [{ currency, value }, ...] }
               for (const [issuerAddress, assetArray] of Object.entries(result.assets)) {
                    assetArray.forEach(asset => {
                         if (asset.currency === displayCurrency) {
                              // If an issuer filter is provided, match it
                              if (!issuer || issuerAddress === issuer) {
                                   foundBalance = asset.value;
                              }
                         }
                    });
               }

               if (foundBalance !== null) {
                    balance = this.utilsService.formatTokenBalance(foundBalance, 18);
               }
          }

          this.gatewayBalance = balance;
     }

     private parseAllGatewayBalances(gatewayBalances: xrpl.GatewayBalancesResponse, wallet: xrpl.Wallet) {
          const result = gatewayBalances.result;
          const grouped: Record<string, Record<string, string>> = {};
          // structure: { [currency]: { [issuer]: balance } }

          // --- Case 1: Obligations (this account is the gateway/issuer)
          if (result.obligations && Object.keys(result.obligations).length > 0) {
               for (const [currencyCode, value] of Object.entries(result.obligations)) {
                    const decodedCurrency = this.utilsService.normalizeCurrencyCode(currencyCode);

                    if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};

                    // Obligations are what the gateway owes → negative
                    const formatted = '-' + this.utilsService.formatTokenBalance(value, 18);
                    grouped[decodedCurrency][wallet.address] = formatted;
               }
          }

          // --- Case 2: Assets (tokens issued by others, held by this account)
          if (result.assets && Object.keys(result.assets).length > 0) {
               for (const [issuer, assetArray] of Object.entries(result.assets)) {
                    assetArray.forEach(asset => {
                         const decodedCurrency = this.utilsService.normalizeCurrencyCode(asset.currency);

                         if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};
                         grouped[decodedCurrency][issuer] = this.utilsService.formatTokenBalance(asset.value, 18);
                    });
               }
          }

          // --- Case 3: Balances (owed TO this account)
          if (result.balances && Object.keys(result.balances).length > 0) {
               for (const [issuer, balanceArray] of Object.entries(result.balances)) {
                    balanceArray.forEach(balanceObj => {
                         const decodedCurrency = this.utilsService.normalizeCurrencyCode(balanceObj.currency);

                         if (!grouped[decodedCurrency]) grouped[decodedCurrency] = {};
                         grouped[decodedCurrency][issuer] = this.utilsService.formatTokenBalance(balanceObj.value, 18);
                    });
               }
          }

          return grouped;
     }

     ensureDefaultNotSelected() {
          const currentAddress = this.currentWallet.address;
          if (currentAddress && this.destinations.length > 0) {
               if (!this.destinationField || this.destinationField === currentAddress) {
                    const nonSelectedDest = this.destinations.find(d => d.address !== currentAddress);
                    this.destinationField = nonSelectedDest ? nonSelectedDest.address : this.destinations[0].address;
               }
          }
          // if (currentAddress && this.currencyIssuers.length > 0) {
          //      if (!this.selectedIssuer || this.selectedIssuer === currentAddress) {
          //           const nonSelectedIss = this.currencyIssuers.find(i => i.address !== currentAddress);
          //           this.selectedIssuer = nonSelectedIss ? nonSelectedIss.address : this.currencyIssuers[0].address;
          //      }
          // }
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
          this.txResult = tx;
          this.scheduleHighlight();
     }

     private scheduleHighlight() {
          // Use the captured injector to run afterRenderEffect  safely
          afterRenderEffect(
               () => {
                    if (this.paymentTx && this.paymentJson?.nativeElement) {
                         const json = JSON.stringify(this.paymentTx, null, 2);
                         this.paymentJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.paymentJson.nativeElement);
                    }
                    if (this.txResult && this.txResultJson?.nativeElement) {
                         const json = JSON.stringify(this.txResult, null, 2);
                         this.txResultJson.nativeElement.textContent = json;
                         Prism.highlightElement(this.txResultJson.nativeElement);
                    }
               },
               { injector: this.injector }
          );
     }

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.showToastMessage('Check ID copied!');
          });
     }

     copyTx() {
          const json = JSON.stringify(this.paymentTx, null, 2);
          navigator.clipboard.writeText(json).then(() => {
               this.showToastMessage('Transaction JSON copied!');
          });
     }

     downloadTx() {
          const json = JSON.stringify(this.paymentTx, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `payment-tx-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
     }

     copyTxResult() {
          const json = JSON.stringify(this.txResult, null, 2);
          navigator.clipboard.writeText(json).then(() => {
               this.showToastMessage('Transaction Result JSON copied!');
          });
     }

     downloadTxResult() {
          const json = JSON.stringify(this.txResult, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tx-result-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
     }

     public get infoMessage(): string | null {
          const tabConfig = {
               create: {
                    checks: this.existingChecks,
                    getDescription: (count: number) => (count === 1 ? 'check' : 'checks'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               cash: {
                    checks: this.cashableChecks,
                    getDescription: (count: number) => (count === 1 ? 'check that can be cashed' : 'checks that can be cashed'),
                    dynamicText: '', // Empty for no additional text
                    showLink: true,
               },
               cancel: {
                    checks: this.cancellableChecks,
                    getDescription: (count: number) => (count === 1 ? 'check that can be cancelled' : 'checks that can be cancelled'),
                    dynamicText: '', // Dynamic text before the count
                    showLink: true,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';
          const count = config.checks.length;

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          let message = `The <code>${walletName}</code> wallet has ${dynamicText}${count} ${config.getDescription(count)}.`;

          if (config.showLink && count > 0) {
               const link = `${this.url}account/${this.currentWallet.address}/checks`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View checks in XRPL Win</a>`;
          }

          return message;
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

     private setWarning(msg: string | null) {
          this.warningMessage = msg;
          this.cdr.detectChanges();
     }

     clearWarning() {
          this.setWarning(null);
     }

     autoResize(textarea: HTMLTextAreaElement) {
          if (!textarea) return;
          textarea.style.height = 'auto'; // reset
          textarea.style.height = textarea.scrollHeight + 'px'; // expand
     }

     private clearMessages() {
          const fadeDuration = 400; // ms
          this.result = '';
          this.isError = false;
          this.isSuccess = false;
          this.txHash = '';
          this.txResult = [];
          this.paymentTx = [];
          this.successMessage = '';
          this.cdr.detectChanges();
     }

     async showSpinnerWithDelay(message: string, delayMs: number = 200) {
          this.spinner = true;
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     addToken() {
          if (this.newCurrency && this.newCurrency.trim() && this.newIssuer && this.newIssuer.trim()) {
               const currency = this.newCurrency.trim();
               const issuer = this.newIssuer.trim();

               // Validate currency code
               if (!this.utilsService.isValidCurrencyCode(currency)) {
                    this.setError('Invalid currency code: Must be 3-20 characters or valid hex');
                    return;
               }

               // Validate XRPL address
               if (!xrpl.isValidAddress(issuer)) {
                    this.setError('Invalid issuer address');
                    return;
               }

               // Initialize array if not present
               if (!this.knownTrustLinesIssuers[currency]) {
                    this.knownTrustLinesIssuers[currency] = [];
               }

               // Check for duplicates
               if (this.knownTrustLinesIssuers[currency].includes(issuer)) {
                    this.setError(`Issuer ${issuer} already exists for ${currency}`);
                    return;
               }

               // Add new issuer
               this.knownTrustLinesIssuers[currency].push(issuer);

               // Persist and update
               this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
               this.updateCurrencies();

               this.newCurrency = '';
               this.newIssuer = '';
               this.setSuccess(`Added issuer ${issuer} for ${currency}`);
               this.cdr.detectChanges();
          } else {
               this.setError('Currency code and issuer address are required');
          }

          this.spinner = false;
     }

     removeToken() {
          if (this.tokenToRemove && this.issuerToRemove) {
               const currency = this.tokenToRemove;
               const issuer = this.issuerToRemove;

               if (this.knownTrustLinesIssuers[currency]) {
                    this.knownTrustLinesIssuers[currency] = this.knownTrustLinesIssuers[currency].filter(addr => addr !== issuer);

                    // Remove the currency entirely if no issuers remain
                    if (this.knownTrustLinesIssuers[currency].length === 0) {
                         delete this.knownTrustLinesIssuers[currency];
                    }

                    this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
                    this.updateCurrencies();
                    this.setSuccess(`Removed issuer ${issuer} from ${currency}`);
                    this.cdr.detectChanges();
               } else {
                    this.setError(`Currency ${currency} not found`);
               }
          } else if (this.tokenToRemove) {
               // Remove entire token and all issuers
               delete this.knownTrustLinesIssuers[this.tokenToRemove];
               this.storageService.setKnownIssuers('knownIssuers', this.knownTrustLinesIssuers);
               this.updateCurrencies();
               this.setSuccess(`Removed all issuers for ${this.tokenToRemove}`);
               this.tokenToRemove = '';
               this.cdr.detectChanges();
          } else {
               this.setError('Select a token to remove');
          }

          this.spinner = false;
     }

     private updateCurrencies() {
          this.currencies = [...Object.keys(this.knownTrustLinesIssuers)];
          this.currencies.sort((a, b) => a.localeCompare(b));
          this.currencyFieldDropDownValue = 'CZT';
     }

     private processAccountCurrencies(accountCurrencies: any) {
          const result = accountCurrencies.result;

          const receive = result.receive_currencies.map((c: string) => this.utilsService.normalizeCurrencyCode(c));
          const send = result.send_currencies.map((c: string) => this.utilsService.normalizeCurrencyCode(c));

          return { receive, send };
     }

     private canRemoveTrustline(line: any): { canRemove: boolean; reasons: string[] } {
          const reasons: string[] = [];

          if (parseFloat(line.balance) !== 0) {
               reasons.push(`Balance is ${line.balance} (must be 0)`);
          }

          if (line.no_ripple && !this.trustlineFlags['tfClearNoRipple']) {
               reasons.push(`NoRipple flag is set`);
          }
          if (line.freeze) {
               reasons.push(`Freeze flag is set`);
          }
          if (line.authorized) {
               reasons.push(`Authorized flag is set (issuer must unauthorize before deletion)`);
          }

          if (line.peer_authorized) {
               reasons.push(`Peer authorized is still enabled`);
          }

          return {
               canRemove: reasons.length === 0,
               reasons,
          };
     }

     private setErrorProperties() {
          this.isSuccess = false;
          this.isError = true;
          this.spinner = false;
     }

     private setError(message: string) {
          this.setErrorProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });
     }

     private setSuccessProperties() {
          this.isSuccess = true;
          this.isError = false;
          this.spinner = false;
          this.result = '';
     }

     private setSuccess(message: string) {
          this.setSuccessProperties();
          this.handleTransactionResult({
               result: `${message}`,
               isError: this.isError,
               isSuccess: this.isSuccess,
          });
          this.cdr.detectChanges();
     }
}
