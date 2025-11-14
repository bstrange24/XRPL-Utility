import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, EventEmitter, Output, ViewChildren, QueryList, NgZone, inject, afterRenderEffect, runInInjectionContext, Injector } from '@angular/core';
import { trigger, state, style, transition, animate, group, query } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import * as xrpl from 'xrpl';
import { AccountSet, DepositPreauth, SignerListSet } from 'xrpl';
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
     selectedAccount?: string;
     senderAddress?: string;
     seed?: string;
     account_info?: any;
     setFlags?: any;
     clearFlags?: any;
     destination?: string;
     amount?: string;
     flags?: any;
     depositAuthAddress?: string;
     nfTokenMinterAddress?: string;
     tickSize?: string;
     transferRate?: string;
     domain?: string;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeyAccount?: string;
     regularKeyAccountSeeds?: string;
     regularKeySeed?: string;
     isMultiSign?: boolean;
     useMultiSign?: boolean;
     multiSignSeeds?: string;
     multiSignAddresses?: string;
     isTicket?: boolean;
     ticketSequence?: string;
     selectedSingleTicket?: string;

     signerQuorum?: number;
     signers?: { account: string; seed: string; weight: number }[];
}

interface FlagTxResult {
     flagType: 'SetFlag' | 'ClearFlag';
     flagName: string;
     hash?: string;
     success: boolean;
     error?: string;
     result?: any;
}

interface SignerEntry {
     Account: string;
     SignerWeight: number;
     SingnerSeed: string;
}

interface SignerEntry {
     account: string;
     seed: string;
     weight: number;
}

interface AccountFlags {
     asfRequireDest: boolean;
     asfRequireAuth: boolean;
     asfDisallowXRP: boolean;
     asfDisableMaster: boolean;
     asfNoFreeze: boolean;
     asfGlobalFreeze: boolean;
     asfDefaultRipple: boolean;
     asfDepositAuth: boolean;
     asfAuthorizedNFTokenMinter: boolean;
     asfDisallowIncomingNFTokenOffer: boolean;
     asfDisallowIncomingCheck: boolean;
     asfDisallowIncomingPayChan: boolean;
     asfDisallowIncomingTrustline: boolean;
     asfAllowTrustLineClawback: boolean;
     asfAllowTrustLineLocking: boolean;
}

@Component({
     selector: 'app-account-configurator',
     standalone: true,
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon],
     animations: [trigger('tabTransition', [transition('* => *', [style({ opacity: 0, transform: 'translateY(20px)' }), animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))])])],
     templateUrl: './account-configurator.component.html',
     styleUrl: './account-configurator.component.css',
})
export class AccountConfiguratorComponent implements OnInit, AfterViewInit {
     private destroy$ = new Subject<void>();
     @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
     @ViewChild('accountForm') accountForm!: NgForm;
     @ViewChild('paymentJson') paymentJson!: ElementRef<HTMLElement>;
     @ViewChild('txResultJson') txResultJson!: ElementRef<HTMLElement>;
     @ViewChild('signers') signersRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChild('seeds') seedsRef!: ElementRef<HTMLTextAreaElement>;
     @ViewChildren('signers, seeds') textareas!: QueryList<ElementRef<HTMLTextAreaElement>>;
     private readonly injector = inject(Injector);
     configurationType: 'holder' | 'exchanger' | 'issuer' | null = null;
     lastResult: string = '';
     result: string = '';
     isError: boolean = false;
     isSuccess: boolean = false;
     isEditable: boolean = false;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
     ownerCount: string = '';
     totalXrpReserves: string = '';
     executionTime: string = '';
     ticketSequence: string = '';
     isTicket: boolean = false;
     isTicketEnabled: boolean = false;
     isMemoEnabled: boolean = false;
     isMultiSign: boolean = false;
     useMultiSign: boolean = false;
     multiSignAddress: string = '';
     isRegularKeyAddress: boolean = false;
     regularKeyAddress: string = '';
     regularKeySeed: string = '';
     signerQuorum: number = 0;
     multiSignSeeds: string = '';
     multiSigningEnabled: boolean = false;
     depositAuthEnabled: boolean = false;
     isNFTokenMinterEnabled: boolean = false;
     regularKeySigningEnabled: boolean = false;
     nfTokenMinterAddress: string = '';
     isUpdateMetaData: boolean = false;
     isHolderConfiguration: boolean = false;
     isExchangerConfiguration: boolean = false;
     isIssuerConfiguration: boolean = false;
     isdepositAuthAddress: boolean = false;
     isAuthorizedNFTokenMinter: boolean = false;
     depositAuthAddress: string = '';
     tickSize: string = '';
     transferRate: string = '';
     isMessageKey: boolean = false;
     domain: string = '';
     memoField: string = '';
     avatarUrl: string = '';
     masterKeyDisabled: boolean = false;
     isSimulateEnabled: boolean = false;
     spinnerMessage: string = '';
     readonly FLAG_VALUES = xrpl.AccountSetAsfFlags;
     flags: AccountFlags = {
          asfRequireDest: false,
          asfRequireAuth: false,
          asfDisallowXRP: false,
          asfDisableMaster: false,
          asfNoFreeze: false,
          asfGlobalFreeze: false,
          asfDefaultRipple: false,
          asfDepositAuth: false,
          asfAuthorizedNFTokenMinter: false,
          asfDisallowIncomingNFTokenOffer: false,
          asfDisallowIncomingCheck: false,
          asfDisallowIncomingPayChan: false,
          asfDisallowIncomingTrustline: false,
          asfAllowTrustLineClawback: false,
          asfAllowTrustLineLocking: false,
     };
     totalFlagsValue = 0;
     totalFlagsHex = '0x0';
     spinner: boolean = false;
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
          isIssuer: false,
     };
     environment: string = '';
     paymentTx: any[] = [];
     txResult: any[] = [];
     txHash: string = '';
     txHashes: string[] = [];
     txErrorHashes: string[] = [];
     activeTab = 'modifyAccountFlags'; // default
     private cachedReserves: any = null;
     successMessage: string = '';
     encryptionType: string = '';
     hasWallets: boolean = true;
     showToast: boolean = false;
     toastMessage: string = '';
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     warningMessage: string | null = null;
     userEmail: string = '';
     flagResults: any;
     errorMessage: string = '';

     constructor(private readonly xrplService: XrplService, private readonly utilsService: UtilsService, private readonly cdr: ChangeDetectorRef, private readonly storageService: StorageService, private readonly xrplTransactions: XrplTransactionService, private ngZone: NgZone, private walletGenerator: WalletGeneratorService, private walletManagerService: WalletManagerService) {}

     ngOnInit() {
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
          if (this.activeTab === 'modifyAccountFlags') {
               this.updateFlags();
          } else if (this.activeTab === 'modifyMetaData') {
               this.updateMetaData();
          } else if (this.activeTab === 'setMultiSign') {
               this.setMultiSign('Y');
          }
     }

     async setTab(tab: string) {
          this.activeTab = tab;
          this.clearMessages();
          this.clearFields(true);
          this.getAccountDetails();
     }

     async onIssuerChange(index: number, event: Event) {
          const checked = (event.target as HTMLInputElement).checked;
          if (!this.wallets[index].isIssuer) {
               // this.removeToken(this.currencyFieldDropDownValue, this.wallets[index]);
          } else {
               this.wallets[index].isIssuer = checked;
               const updates = {
                    isIssuer: checked,
               };
               this.walletManagerService.updateWalletByAddress(this.wallets[index].address, updates);
               // this.addToken(this.currencyFieldDropDownValue, this.wallets[index]);
               // this.toggleIssuerField();
               // any extra logic, e.g. save to localStorage, emit event, etc.
          }
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
                    await this.refreshWallets(client, [this.wallets[this.selectedWalletIndex].address]);
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
     }

     async refreshBalance(index: number) {
          const wallet = this.wallets[index];
          try {
               const client = await this.xrplService.getClient();
               const walletAddress = wallet.classicAddress ? wallet.classicAddress : wallet.address;
               await this.refreshWallets(client, [walletAddress]);
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
               await this.getAccountDetails();
          } else if (this.currentWallet.address) {
               this.setError('Invalid XRP address');
          }
     }

     validateQuorum() {
          const totalWeight = this.signers.reduce((sum, s) => sum + (s.weight || 0), 0);
          if (this.signerQuorum > totalWeight) {
               this.signerQuorum = totalWeight;
          }
     }

     async toggleMultiSign() {
          try {
               if (!this.isMultiSign) {
                    this.utilsService.clearSignerList(this.signers);
               } else {
                    const wallet = await this.getWallet();
                    this.loadSignerList(wallet.classicAddress);
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

     onConfigurationChange() {
          this.resetFlags();

          const type = this.configurationType || '';
          const configActions: Record<string, () => void> = {
               holder: () => this.setHolder(),
               exchanger: () => this.setExchanger(),
               issuer: () => this.setIssuer(),
          };

          configActions[type]?.();
          this.updateFlagTotal();

          console.log('Configuration changed to:', this.configurationType);
          this.cdr.detectChanges();
     }

     private resetFlags() {
          Object.keys(this.flags).forEach(key => (this.flags[key as keyof AccountFlags] = false));

          ['domainField', 'transferRateField', 'tickSizeField'].forEach(id => {
               const elem = document.getElementById(id) as HTMLInputElement | null;
               if (elem) elem.value = '';
          });
     }

     setHolder() {
          // Update flags for Holder configuration
          this.flags.asfRequireDest = false;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = false;
          this.flags.asfDepositAuth = false;
          this.flags.asfAllowTrustLineClawback = false;
          this.flags.asfDisallowIncomingNFTokenOffer = false;
          this.flags.asfDisallowIncomingCheck = false;
          this.flags.asfDisallowIncomingPayChan = false;
          this.flags.asfDisallowIncomingTrustline = false;
     }

     setExchanger() {
          // Update flags for Exchanger configuration
          this.flags.asfRequireDest = true;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = true;
          this.flags.asfDepositAuth = false;
          this.flags.asfAuthorizedNFTokenMinter = false;
          this.flags.asfDisallowIncomingNFTokenOffer = true;
          this.flags.asfDisallowIncomingCheck = false;
          this.flags.asfDisallowIncomingPayChan = true;
          this.flags.asfDisallowIncomingTrustline = false;
          this.flags.asfAllowTrustLineClawback = false;
          this.flags.asfAllowTrustLineLocking = false;
     }

     setIssuer() {
          // Update flags for Issuer configuration
          this.flags.asfRequireDest = false;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = true;
          this.flags.asfDepositAuth = false;
          this.flags.asfAuthorizedNFTokenMinter = false;
          this.flags.asfDisallowIncomingNFTokenOffer = true;
          this.flags.asfDisallowIncomingCheck = true;
          this.flags.asfDisallowIncomingPayChan = true;
          this.flags.asfDisallowIncomingTrustline = false;
          this.flags.asfAllowTrustLineClawback = true;
          this.flags.asfAllowTrustLineLocking = false;
     }

     toggleConfigurationTemplate() {
          this.cdr.detectChanges();
     }

     addSigner() {
          this.signers.push({ account: '', seed: '', weight: 1 });
     }

     removeSigner(index: number) {
          this.signers.splice(index, 1);
     }

     onNoFreezeChange() {
          if (this.flags.asfNoFreeze) {
               alert('Prevent Freezing Trust Lines (No Freeze) cannot be unset!');
          }
     }

     onClawbackChange() {
          if (this.flags.asfAllowTrustLineClawback) {
               alert('Trust Line Clawback cannot be unset!');
          }
     }

     async getAccountDetails() {
          console.log('Entering getAccountDetails');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);
          this.configurationType = null;

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               // Get account info and account objects
               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const inputs: ValidationInputs = {
                    seed: this.currentWallet.seed,
                    account_info: accountInfo,
               };

               const errors = await this.validateInputs(inputs, 'getAccountDetails');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               AppConstants.FLAGS.forEach(flag => {
                    const flagKey = AppConstants.FLAGMAP[flag.name as keyof typeof AppConstants.FLAGMAP];
                    if (flagKey) {
                         const isEnabled = !!accountInfo.result.account_flags?.[flagKey as keyof typeof accountInfo.result.account_flags];
                         const flagName = flag.name as keyof AccountFlags;
                         this.flags[flagName] = isEnabled;
                    }
               });

               // --- Defer: Fetch additional data and enhance UI ---
               setTimeout(async () => {
                    try {
                         this.refreshUIData(wallet, accountInfo, accountObjects);
                         this.loadSignerList(wallet.classicAddress);
                         this.clearFields(false);
                         this.updateTickets(accountObjects);
                    } catch (err) {
                         console.error('Error in deferred UI updates:', err);
                    }
               }, 0);
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getAccountDetails in ${this.executionTime}ms`);
          }
     }

     async updateFlags() {
          console.log('Entering updateFlags');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               isRegularKeyAddress: this.isRegularKeyAddress,
               isMultiSign: this.useMultiSign,
               regularKeyAddress: this.regularKeyAddress || undefined,
               regularKeySeed: this.regularKeySeed || undefined,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
               signers: this.signers || undefined,
               signerQuorum: this.signerQuorum || undefined,
          };

          this.clearUiIAccountMetaData();

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const { setFlags, clearFlags } = this.utilsService.getFlagUpdates(accountInfo.result.account_flags);

               inputs.account_info = accountInfo;
               inputs.flags = accountInfo.result.account_flags;
               inputs.setFlags = setFlags;
               inputs.clearFlags = clearFlags;

               const errors = await this.validateInputs(inputs, 'updateFlags');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Flag Modifications (no changes will be made)...' : 'Submitting Flag Modifications to Ledger...', 200);

               const allFlagResults: any[] = [];

               // Run set + clear loops sequentially
               for (const flag of setFlags) {
                    const result = await this.handleFlagTx(client, wallet, 'SetFlag', flag, this.memoField);
                    allFlagResults.push(result);
                    this.txResult.push(result.result);
                    this.updateTxResult(this.txResult);
               }

               for (const flag of clearFlags) {
                    const result = await this.handleFlagTx(client, wallet, 'ClearFlag', flag, this.memoField);
                    allFlagResults.push(result);
                    this.txResult.push(result.result);
                    this.updateTxResult(this.txResult);
               }

               // Aggregate results
               const failed = allFlagResults.filter(r => !r.success);
               const succeeded = allFlagResults.filter(r => r.success);

               // === Build messages for UI ===
               if (succeeded.length > 0) {
                    for (const h of succeeded) {
                         if (h.hash) {
                              this.txHashes.push(h.hash);
                         }
                    }
                    this.successMessage = `${succeeded.length} Flag Transaction(s) Succeeded`;
                    this.setSuccess(this.result);
               }

               if (failed.length > 0) {
                    for (const h of failed) {
                         if (h.hash) {
                              this.txErrorHashes.push(h.hash);
                         }
                    }
                    this.errorMessage = `${failed.length} Flag Transaction(s) Failed`;
                    this.setError(this.errorMessage);
               }

               if (!this.isSimulateEnabled) {
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              this.loadSignerList(wallet.classicAddress);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = 'Simulated Modify Flags successfully!';
               }
          } catch (error: any) {
               console.error('Error in updateFlags:', error);
               this.errorMessage = `ERROR: ${error.message || 'Unknown error'}`;
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateFlags in ${this.executionTime}ms`);
          }
     }

     async updateMetaData() {
          console.log('Entering updateMetaData');
          const startTime = Date.now();
          this.clearMessages();
          this.clearWarning();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               tickSize: this.tickSize,
               transferRate: this.transferRate,
               domain: this.domain,
               isRegularKeyAddress: this.isRegularKeyAddress,
               isMultiSign: this.useMultiSign,
               regularKeyAddress: this.regularKeyAddress || undefined,
               regularKeySeed: this.regularKeySeed || undefined,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
               signers: this.signers || undefined,
               signerQuorum: this.signerQuorum || undefined,
          };

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'updateMetaData');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               const accountSetTx: AccountSet = await client.autofill({
                    TransactionType: 'AccountSet',
                    Account: wallet.classicAddress,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               });

               await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

               const updates: (() => void)[] = [];

               if (this.tickSize) {
                    updates.push(() => this.utilsService.setTickSize(accountSetTx, parseInt(this.tickSize)));
               }

               if (this.transferRate) {
                    updates.push(() => this.utilsService.setTransferRate(accountSetTx, parseFloat(this.transferRate)));
               }

               if (this.isMessageKey && wallet.publicKey) {
                    updates.push(() => this.utilsService.setMessageKey(accountSetTx, wallet.publicKey));
               }

               if (this.userEmail) {
                    updates.push(() => this.utilsService.setEmailHash(accountSetTx, this.userEmail));
               }

               if (this.domain && this.domain.trim() !== '') {
                    updates.push(() => this.utilsService.setDomain(accountSetTx, this.domain));
               }

               if (updates.length === 0) {
                    this.setWarning(`No meta data fields selected for modification.`);
                    return;
               }

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               updates.forEach(update => update());

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Meta Data Update (no changes will be made)...' : 'Submitting Meta Data Update to Ledger...', 200);

               this.paymentTx.push(accountSetTx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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

               this.isUpdateMetaData = true;

               this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.isSimulateEnabled) {
                    this.successMessage = 'Updateed Meta Data successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              this.loadSignerList(wallet.classicAddress);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = 'Simulated Meta Data Update successfully!';
               }
          } catch (error: any) {
               console.error('Error in updateMetaData:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateMetaData in ${this.executionTime}ms`);
          }
     }

     async setDepositAuthAccounts(authorizeFlag: 'Y' | 'N'): Promise<void> {
          console.log('Entering setDepositAuthAccounts');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               depositAuthAddress: this.depositAuthAddress,
               isRegularKeyAddress: this.isRegularKeyAddress,
               isMultiSign: this.useMultiSign,
               regularKeyAddress: this.regularKeyAddress || undefined,
               regularKeySeed: this.regularKeySeed || undefined,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
               signers: this.signers || undefined,
               signerQuorum: this.signerQuorum || undefined,
          };

          // Split and validate deposit auth addresses
          const addressesArray = this.utilsService.getUserEnteredAddress(this.depositAuthAddress);
          if (!addressesArray.length) {
               return this.setError('ERROR: Deposit Auth address list is empty');
          }

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'deposit_preauth'), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'setDepositAuthAccounts');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               // Validate each address
               for (const authorizedAddress of addressesArray) {
                    // Check for existing preauthorization
                    const alreadyAuthorized = accountObjects.result.account_objects.some((obj: any) => obj.Authorize === authorizedAddress);
                    if (authorizeFlag === 'Y' && alreadyAuthorized) {
                         return this.setError(`ERROR: Preauthorization already exists for ${authorizedAddress} (tecDUPLICATE). Use Unauthorize to remove`);
                    }
                    if (authorizeFlag === 'N' && !alreadyAuthorized) {
                         return this.setError(`ERROR: No preauthorization exists for ${authorizedAddress} to unauthorize`);
                    }
               }

               // Process each address
               for (const authorizedAddress of addressesArray) {
                    const depositPreauthTx: DepositPreauth = await client.autofill({
                         TransactionType: 'DepositPreauth',
                         Account: wallet.classicAddress,
                         [authorizeFlag === 'Y' ? 'Authorize' : 'Unauthorize']: authorizedAddress,
                         Fee: fee,
                         LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
                    });

                    await this.setTxOptionalFields(client, depositPreauthTx, wallet, accountInfo);

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, depositPreauthTx, fee)) {
                         return this.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Setting Deposit Auth (no changes will be made)...' : 'Submitting Deposit Auth Accounts to Ledger...', 200);

                    // STORE IT FOR DISPLAY
                    this.paymentTx.push(depositPreauthTx);
                    this.updatePaymentTx();

                    let response: any;
                    if (this.isSimulateEnabled) {
                         response = await this.xrplTransactions.simulateTransaction(client, depositPreauthTx);
                    } else {
                         const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                         const signedTx = await this.xrplTransactions.signTransaction(client, wallet, depositPreauthTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                         if (!signedTx) {
                              console.error(`Failed to sign transaction for deposit authorization `);
                              continue;
                         }

                         response = await this.xrplTransactions.submitTransaction(client, signedTx);
                    }

                    this.utilsService.logObjects('response', response);
                    this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    this.txResult.push(response.result);
                    this.updateTxResult(this.txResult);

                    this.utilsService.logObjects('response', response);
                    const isSuccess = this.utilsService.isTxSuccessful(response);
                    if (!isSuccess) {
                         console.warn(`Deposit Authorization failed:`, response);
                         this.errorMessage = `Deposit Authorization Transaction(s) Failed`;
                         this.setError(this.errorMessage);
                         this.txErrorHashes.push(response.result.hash ? response.result.hash : response.result.tx_json.hash);
                    } else {
                         const hash = response.result.hash ?? response.result.tx_json.hash;
                         this.txHashes.push(hash); // ← push to array
                         console.log(`Deposit Authorization successfully. TxHash:`, response.result.hash ? response.result.hash : response.result.tx_json.hash);
                    }
               }

               this.setSuccess(this.result);

               if (!this.isSimulateEnabled) {
                    this.successMessage = `Deposit Authorization ${authorizeFlag === 'Y' ? 'set' : 'removed'} successfully!`;

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = 'Simulated Deposit Authorization successfully!';
               }
          } catch (error: any) {
               console.error('Error in setDepositAuthAccounts:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setDepositAuthAccounts in ${this.executionTime}ms`);
          }
     }

     async setMultiSign(enableMultiSignFlag: 'Y' | 'N') {
          console.log('Entering setMultiSign');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               isRegularKeyAddress: this.isRegularKeyAddress,
               isMultiSign: this.isMultiSign,
               regularKeyAddress: this.regularKeyAddress || undefined,
               regularKeySeed: this.regularKeySeed || undefined,
               multiSignAddresses: this.isMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.isMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
               signers: this.signers || undefined,
               signerQuorum: this.signerQuorum || undefined,
          };

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'setMultiSign');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               // Create array of signer accounts and their weights
               let signerEntries = this.createSignerEntries();

               // Format SignerEntries for XRPL transaction
               const formattedSignerEntries = this.formatSignerEntries(signerEntries);

               // Shared base tx
               const signerListTx: SignerListSet = {
                    TransactionType: 'SignerListSet',
                    Account: wallet.classicAddress,
                    SignerQuorum: 0,
                    Fee: fee,
               };

               await this.setTxOptionalFields(client, signerListTx, wallet, accountInfo);

               signerListTx.LastLedgerSequence = currentLedger + AppConstants.LAST_LEDGER_ADD_TIME;

               console.debug(`enableMultiSignFlag:`, enableMultiSignFlag);
               if (enableMultiSignFlag === 'Y') {
                    signerListTx.SignerEntries = formattedSignerEntries;
                    if (Number(this.signerQuorum) <= 0) {
                         return this.setError('ERROR: Signer Quorum must be greater than 0.');
                    }
                    signerListTx.SignerQuorum = Number(this.signerQuorum);
               }

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, signerListTx, fee)) {
                    return this.setError('ERROR: Insufficent XRP to complete transaction');
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? 'Simulating Setting Multi Sign (no changes will be made)...' : 'Submitting Multi-Sign to Ledger...', 200);

               this.paymentTx.push(signerListTx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, signerListTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, signerListTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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

               if (!this.isSimulateEnabled) {
                    this.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

                    if (enableMultiSignFlag === 'Y') {
                         this.successMessage = 'Set Multi Sign successfully!';
                         this.storageService.set(wallet.classicAddress + 'signerEntries', signerEntries);
                    } else {
                         this.successMessage = 'Removed Multi Sign successfully!';
                         // this.storageService.removeValue('signerEntries');
                         this.storageService.removeValue(wallet.classicAddress + 'signerEntries');
                         this.signerQuorum = 0;
                    }

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              this.loadSignerList(wallet.classicAddress);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = `Simulated Setting Multi Sign ${enableMultiSignFlag === 'Y' ? 'creation' : 'removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error in setMultiSign:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setMultiSign in ${this.executionTime}ms`);
          }
     }

     async setRegularKey(enableRegularKeyFlag: 'Y' | 'N') {
          console.log('Entering setRegularKey');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               isRegularKeyAddress: this.isRegularKeyAddress,
               isMultiSign: this.useMultiSign,
               regularKeyAddress: this.regularKeyAddress || undefined,
               regularKeySeed: this.regularKeySeed || undefined,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
               signers: this.signers || undefined,
               signerQuorum: this.signerQuorum || undefined,
          };

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'setRegularKey');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               if (this.regularKeyAddress === '' || this.regularKeyAddress === 'No RegularKey configured for account' || this.regularKeySeed === '') {
                    return this.setError(`ERROR: Regular Key address and seed must be present`);
               }

               let setRegularKeyTx: xrpl.SetRegularKey = {
                    TransactionType: 'SetRegularKey',
                    Account: wallet.classicAddress,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               if (enableRegularKeyFlag === 'Y') {
                    setRegularKeyTx.RegularKey = this.regularKeyAddress;
               }

               await this.setTxOptionalFields(client, setRegularKeyTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, setRegularKeyTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating ${enableRegularKeyFlag === 'Y' ? 'Setting' : 'Remove'} Regular Key (no changes will be made)...` : `Submitting Regular Key ${enableRegularKeyFlag === 'Y' ? 'Set' : 'Removal'} to Ledger...`, 200);

               this.paymentTx.push(setRegularKeyTx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, setRegularKeyTx);
               } else {
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, setRegularKeyTx, false, '', fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    const regularKeysAccount = wallet.classicAddress + 'regularKey';
                    const regularKeySeedAccount = wallet.classicAddress + 'regularKeySeed';
                    if (enableRegularKeyFlag === 'Y') {
                         this.successMessage = 'Set Regular Key successfully!';
                         this.storageService.set(regularKeysAccount, this.regularKeyAddress);
                         this.storageService.set(regularKeySeedAccount, this.regularKeySeed);
                    } else {
                         this.successMessage = 'Removed Regular Key successfully!';
                         this.storageService.removeValue(regularKeysAccount);
                         this.storageService.removeValue(regularKeySeedAccount);
                    }

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              this.loadSignerList(wallet.classicAddress);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = `Simulated ${enableRegularKeyFlag === 'Y' ? 'Set Regular Key' : 'Regular Key removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error in setRegularKey:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setRegularKey in ${this.executionTime}ms`);
          }
     }

     async setNftMinterAddress(enableNftMinter: 'Y' | 'N') {
          console.log('Entering setNftMinterAddress');
          const startTime = Date.now();
          this.clearMessages();
          this.updateSpinnerMessage(``);

          const inputs: ValidationInputs = {
               selectedAccount: this.currentWallet.address,
               seed: this.currentWallet.seed,
               nfTokenMinterAddress: this.nfTokenMinterAddress,
               isRegularKeyAddress: this.isRegularKeyAddress,
               isMultiSign: this.useMultiSign,
               regularKeyAddress: this.regularKeyAddress || undefined,
               regularKeySeed: this.regularKeySeed || undefined,
               multiSignAddresses: this.useMultiSign ? this.multiSignAddress : undefined,
               multiSignSeeds: this.useMultiSign ? this.multiSignSeeds : undefined,
               isTicket: this.isTicket,
               selectedSingleTicket: this.isTicket ? this.selectedSingleTicket : undefined,
               signers: this.signers || undefined,
               signerQuorum: this.signerQuorum || undefined,
          };

          // Split and validate NFT minter addresses
          const addressesArray = this.utilsService.getUserEnteredAddress(this.nfTokenMinterAddress);
          if (!addressesArray.length) {
               return this.setError('ERROR: NFT Minter address list is empty');
          }

          try {
               const client = await this.xrplService.getClient();
               const wallet = await this.getWallet();

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               this.utilsService.logAccountInfoObjects(accountInfo, null);
               this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.account_info = accountInfo;

               const errors = await this.validateInputs(inputs, 'setNftMinterAddress');
               if (errors.length > 0) {
                    return this.setError(errors.length === 1 ? `Error:\n${errors.join('\n')}` : `Multiple Error's:\n${errors.join('\n')}`);
               }

               try {
                    addressesArray.map((address: any) => accountInfo);
               } catch (error: any) {
                    if (error.data?.error === 'actNotFound') {
                         const missingAddress = addressesArray.find((addr: any) => error.data?.error_message?.includes(addr)) || addressesArray[0];
                         return this.setError(`ERROR: Account ${missingAddress} does not exist (tecNO_TARGET)`);
                    }
                    throw error;
               }

               // Process each address
               const results: any[] = [];

               // Build base transaction
               const accountSetTx: xrpl.AccountSet = await client.autofill({
                    TransactionType: 'AccountSet',
                    Account: wallet.classicAddress,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               });

               if (enableNftMinter === 'Y') {
                    accountSetTx.NFTokenMinter = addressesArray;
                    accountSetTx.SetFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
               } else {
                    accountSetTx.ClearFlag = xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
               }

               await this.setTxOptionalFields(client, accountSetTx, wallet, accountInfo);

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                    return this.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.showSpinnerWithDelay(this.isSimulateEnabled ? `Simulating ${enableNftMinter === 'Y' ? 'Setting' : 'Remove'} NFT Minter (no changes will be made)...` : `Submitting NFT Minter ${enableNftMinter === 'Y' ? 'Set' : 'Removal'} to Ledger...`, 200);

               this.paymentTx.push(accountSetTx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

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
                    this.successMessage = `${enableNftMinter === 'Y' ? 'Set NFT Minter Address' : 'NFT Minter Address removal'} successfully!`;
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]);

                    setTimeout(async () => {
                         try {
                              this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                              this.loadSignerList(wallet.classicAddress);
                              this.clearFields(false);
                              this.updateTickets(updatedAccountObjects);
                         } catch (err) {
                              console.error('Error in post-tx cleanup:', err);
                         }
                    }, 0);
               } else {
                    this.successMessage = `Simulated ${enableNftMinter === 'Y' ? 'Set NFT Minter Address' : 'NFT Minter Address removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error in setNftMinterAddress:', error);
               this.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setNftMinterAddress in ${this.executionTime}ms`);
          }
     }

     private async handleFlagTx(client: xrpl.Client, wallet: xrpl.Wallet, type: 'SetFlag' | 'ClearFlag', flagValue: string, memoField: string): Promise<{ flagType: 'SetFlag' | 'ClearFlag'; flagName: string; hash?: string; success: boolean; error?: string; result?: any }> {
          try {
               const response = await this.submitFlagTransaction(client, wallet, type === 'SetFlag' ? { SetFlag: flagValue } : { ClearFlag: flagValue }, memoField);

               const flagName = this.utilsService.getFlagName(flagValue);
               const success = response?.success === true;
               const message = response?.message;
               const result = typeof message === 'object' && 'result' in message ? message.result : message;

               // Extract hash safely
               let hash: string | undefined;
               try {
                    if (typeof result === 'object' && result) {
                         hash = result.hash ?? result.tx_json?.hash;
                    } else if (typeof result === 'string') {
                         const parsed = JSON.parse(result);
                         hash = parsed.hash ?? parsed.tx_json?.hash;
                    }
               } catch {
                    hash = undefined;
               }

               return { flagType: type, flagName, hash, success, result, error: success ? undefined : JSON.stringify(result) };
          } catch (err: any) {
               return { flagType: type, flagName: this.utilsService.getFlagName(flagValue), success: false, error: err.message || 'Unknown error' };
          }
     }

     private async submitFlagTransaction(client: xrpl.Client, wallet: xrpl.Wallet, flagPayload: any, memoField: any) {
          console.log('Entering submitFlagTransaction');
          const startTime = Date.now();

          const accountInfo = await this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', '');

          if (flagPayload.SetFlag) {
               const flagToUpdate = Array.from(AppConstants.FLAGS.values()).find((flag: any) => flag.value === flagPayload.SetFlag);
               this.updateSpinnerMessage(`Submitting ${flagToUpdate ? flagToUpdate.label : 'Flag'} set flag to the Ledger...`);
          }

          if (flagPayload.ClearFlag) {
               const flagToUpdate = Array.from(AppConstants.FLAGS.values()).find((flag: any) => flag.value === flagPayload.ClearFlag);
               this.updateSpinnerMessage(`Submitting ${flagToUpdate ? flagToUpdate.label : 'Flag'} clear flag to the Ledger...`);
          }

          try {
               let regularKeyWalletSignTx: any = '';
               let useRegularKeyWalletSignTx = false;
               if (this.isRegularKeyAddress && !this.useMultiSign) {
                    console.log('Using Regular Key Seed for transaction signing');
                    regularKeyWalletSignTx = await this.utilsService.getWallet(this.regularKeySeed);
                    useRegularKeyWalletSignTx = true;
               }

               const fee = await this.xrplService.calculateTransactionFee(client);
               const currentLedger = await this.xrplService.getLastLedgerIndex(client);
               const serverInfo = await this.xrplService.getXrplServerInfo(client, 'current', '');

               const tx = {
                    TransactionType: 'AccountSet',
                    Account: wallet.classicAddress,
                    ...flagPayload,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               if (this.ticketSequence) {
                    if (!(await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.ticketSequence)))) {
                         return { success: false, message: `ERROR: Ticket Sequence ${this.ticketSequence} not found for account ${wallet.classicAddress}` };
                    }
                    tx.TicketSequence = Number(this.ticketSequence);
                    tx.Sequence = 0;
               } else {
                    tx.Sequence = accountInfo.result.account_data.Sequence;
               }

               if (memoField) {
                    tx.Memos = [
                         {
                              Memo: {
                                   MemoType: Buffer.from('text/plain', 'utf8').toString('hex'),
                                   MemoData: Buffer.from(memoField, 'utf8').toString('hex'),
                              },
                         },
                    ];
               }

               // STORE IT FOR DISPLAY
               this.paymentTx.push(tx);
               this.updatePaymentTx();

               let response: any;

               if (this.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
               } else {
                    let signedTx: { tx_blob: string; hash: string } | null = null;

                    if (this.useMultiSign) {
                         const signerAddresses = this.utilsService.getMultiSignAddress(this.multiSignAddress);
                         if (signerAddresses.length === 0) {
                              return this.setError('ERROR: No signer addresses provided for multi-signing');
                         }

                         const signerSeeds = this.utilsService.getMultiSignSeeds(this.multiSignSeeds);
                         if (signerSeeds.length === 0) {
                              return this.setError('ERROR: No signer seeds provided for multi-signing');
                         }

                         try {
                              const result = await this.utilsService.handleMultiSignTransaction({ client, wallet, tx: tx, signerAddresses, signerSeeds, fee });
                              signedTx = result.signedTx;
                              tx.Signers = result.signers;

                              console.log('Payment with Signers:', JSON.stringify(tx, null, 2));
                              console.log('SignedTx:', JSON.stringify(signedTx, null, 2));

                              if (!signedTx) {
                                   return this.setError('ERROR: No valid signature collected for multisign transaction');
                              }

                              const multiSignFee = String((signerAddresses.length + 1) * Number(await this.xrplService.calculateTransactionFee(client)));
                              console.log(`multiSignFee: ${multiSignFee}`);
                              tx.Fee = multiSignFee;
                              const finalTx = xrpl.decode(signedTx.tx_blob);
                              console.log('Decoded Final Tx:', JSON.stringify(finalTx, null, 2));
                         } catch (err: any) {
                              return { success: false, message: `ERROR: ${err.message}` };
                         }
                    } else {
                         const preparedTx = await client.autofill(tx);
                         console.log(`preparedTx:`, preparedTx);
                         if (useRegularKeyWalletSignTx) {
                              console.log('Using RegularKey to sign transaction');
                              signedTx = regularKeyWalletSignTx.sign(preparedTx);
                         } else {
                              signedTx = wallet.sign(preparedTx);
                         }
                    }

                    if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, tx, fee)) {
                         return { success: false, message: 'ERROR: Insufficient XRP to complete transaction' };
                    }

                    if (!signedTx) {
                         return { success: false, message: 'ERROR: Failed to sign transaction.' };
                    }

                    response = await client.submitAndWait(signedTx.tx_blob);
               }

               if (response.result.meta.TransactionResult != 'tesSUCCESS') {
                    return {
                         success: false,
                         message: response,
                    };
               } else {
                    return {
                         success: true,
                         message: response,
                    };
               }
          } catch (error: any) {
               return { success: false, message: `ERROR submitting flag: ${error.message}` };
          } finally {
               console.log(`Leaving submitFlagTransaction in ${Date.now() - startTime}ms`);
          }
     }

     updateAvatarUrlFromEmail(email: string) {
          if (!email || !email.includes('@')) {
               this.avatarUrl = '';
               return;
          }
          const encoded = encodeURIComponent(email.trim().toLowerCase());
          this.avatarUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${encoded}`;
     }

     private refreshUIData(wallet: xrpl.Wallet, updatedAccountInfo: any, updatedAccountObjects: xrpl.AccountObjectsResponse) {
          this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);

          this.refreshUiAccountObjects(updatedAccountObjects, updatedAccountInfo, wallet);
          this.refreshUiAccountInfo(updatedAccountInfo);
     }

     private checkForSignerAccounts(accountObjects: xrpl.AccountObjectsResponse) {
          const signerAccounts: string[] = [];
          if (accountObjects.result && Array.isArray(accountObjects.result.account_objects)) {
               accountObjects.result.account_objects.forEach(obj => {
                    if (obj.LedgerEntryType === 'SignerList' && Array.isArray(obj.SignerEntries)) {
                         obj.SignerEntries.forEach((entry: any) => {
                              if (entry.SignerEntry?.Account) {
                                   signerAccounts.push(entry.SignerEntry.Account + '~' + entry.SignerEntry.SignerWeight);
                                   this.signerQuorum = obj.SignerQuorum;
                              }
                         });
                    }
               });
          }
          return signerAccounts;
     }

     private async validateInputs(inputs: ValidationInputs, action: string): Promise<string[]> {
          const errors: string[] = [];

          // Common validators as functions
          const isRequired = (value: string | null | undefined, fieldName: string): string | null => {
               if (value == null || !this.utilsService.validateInput(value)) {
                    return `${fieldName} cannot be empty`;
               }
               return null;
          };

          const isValidXrpAddress = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidAddress(value)) {
                    return `${fieldName} is invalid`;
               }
               return null;
          };

          const isValidSecret = (value: string | undefined, fieldName: string): string | null => {
               if (value && !xrpl.isValidSecret(value)) {
                    return `${fieldName} is invalid`;
               }
               return null;
          };

          const isValidSeed = (value: string | undefined): string | null => {
               if (value) {
                    const { type } = this.utilsService.detectXrpInputType(value);
                    if (type === 'unknown') {
                         return 'Account seed or mnemonic is invalid';
                    }
               }
               return null;
          };

          const isValidNumber = (value: string | undefined, fieldName: string, minValue?: number, maxValue?: number): string | null => {
               if (value === undefined) return null; // Not required
               const num = parseFloat(value);
               if (isNaN(num) || !isFinite(num)) {
                    return `${fieldName} must be a valid number`;
               }
               if (minValue !== undefined && num < minValue) {
                    return `${fieldName} must be at least ${minValue}`;
               }
               if (maxValue !== undefined && num > maxValue) {
                    return `${fieldName} cannot be greater than ${maxValue}`;
               }
               return null;
          };

          const validateMultiSign = (addressesStr: string | undefined, seedsStr: string | undefined): string | null => {
               if (!addressesStr || !seedsStr) return null; // Not required
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
               const invalidSeed = seeds.find((seed: string) => !this.utilsService.validateSeed(seed));
               if (invalidSeed) {
                    return 'One or more signer seeds are invalid';
               }
               return null;
          };

          const validateAddresses = async (addressesStr: string | undefined, fieldName: string) => {
               const errors: string[] = [];
               if (!addressesStr) return errors;
               const addresses = this.utilsService.getUserEnteredAddress(addressesStr);
               if (!addresses.length) {
                    errors.push(`${fieldName} list is empty`);
                    return errors;
               }
               const selfAddress = (await this.getWallet()).classicAddress;
               if (addresses.includes(selfAddress)) {
                    errors.push(`Your own account cannot be in the ${fieldName.toLowerCase()} list`);
               }
               const invalidAddresses = addresses.filter((addr: string) => !xrpl.isValidClassicAddress(addr));
               if (invalidAddresses.length > 0) {
                    errors.push(`Invalid ${fieldName} addresses: ${invalidAddresses.join(', ')}`);
               }
               const duplicates = addresses.filter((addr: any, idx: any, self: string | any[]) => self.indexOf(addr) !== idx);
               if (duplicates.length > 0) {
                    errors.push(`Duplicate ${fieldName} addresses: ${[...new Set(duplicates)].join(', ')}`);
               }
               return errors;
          };

          const validateSigners = async (signers: { account: string; seed: string; weight: number }[] | undefined): Promise<string[]> => {
               const errors: string[] = [];
               if (!signers?.length) {
                    errors.push('No valid signer accounts provided');
                    return errors;
               }
               const selfAddress = (await this.getWallet()).classicAddress;
               if (signers.some(s => s.account === selfAddress)) {
                    errors.push('Your own account cannot be in the signer list');
               }
               const allAddressesValid = signers.every(s => {
                    // Empty string?
                    if (!s.account || s.account.trim() === '') return false;
                    // XRPL has isValidAddress helper
                    return xrpl.isValidAddress(s.account);
               });
               if (!allAddressesValid) {
                    errors.push(`Invalid signer addresses`);
               }
               const allSeedsValid = signers.every(s => {
                    // Empty string?
                    if (!s.seed || s.seed.trim() === '' || s.seed.trim() === ',') return false;

                    return true;
               });
               if (!allSeedsValid) {
                    errors.push(`Invalid signer seed`);
               }
               try {
                    const seedResults = signers.map(s => (s.seed ? this.utilsService.validateSeed(s.seed) : true));
                    const allSeedsValid = seedResults.every(valid => valid);
                    if (!allSeedsValid) {
                         errors.push(`Invalid signer seed`);
                    }
               } catch (error: any) {
                    console.error('Error validating signer seeds:', error.message);
                    errors.push(`Invalid signer seed`);
               }

               const addresses = signers.map(s => s.account);
               const duplicates = addresses.filter((addr, idx, self) => self.indexOf(addr) !== idx);
               if (duplicates.length > 0) {
                    errors.push(`Duplicate signer addresses: ${[...new Set(duplicates)].join(', ')}`);
               }
               if (signers.length > 8) {
                    errors.push(`XRPL allows max 8 signer entries. You provided ${signers.length}`);
               }
               if (inputs.signerQuorum ? parseInt(inputs.signerQuorum.toString()) <= 0 : true) {
                    errors.push('Quorum must be greater than 0');
               }
               return errors;
          };

          // Action-specific config: required fields and custom rules
          const actionConfig: Record<string, { required: (keyof ValidationInputs)[]; customValidators?: (() => Promise<string | null>)[] }> = {
               getAccountDetails: {
                    required: ['seed'],
                    customValidators: [async () => isValidSeed(inputs.seed), async () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null)],
               },
               // toggleMetaData: {
               //      required: ['seed'],
               //      customValidators: [async () => isValidSeed(inputs.seed)],
               // },
               updateFlags: {
                    required: ['seed'],
                    customValidators: [
                         async () => isValidSeed(inputs.seed),
                         async () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         async () => (inputs.account_info.result?.account_flags?.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         async () => (this.flags.asfNoFreeze && this.flags.asfGlobalFreeze ? 'Cannot enable both NoFreeze and GlobalFreeze' : null),
                         async () => (this.flags.asfDisableMaster && (inputs.isMultiSign || this.isRegularKeyAddress) ? 'Disabling the master key requires signing with the master key' : null),
                         async () => (inputs.flags.disableMasterKey && !inputs.isMultiSign && !this.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         async () => (inputs.setFlags.length === 0 && inputs.clearFlags.length === 0 ? 'Set Flags and Clear Flags length is 0. No flags selected for update' : null),
                         async () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                         async () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         async () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                    ],
               },
               updateMetaData: {
                    required: ['seed'],
                    customValidators: [
                         async () => isValidSeed(inputs.seed),
                         async () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         async () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         async () => (inputs.tickSize ? isValidNumber(inputs.tickSize, 'Tick Size', 0, 15) : null),
                         async () => (inputs.transferRate ? isValidNumber(inputs.transferRate, 'Transfer Rate', 0, 100) : null),
                         async () => (inputs.domain && !this.utilsService.validateInput(inputs.domain) ? 'Domain cannot be empty' : null),
                         async () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         async () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
               },
               setDepositAuthAccounts: {
                    required: ['seed', 'depositAuthAddress'],
                    customValidators: [
                         async () => isValidSeed(inputs.seed),
                         async () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         async () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         async () => (await validateAddresses(inputs.depositAuthAddress, 'Deposit Auth')).join('; '),
                         async () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         async () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
               },
               setMultiSign: {
                    required: ['seed'],
                    customValidators: [
                         async () => isValidSeed(inputs.seed),
                         async () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         async () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         async () => (inputs.isMultiSign ? (await validateSigners(inputs.signers)).join('; ') : null),
                         async () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         async () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         async () => (inputs.isRegularKeyAddress && (inputs.regularKeyAddress === '' || inputs.regularKeyAddress === 'No RegularKey configured for account' || inputs.regularKeySeed === '') ? ' Regular Key address and seed must be present' : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                    ],
               },
               setRegularKey: {
                    required: ['seed'],
                    customValidators: [
                         async () => isValidSeed(inputs.seed),
                         // async () => (inputs.regularKeyAddress === '' || inputs.regularKeyAddress === 'No RegularKey configured for account' || inputs.regularKeySeed === '' ? ' Regular Key address and seed must be present' : null),
                         async () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         async () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         async () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         async () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
               },
               setNftMinterAddress: {
                    required: ['seed', 'nfTokenMinterAddress'],
                    customValidators: [
                         async () => isValidSeed(inputs.seed),
                         async () => (inputs.account_info === undefined || inputs.account_info === null ? `No account data found` : null),
                         async () => (inputs.account_info.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         async () => (await validateAddresses(inputs.nfTokenMinterAddress, 'NFT Minter')).join('; '),
                         async () => (inputs.isTicket ? isRequired(inputs.selectedSingleTicket, 'Ticket Sequence') : null),
                         async () => (inputs.isTicket ? isValidNumber(inputs.selectedSingleTicket, 'Ticket Sequence', 0) : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isRequired(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidXrpAddress(inputs.regularKeyAddress, 'Regular Key Address') : null),
                         async () => (inputs.isRegularKeyAddress && !inputs.isMultiSign ? isValidSecret(inputs.regularKeySeed, 'Regular Key Seed') : null),
                         async () => validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds),
                    ],
               },
               default: { required: [], customValidators: [] },
          };

          const config = actionConfig[action] || actionConfig['default'];

          // Check required fields
          for (const field of config.required) {
               if (field === 'signerQuorum' || field === 'signers') continue; // Skip non-string fields
               const err = isRequired(inputs[field] as string, field.charAt(0).toUpperCase() + field.slice(1));
               if (err) errors.push(err);
          }

          // Run custom validators
          if (config.customValidators) {
               for (const validator of config.customValidators) {
                    const err = await validator();
                    if (err) errors.push(err);
               }
          }

          // Always validate optional fields if provided
          // const multiErr = validateMultiSign(inputs.multiSignAddresses, inputs.multiSignSeeds);
          // if (multiErr) errors.push(multiErr);

          // if (errors.length == 0 && inputs.isMultiSign && (inputs.multiSignAddresses === 'No Multi-Sign address configured for account' || inputs.multiSignSeeds === '')) {
          //      errors.push('At least one signer address is required for multi-signing');
          // }

          return errors;
     }

     private async setTxOptionalFields(client: xrpl.Client, accountTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.selectedSingleTicket) {
               const ticketExists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(this.selectedSingleTicket));
               if (!ticketExists) {
                    return this.setError(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
               }
               this.utilsService.setTicketSequence(accountTx, this.selectedSingleTicket, true);
          } else {
               if (this.multiSelectMode && this.selectedTickets.length > 0) {
                    console.log('Setting multiple tickets:', this.selectedTickets);
                    this.utilsService.setTicketSequence(accountTx, accountInfo.result.account_data.Sequence, false);
               }
          }

          if (this.memoField) {
               this.utilsService.setMemoField(accountTx, this.memoField);
          }
     }

     public refreshUiAccountObjects(accountObjects: xrpl.AccountObjectsResponse, accountInfo: xrpl.AccountInfoResponse, wallet: xrpl.Wallet): void {
          const isMasterKeyDisabled = !!accountInfo?.result?.account_flags?.disableMasterKey;
          const signerAccounts = this.checkForSignerAccounts(accountObjects);
          const hasSignerAccounts = signerAccounts?.length > 0;
          const preAuthAccounts = this.utilsService.findDepositPreauthObjects(accountObjects);
          const hasPreAuthAccounts = preAuthAccounts?.length > 0;

          // === Tickets ===
          this.ticketArray = this.getAccountTickets(accountObjects);
          this.selectedTicket = this.ticketArray[0] || this.selectedTicket;

          // === Multi-Sign (Signer Entries) ===
          this.setMultiSignProperties(hasSignerAccounts, wallet);

          // === Master Key ===
          this.masterKeyDisabled = isMasterKeyDisabled;

          // === MultiSign Enabled / Usage State ===
          this.multiSigningEnabled = hasSignerAccounts;
          this.useMultiSign = isMasterKeyDisabled && hasSignerAccounts;

          // === DepositAuth / PreAuth ===
          this.setDepositAuthProperties(hasPreAuthAccounts, preAuthAccounts);

          // === Final cleanup ===
          this.clearFields(false);
     }

     private setMultiSignProperties(hasSignerAccounts: boolean, wallet: xrpl.Wallet): void {
          if (hasSignerAccounts) {
               const signerEntriesKey = `${wallet.classicAddress}signerEntries`;
               const signerEntries: SignerEntry[] = this.storageService.get(signerEntriesKey) || [];

               console.debug('signerEntries:', signerEntries);

               this.multiSignAddress = signerEntries.map(e => e.Account).join(',\n');
               this.multiSignSeeds = signerEntries.map(e => e.seed).join(',\n');
          } else {
               this.signerQuorum = 0;
               this.multiSignAddress = 'No Multi-Sign address configured for account';
               this.multiSignSeeds = '';
               // this.storageService.removeValue('signerEntries');
               this.storageService.removeValue(`${wallet.classicAddress}signerEntries`);
          }
     }

     private setDepositAuthProperties(hasPreAuthAccounts: boolean, preAuthAccounts: string[]): void {
          if (hasPreAuthAccounts) {
               this.depositAuthAddress = preAuthAccounts.join(',\n');
               this.isdepositAuthAddress = false;
               this.depositAuthEnabled = true;
          } else {
               this.depositAuthAddress = '';
               this.isdepositAuthAddress = false;
               this.depositAuthEnabled = false;
          }
     }

     public refreshUiAccountInfo(accountInfo: xrpl.AccountInfoResponse): void {
          const accountData = accountInfo?.result?.account_data;
          if (!accountData) return;

          const account = accountData.Account;
          const regularKey = accountData.RegularKey;
          const isMasterKeyDisabled = accountInfo?.result?.account_flags?.disableMasterKey ?? false;
          const nftTokenMinter = accountData.NFTokenMinter;

          // === Regular Key Properties ===
          this.setRegularKeyProperties(regularKey, account);

          // === Master Key ===
          this.masterKeyDisabled = isMasterKeyDisabled;

          // === Regular Key Signing Enabled ===
          this.regularKeySigningEnabled = !!regularKey;

          // === Regular Key Address Validity (used for UI state) ===
          this.isRegularKeyAddress = isMasterKeyDisabled && xrpl.isValidAddress(this.regularKeyAddress);

          // === NFT Minter ===
          this.setNfTokenMinterProperties(nftTokenMinter);

          // === Metadata (TickSize, TransferRate, Domain, etc.) ===
          this.refreshUiAccountMetaData(accountData);
     }

     private setRegularKeyProperties(regularKey: string | undefined, account: string): void {
          if (regularKey) {
               this.regularKeyAddress = regularKey;
               this.regularKeySeed = this.storageService.get(`${account}regularKeySeed`) || '';
          } else {
               // this.regularKeyAddress = 'No RegularKey configured for account';
               this.regularKeyAddress = '';
               this.regularKeySeed = '';
               this.isRegularKeyAddress = false;
          }
     }

     private setNfTokenMinterProperties(nftTokenMinter: string | undefined): void {
          if (nftTokenMinter) {
               this.isAuthorizedNFTokenMinter = false; // stays false until verified externally
               this.isNFTokenMinterEnabled = true;
               this.nfTokenMinterAddress = nftTokenMinter;
          } else {
               this.isAuthorizedNFTokenMinter = false;
               this.isNFTokenMinterEnabled = false;
               this.nfTokenMinterAddress = '';
          }
     }

     private refreshUiAccountMetaData(accountData: any): void {
          const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountData;

          const hasMetaData = TickSize || TransferRate || Domain || MessageKey || EmailHash;
          if (hasMetaData) {
               this.isUpdateMetaData = true;
               this.refreshUiIAccountMetaData(accountData); // your existing function
          } else {
               this.isUpdateMetaData = false;
               if (!EmailHash) {
                    this.userEmail = '';
                    this.avatarUrl = '';
               }
          }
     }

     async refreshUiIAccountMetaData(accountInfo: any) {
          // const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountInfo.account_data;
          const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountInfo;
          this.tickSize = TickSize || '';
          this.transferRate = TransferRate ? ((TransferRate / 1_000_000_000 - 1) * 100).toFixed(3) : '';
          this.domain = Domain ? this.utilsService.decodeHex(Domain) : '';
          this.isMessageKey = !!MessageKey;
          this.userEmail = EmailHash || '';
          this.avatarUrl = await this.loadAvatarForAccount(EmailHash);
          this.cdr.detectChanges();
     }

     async loadAvatarForAccount(emailHash: any): Promise<string> {
          // 1. Prefer on-ledger EmailHash => Gravatar
          if (emailHash) {
               return `https://api.dicebear.com/7.x/identicon/svg?seed=${emailHash}`;
          }

          // 2. Next prefer locally saved avatar (DiceBear from typed email)
          const savedAvatar = localStorage.getItem('avatarUrl');
          if (savedAvatar) {
               this.userEmail = localStorage.getItem('userEmail') || '';
               return savedAvatar;
          }

          // 3. Fallback: deterministic DiceBear using the account address
          // if (this.currentWallet) {
          //      const seed = encodeURIComponent(this.currentWallet.seed);
          //      return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;
          // }

          // otherwise leave blank or show default placeholder
          return '';
     }

     private getAccountTickets(accountObjects: xrpl.AccountObjectsResponse) {
          const getAccountTickets: string[] = [];
          if (accountObjects.result && Array.isArray(accountObjects.result.account_objects)) {
               accountObjects.result.account_objects.forEach(obj => {
                    if (obj.LedgerEntryType === 'Ticket') {
                         getAccountTickets.push(obj.TicketSequence.toString());
                    }
               });
          }
          return getAccountTickets;
     }

     private cleanUpSingleSelection() {
          // Check if selected ticket still exists in available tickets
          if (this.selectedSingleTicket && !this.ticketArray.includes(this.selectedSingleTicket)) {
               this.selectedSingleTicket = ''; // Reset to "Select a ticket"
          }
     }

     private cleanUpMultiSelection() {
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

     private async getWallet() {
          const wallet = await this.utilsService.getWallet(this.currentWallet.seed);
          if (!wallet) {
               throw new Error('ERROR: Wallet could not be created or is undefined');
          }
          return wallet;
     }

     loadSignerList(account: string) {
          const singerEntriesAccount = account + 'signerEntries';
          if (this.storageService.get(singerEntriesAccount) != null && this.storageService.get(singerEntriesAccount).length > 0) {
               this.signers = this.storageService.get(singerEntriesAccount).map((s: { Account: any; seed: any; SignerWeight: any }) => ({
                    account: s.Account,
                    seed: s.seed,
                    weight: s.SignerWeight,
               }));
          } else {
               this.clearSignerList();
          }
     }

     clearSignerList() {
          this.signers = [{ account: '', seed: '', weight: 1 }];
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

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.showToastMessage('IOU Token Issuer copied!');
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
                    // checks: this.existingChecks,
                    getDescription: (count: number) => (count === 1 ? 'check' : 'checks'),
                    dynamicText: 'created', // Add dynamic text here
                    showLink: true,
               },
               cash: {
                    // checks: this.cashableChecks,
                    getDescription: (count: number) => (count === 1 ? 'check that can be cashed' : 'checks that can be cashed'),
                    dynamicText: '', // Empty for no additional text
                    showLink: true,
               },
               cancel: {
                    // checks: this.cancellableChecks,
                    getDescription: (count: number) => (count === 1 ? 'check that can be cancelled' : 'checks that can be cancelled'),
                    dynamicText: '', // Dynamic text before the count
                    showLink: true,
               },
          };

          const config = tabConfig[this.activeTab as keyof typeof tabConfig];
          if (!config) return null;

          const walletName = this.currentWallet.name || 'selected';
          // const count = config.checks.length;
          const count = 0;

          // Build the dynamic text part (with space if text exists)
          const dynamicText = config.dynamicText ? `${config.dynamicText} ` : '';

          let message = `The <code>${walletName}</code> wallet has ${dynamicText}${count} ${config.getDescription(count)}.`;

          if (config.showLink && count > 0) {
               const link = `${this.url}account/${this.currentWallet.address}/checks`;
               message += `<br><a href="${link}" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View checks on XRPL Win</a>`;
          }

          return message;
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

     clearFields(clearAllFields: boolean) {
          if (clearAllFields) {
               this.ticketSequence = '';
               this.useMultiSign = false;
               this.isAuthorizedNFTokenMinter = false;
               this.isdepositAuthAddress = false;
               this.isUpdateMetaData = false;
               this.isRegularKeyAddress = false;
               this.clearMessages();
               this.clearWarning();
          }

          this.isSimulateEnabled = false;
          this.selectedTicket = '';
          this.isTicket = false;
          this.isTicketEnabled = false;
          this.multiSelectMode = false;
          this.selectedSingleTicket = '';
          this.selectedTickets = [];
          this.isMultiSign = false;
          this.memoField = '';
          this.isMemoEnabled = false;
          this.cdr.detectChanges();
     }

     private clearMessages() {
          const fadeDuration = 400; // ms
          this.result = '';
          this.isError = false;
          this.isSuccess = false;
          this.txHash = '';
          this.txHashes = [];
          this.txErrorHashes = [];
          this.txResult = [];
          this.paymentTx = [];
          this.successMessage = '';
          this.errorMessage = '';
          this.cdr.detectChanges();
     }

     async showSpinnerWithDelay(message: string, delayMs: number = 200) {
          this.spinner = true;
          this.updateSpinnerMessage(message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
     }

     isValidResponse(response: any): response is { success: boolean; message: xrpl.TxResponse<xrpl.SubmittableTransaction> | string } {
          return response && typeof response === 'object' && 'success' in response && 'message' in response && response.success === true;
     }

     private formatSignerEntries(signerEntries: { Account: string; SignerWeight: number; seed: string }[]) {
          return signerEntries.map(entry => ({
               SignerEntry: {
                    Account: entry.Account,
                    SignerWeight: entry.SignerWeight,
               },
          }));
     }

     private createSignerEntries() {
          return this.signers
               .filter(s => s.account && s.weight > 0)
               .map(s => ({
                    Account: s.account,
                    SignerWeight: Number(s.weight),
                    seed: s.seed,
               }));
     }

     clearUiIAccountMetaData() {
          this.tickSize = '';
          this.transferRate = '';
          this.domain = '';
          this.isMessageKey = false;
     }

     toggleMessageKey() {
          if (this.isMessageKey) {
               this.isMessageKey = false;
          } else {
               this.isMessageKey = true;
          }
     }

     toggleFlag(key: 'asfRequireDest' | 'asfRequireAuth' | 'asfDisallowXRP' | 'asfDisableMaster' | 'asfNoFreeze' | 'asfGlobalFreeze' | 'asfDefaultRipple' | 'asfDepositAuth' | 'asfAuthorizedNFTokenMinter' | 'asfDisallowIncomingNFTokenOffer' | 'asfDisallowIncomingCheck' | 'asfDisallowIncomingPayChan' | 'asfDisallowIncomingTrustline' | 'asfAllowTrustLineClawback' | 'asfAllowTrustLineLocking') {
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          (Object.keys(this.flags) as (keyof typeof this.flags)[]).forEach(key => {
               if (this.flags[key]) {
                    sum |= 1 << this.FLAG_VALUES[key];
               }
          });
          this.totalFlagsValue = sum;
          this.totalFlagsHex = '0x' + sum.toString(16).toUpperCase().padStart(8, '0');
     }

     // private updateFlagTotal() {
     //      let sum = 0;
     //      if (this.flags.asfRequireDest) sum |= xrpl.AccountSetAsfFlags.asfRequireDest;
     //      if (this.flags.asfRequireAuth) sum |= xrpl.AccountSetAsfFlags.asfRequireAuth;
     //      if (this.flags.asfDisallowXRP) sum |= xrpl.AccountSetAsfFlags.asfDisallowXRP;
     //      if (this.flags.asfDisableMaster) sum |= xrpl.AccountSetAsfFlags.asfDisableMaster;
     //      if (this.flags.asfNoFreeze) sum |= xrpl.AccountSetAsfFlags.asfNoFreeze;
     //      if (this.flags.asfGlobalFreeze) sum |= xrpl.AccountSetAsfFlags.asfGlobalFreeze;
     //      if (this.flags.asfDefaultRipple) sum |= xrpl.AccountSetAsfFlags.asfDefaultRipple;
     //      if (this.flags.asfDepositAuth) sum |= xrpl.AccountSetAsfFlags.asfDepositAuth;
     //      if (this.flags.asfAuthorizedNFTokenMinter) sum |= xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter;
     //      if (this.flags.asfDisallowIncomingNFTokenOffer) sum |= xrpl.AccountSetAsfFlags.asfDisallowIncomingNFTokenOffer;
     //      if (this.flags.asfDisallowIncomingCheck) sum |= xrpl.AccountSetAsfFlags.asfDisallowIncomingCheck;
     //      if (this.flags.asfDisallowIncomingPayChan) sum |= xrpl.AccountSetAsfFlags.asfDisallowIncomingPayChan;
     //      if (this.flags.asfDisallowIncomingTrustline) sum |= xrpl.AccountSetAsfFlags.asfDisallowIncomingTrustline;
     //      if (this.flags.asfAllowTrustLineClawback) sum |= xrpl.AccountSetAsfFlags.asfAllowTrustLineClawback;
     //      if (this.flags.asfAllowTrustLineLocking) sum |= xrpl.AccountSetAsfFlags.asfAllowTrustLineLocking;

     //      this.totalFlagsValue = sum;
     //      this.totalFlagsHex = '0x' + sum.toString(16).toUpperCase().padStart(8, '0');
     // }

     clearFlagsValue() {
          this.flags = {
               asfRequireDest: false,
               asfRequireAuth: false,
               asfDisallowXRP: false,
               asfDisableMaster: false,
               asfNoFreeze: false,
               asfGlobalFreeze: false,
               asfDefaultRipple: false,
               asfDepositAuth: false,
               asfAuthorizedNFTokenMinter: false,
               asfDisallowIncomingNFTokenOffer: false,
               asfDisallowIncomingCheck: false,
               asfDisallowIncomingPayChan: false,
               asfDisallowIncomingTrustline: false,
               asfAllowTrustLineClawback: false,
               asfAllowTrustLineLocking: false,
          };
          this.totalFlagsValue = 0;
          this.totalFlagsHex = '0x0';
     }

     private updateSpinnerMessage(message: string) {
          this.spinnerMessage = message;
          this.cdr.detectChanges();
          console.debug('Spinner message updated:', message);
     }

     private setErrorProperties() {
          // this.isSuccess = false;
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
          // this.isError = false;
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
     }
}
