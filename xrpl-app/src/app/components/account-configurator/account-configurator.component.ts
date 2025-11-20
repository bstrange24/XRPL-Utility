import { OnInit, AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, ViewChildren, QueryList, inject, afterRenderEffect, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
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
     seed?: string;
     accountInfo?: any;
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
     imports: [CommonModule, FormsModule, AppWalletDynamicInputComponent, NavbarComponent, LucideAngularModule, NgIcon, DragDropModule, OverlayModule],
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
     @ViewChild('dropdownTemplate') dropdownTemplate!: TemplateRef<any>;
     @ViewChild('dropdownOrigin') dropdownOrigin!: ElementRef; // We'll add this to the input
     private overlayRef: OverlayRef | null = null;
     private readonly injector = inject(Injector);
     configurationType: 'holder' | 'exchanger' | 'issuer' | null = null;
     ticketArray: string[] = [];
     selectedTickets: string[] = [];
     selectedSingleTicket: string = '';
     multiSelectMode: boolean = false;
     selectedTicket: string = '';
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
     destinationField: string = '';
     destinations: DropdownItem[] = [];
     customDestinations: { name?: string; address: string }[] = [];
     showDropdown: boolean = false;
     dropdownOpen: boolean = false;
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
          isIssuer: false,
     };
     showSecret: boolean = false;
     environment: string = '';
     activeTab: string = 'modifyAccountFlags'; // default
     encryptionType: string = '';
     hasWallets: boolean = true;
     url: string = '';
     editingIndex!: (index: number) => boolean;
     tempName: string = '';
     userEmail: string = '';
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

     setTab(tab: string) {
          this.activeTab = tab;
          this.clearFields(true);
          this.getAccountDetails();
          this.ui.clearMessages();
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
               await this.getAccountDetails();
          } else if (this.currentWallet.address) {
               this.ui.setError('Failed to refresh balance');
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
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);
          this.configurationType = null;

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const inputs: ValidationInputs = { seed: this.currentWallet.seed, accountInfo: accountInfo };

               const errors = await this.validationService.validate('AccountInfo', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               AppConstants.FLAGS.forEach(flag => {
                    const flagKey = AppConstants.FLAGMAP[flag.name as keyof typeof AppConstants.FLAGMAP];
                    if (flagKey) {
                         const isEnabled = !!accountInfo.result.account_flags?.[flagKey as keyof typeof accountInfo.result.account_flags];
                         const flagName = flag.name as keyof AccountFlags;
                         this.flags[flagName] = isEnabled;
                    }
               });

               await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

               this.refreshUIData(wallet, accountInfo, accountObjects);
               this.loadSignerList(wallet.classicAddress);

               this.updateTickets(accountObjects);

               this.clearFields(false);
               this.cdr.detectChanges();
          } catch (error: any) {
               console.error('Error in getAccountDetails:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving getAccountDetails in ${this.executionTime}ms`);
          }
     }

     async updateFlags() {
          console.log('Entering updateFlags');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

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
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);

               const { setFlags, clearFlags } = this.utilsService.getFlagUpdates(accountInfo.result.account_flags);

               inputs.accountInfo = accountInfo;
               inputs.flags = accountInfo.result.account_flags;
               inputs.setFlags = setFlags;
               inputs.clearFlags = clearFlags;

               const errors = await this.validationService.validate('UpdateAccountFlags', { inputs, client, accountInfo });
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Flag Modifications (no changes will be made)...' : 'Submitting Flag Modifications to Ledger...', 200);

               const allFlagResults: any[] = [];

               for (const flag of setFlags) {
                    const result = await this.handleFlagTx(client, wallet, accountInfo, fee, currentLedger, serverInfo, 'SetFlag', flag, this.memoField);
                    allFlagResults.push(result);
                    this.ui.txResult.push(result.result);
                    this.updateTxResult(this.ui.txResult);
               }

               for (const flag of clearFlags) {
                    const result = await this.handleFlagTx(client, wallet, accountInfo, fee, currentLedger, serverInfo, 'ClearFlag', flag, this.memoField);
                    allFlagResults.push(result);
                    this.ui.txResult.push(result.result);
                    this.updateTxResult(this.ui.txResult);
               }

               const succeeded = allFlagResults.filter(r => r.success);
               const failed = allFlagResults.filter(r => !r.success);

               if (succeeded.length > 0) {
                    this.ui.successMessage = `${succeeded.length} Flag Transaction(s) Succeeded.`;
                    this.ui.successMessage += ` [ ` + this.getFlagNames(succeeded) + ` ]`;
                    this.ui.isSuccess = true;
                    succeeded.forEach(h => h.hash && this.ui.txHashes.push(h.hash));
               }

               if (failed.length > 0) {
                    this.ui.errorMessage = `${failed.length} Flag Transaction(s) Failed.`;
                    this.ui.errorMessage += ` [ ` + this.getFlagNames(failed) + ` ]`;
                    this.ui.isError = true;
                    failed.forEach(h => h.hash && this.ui.txErrorHashes.push(h.hash));
               }

               if (!this.ui.isSimulateEnabled) {
                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               }
          } catch (error: any) {
               console.error('Error in updateFlags:', error);
               this.ui.errorMessage = `ERROR: ${error.message || 'Unknown error'}`;
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateFlags in ${this.executionTime}ms`);
          }
     }

     async updateMetaData() {
          console.log('Entering updateMetaData');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

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
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'updateMetaData');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
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
                    this.ui.setWarning(`No meta data fields selected for modification.`);
                    return;
               }

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, accountSetTx, fee)) {
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               updates.forEach(update => update());

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Meta Data Update (no changes will be made)...' : 'Submitting Meta Data Update to Ledger...', 200);

               this.ui.paymentTx.push(accountSetTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
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

               this.isUpdateMetaData = true;

               this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = 'Updated Meta Data successfully!';

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Meta Data Update successfully!';
               }
          } catch (error: any) {
               console.error('Error in updateMetaData:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving updateMetaData in ${this.executionTime}ms`);
          }
     }

     async setDepositAuthAccounts(authorizeFlag: 'Y' | 'N'): Promise<void> {
          console.log('Entering setDepositAuthAccounts');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

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
               return this.ui.setError('ERROR: Deposit Auth address list is empty');
          }

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, accountObjects, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', 'deposit_preauth'), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, accountObjects);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'setDepositAuthAccounts');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               // Validate each address
               for (const authorizedAddress of addressesArray) {
                    // Check for existing preauthorization
                    const alreadyAuthorized = accountObjects.result.account_objects.some((obj: any) => obj.Authorize === authorizedAddress);
                    if (authorizeFlag === 'Y' && alreadyAuthorized) {
                         return this.ui.setError(`ERROR: Preauthorization already exists for ${authorizedAddress} (tecDUPLICATE). Use Unauthorize to remove`);
                    }
                    if (authorizeFlag === 'N' && !alreadyAuthorized) {
                         return this.ui.setError(`ERROR: No preauthorization exists for ${authorizedAddress} to unauthorize`);
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
                         return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
                    }

                    this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Setting Deposit Auth (no changes will be made)...' : 'Submitting Deposit Auth Accounts to Ledger...', 200);

                    // STORE IT FOR DISPLAY
                    this.ui.paymentTx.push(depositPreauthTx);
                    this.updatePaymentTx();

                    let response: any;
                    if (this.ui.isSimulateEnabled) {
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

                    // this.utilsService.logObjects('response', response);
                    // this.utilsService.logObjects('response.result.hash', response.result.hash ? response.result.hash : response.result.tx_json.hash);

                    this.ui.txResult.push(response.result);
                    this.updateTxResult(this.ui.txResult);

                    // this.utilsService.logObjects('response', response);
                    const isSuccess = this.utilsService.isTxSuccessful(response);
                    if (!isSuccess) {
                         console.warn(`Deposit Authorization failed:`, response);
                         this.ui.errorMessage = `Deposit Authorization Transaction(s) Failed`;
                         this.ui.setError(this.ui.errorMessage);
                         this.ui.txErrorHashes.push(response.result.hash ? response.result.hash : response.result.tx_json.hash);
                    } else {
                         const hash = response.result.hash ?? response.result.tx_json.hash;
                         this.ui.txHashes.push(hash); // ← push to array
                         console.log(`Deposit Authorization successfully. TxHash:`, response.result.hash ? response.result.hash : response.result.tx_json.hash);
                    }
               }

               this.ui.setSuccess(this.ui.result);

               if (!this.ui.isSimulateEnabled) {
                    this.ui.successMessage = `Deposit Authorization ${authorizeFlag === 'Y' ? 'set' : 'removed'} successfully!`;

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = 'Simulated Deposit Authorization successfully!';
               }
          } catch (error: any) {
               console.error('Error in setDepositAuthAccounts:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setDepositAuthAccounts in ${this.executionTime}ms`);
          }
     }

     async setMultiSign(enableMultiSignFlag: 'Y' | 'N') {
          console.log('Entering setMultiSign');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

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
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'setMultiSign');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
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
                         return this.ui.setError('ERROR: Signer Quorum must be greater than 0.');
                    }
                    signerListTx.SignerQuorum = Number(this.signerQuorum);
               }

               if (this.utilsService.isInsufficientXrpBalance1(serverInfo, accountInfo, '0', wallet.classicAddress, signerListTx, fee)) {
                    return this.ui.setError('ERROR: Insufficent XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? 'Simulating Setting Multi Sign (no changes will be made)...' : 'Submitting Multi-Sign to Ledger...', 200);

               this.ui.paymentTx.push(signerListTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, signerListTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, signerListTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
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

               if (!this.ui.isSimulateEnabled) {
                    this.ui.txHash = response.result.hash ? response.result.hash : response.result.tx_json.hash;

                    if (enableMultiSignFlag === 'Y') {
                         this.ui.successMessage = 'Set Multi Sign successfully!';
                         this.storageService.set(wallet.classicAddress + 'signerEntries', signerEntries);
                    } else {
                         this.ui.successMessage = 'Removed Multi Sign successfully!';
                         // this.storageService.removeValue('signerEntries');
                         this.storageService.removeValue(wallet.classicAddress + 'signerEntries');
                         this.signerQuorum = 0;
                    }

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = `Simulated Setting Multi Sign ${enableMultiSignFlag === 'Y' ? 'creation' : 'removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error in setMultiSign:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setMultiSign in ${this.executionTime}ms`);
          }
     }

     async setRegularKey(enableRegularKeyFlag: 'Y' | 'N') {
          console.log('Entering setRegularKey');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

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
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'setRegularKey');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               if (this.regularKeyAddress === '' || this.regularKeyAddress === 'No RegularKey configured for account' || this.regularKeySeed === '') {
                    return this.ui.setError(`ERROR: Regular Key address and seed must be present`);
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
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? `Simulating ${enableRegularKeyFlag === 'Y' ? 'Setting' : 'Remove'} Regular Key (no changes will be made)...` : `Submitting Regular Key ${enableRegularKeyFlag === 'Y' ? 'Set' : 'Removal'} to Ledger...`, 200);

               this.ui.paymentTx.push(setRegularKeyTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, setRegularKeyTx);
               } else {
                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, setRegularKeyTx, false, '', fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
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
                    const regularKeysAccount = wallet.classicAddress + 'regularKey';
                    const regularKeySeedAccount = wallet.classicAddress + 'regularKeySeed';
                    if (enableRegularKeyFlag === 'Y') {
                         this.ui.successMessage = 'Set Regular Key successfully!';
                         this.storageService.set(regularKeysAccount, this.regularKeyAddress);
                         this.storageService.set(regularKeySeedAccount, this.regularKeySeed);
                    } else {
                         this.ui.successMessage = 'Removed Regular Key successfully!';
                         this.storageService.removeValue(regularKeysAccount);
                         this.storageService.removeValue(regularKeySeedAccount);
                    }

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = `Simulated ${enableRegularKeyFlag === 'Y' ? 'Set Regular Key' : 'Regular Key removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error in setRegularKey:', error);
               this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setRegularKey in ${this.executionTime}ms`);
          }
     }

     async setNftMinterAddress(enableNftMinter: 'Y' | 'N') {
          console.log('Entering setNftMinterAddress');
          const startTime = Date.now();
          this.ui.clearMessages();
          this.ui.updateSpinnerMessage(``);

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
               return this.ui.setError('ERROR: NFT Minter address list is empty');
          }

          try {
               const [client, wallet] = await Promise.all([this.xrplService.getClient(), this.getWallet()]);

               const [accountInfo, fee, currentLedger, serverInfo] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.calculateTransactionFee(client), this.xrplService.getLastLedgerIndex(client), this.xrplService.getXrplServerInfo(client, 'current', '')]);
               // this.utilsService.logAccountInfoObjects(accountInfo, null);
               // this.utilsService.logLedgerObjects(fee, currentLedger, serverInfo);

               inputs.accountInfo = accountInfo;

               const errors = await this.validateInputs(inputs, 'setNftMinterAddress');
               if (errors.length > 0) {
                    return this.ui.setError(errors.length === 1 ? errors[0] : `Errors:\n• ${errors.join('\n• ')}`);
               }

               try {
                    addressesArray.map((address: any) => accountInfo);
               } catch (error: any) {
                    if (error.data?.error === 'actNotFound') {
                         const missingAddress = addressesArray.find((addr: any) => error.data?.error_message?.includes(addr)) || addressesArray[0];
                         return this.ui.setError(`ERROR: Account ${missingAddress} does not exist (tecNO_TARGET)`);
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
                    return this.ui.setError('ERROR: Insufficient XRP to complete transaction');
               }

               this.ui.showSpinnerWithDelay(this.ui.isSimulateEnabled ? `Simulating ${enableNftMinter === 'Y' ? 'Setting' : 'Remove'} NFT Minter (no changes will be made)...` : `Submitting NFT Minter ${enableNftMinter === 'Y' ? 'Set' : 'Removal'} to Ledger...`, 200);

               this.ui.paymentTx.push(accountSetTx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, accountSetTx);
               } else {
                    const { useRegularKeyWalletSignTx, regularKeyWalletSignTx } = await this.utilsService.getRegularKeyWallet(this.useMultiSign, this.isRegularKeyAddress, this.regularKeySeed);

                    const signedTx = await this.xrplTransactions.signTransaction(client, wallet, accountSetTx, useRegularKeyWalletSignTx, regularKeyWalletSignTx, fee, this.useMultiSign, this.multiSignAddress, this.multiSignSeeds);

                    if (!signedTx) {
                         return this.ui.setError('ERROR: Failed to sign Payment transaction.');
                    }

                    response = await this.xrplTransactions.submitTransaction(client, signedTx);
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
                    this.ui.successMessage = `${enableNftMinter === 'Y' ? 'Set NFT Minter Address' : 'NFT Minter Address removal'} successfully!`;

                    const [updatedAccountInfo, updatedAccountObjects] = await Promise.all([this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''), this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', '')]);

                    await this.refreshWallets(client, [wallet.classicAddress]).catch(console.error);

                    this.refreshUIData(wallet, updatedAccountInfo, updatedAccountObjects);
                    this.utilsService.loadSignerList(wallet.classicAddress, this.signers);
                    this.updateTickets(updatedAccountObjects);
                    this.clearFields(false);
                    this.cdr.detectChanges();
               } else {
                    this.ui.successMessage = `Simulated ${enableNftMinter === 'Y' ? 'Set NFT Minter Address' : 'NFT Minter Address removal'} successfully!`;
               }
          } catch (error: any) {
               console.error('Error:', error);
               return this.ui.setError(`ERROR: ${error.message || 'Unknown error'}`);
          } finally {
               this.ui.spinner = false;
               this.executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving setNftMinterAddress in ${this.executionTime}ms`);
          }
     }

     private async handleFlagTx(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: any, currentLedger: any, serverInfo: any, type: 'SetFlag' | 'ClearFlag', flagValue: string, memoField: string): Promise<{ flagType: 'SetFlag' | 'ClearFlag'; flagName: string; hash?: string; success: boolean; error?: string; result?: any }> {
          try {
               const response = await this.submitFlagTransaction(client, wallet, accountInfo, fee, currentLedger, serverInfo, type === 'SetFlag' ? { SetFlag: flagValue } : { ClearFlag: flagValue }, memoField);

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

     private async submitFlagTransaction(client: xrpl.Client, wallet: xrpl.Wallet, accountInfo: any, fee: any, currentLedger: any, serverInfo: any, flagPayload: any, memoField: any) {
          console.log('Entering submitFlagTransaction');
          const startTime = Date.now();

          if (flagPayload.SetFlag) {
               const flagToUpdate = Array.from(AppConstants.FLAGS.values()).find((flag: any) => flag.value === flagPayload.SetFlag);
               this.ui.updateSpinnerMessage(`Submitting ${flagToUpdate ? flagToUpdate.label : 'Flag'} set flag to the Ledger...`);
          }

          if (flagPayload.ClearFlag) {
               const flagToUpdate = Array.from(AppConstants.FLAGS.values()).find((flag: any) => flag.value === flagPayload.ClearFlag);
               this.ui.updateSpinnerMessage(`Submitting ${flagToUpdate ? flagToUpdate.label : 'Flag'} clear flag to the Ledger...`);
          }

          try {
               let regularKeyWalletSignTx: any = '';
               let useRegularKeyWalletSignTx = false;
               if (this.isRegularKeyAddress && !this.useMultiSign) {
                    console.log('Using Regular Key Seed for transaction signing');
                    regularKeyWalletSignTx = await this.utilsService.getWallet(this.regularKeySeed);
                    useRegularKeyWalletSignTx = true;
               }

               const tx = {
                    TransactionType: 'AccountSet',
                    Account: wallet.classicAddress,
                    ...flagPayload,
                    Fee: fee,
                    LastLedgerSequence: currentLedger + AppConstants.LAST_LEDGER_ADD_TIME,
               };

               await this.setTxOptionalFields(client, tx, wallet, accountInfo);

               // STORE IT FOR DISPLAY
               this.ui.paymentTx.push(tx);
               this.updatePaymentTx();

               let response: any;

               if (this.ui.isSimulateEnabled) {
                    response = await this.xrplTransactions.simulateTransaction(client, tx);
               } else {
                    let signedTx: { tx_blob: string; hash: string } | null = null;

                    if (this.useMultiSign) {
                         const signerAddresses = this.utilsService.getMultiSignAddress(this.multiSignAddress);
                         if (signerAddresses.length === 0) {
                              return this.ui.setError('ERROR: No signer addresses provided for multi-signing');
                         }

                         const signerSeeds = this.utilsService.getMultiSignSeeds(this.multiSignSeeds);
                         if (signerSeeds.length === 0) {
                              return this.ui.setError('ERROR: No signer seeds provided for multi-signing');
                         }

                         try {
                              const result = await this.utilsService.handleMultiSignTransaction({ client, wallet, tx: tx, signerAddresses, signerSeeds, fee });
                              signedTx = result.signedTx;
                              tx.Signers = result.signers;

                              console.debug('Payment with Signers:', tx);
                              console.debug('SignedTx:', signedTx);

                              if (!signedTx) {
                                   return this.ui.setError('ERROR: No valid signature collected for multisign transaction');
                              }

                              const multiSignFee = String((signerAddresses.length + 1) * Number(await this.xrplService.calculateTransactionFee(client)));
                              console.debug(`multiSignFee: ${multiSignFee}`);
                              tx.Fee = multiSignFee;
                              const finalTx = xrpl.decode(signedTx.tx_blob);
                              console.debug('Decoded Final Tx:', finalTx);
                         } catch (err: any) {
                              return { success: false, message: `ERROR: ${err.message}` };
                         }
                    } else {
                         const preparedTx = await client.autofill(tx);
                         console.debug(`preparedTx:`, preparedTx);
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
          // this.utilsService.logAccountInfoObjects(updatedAccountInfo, updatedAccountObjects);

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
                    customValidators: [async () => isValidSeed(inputs.seed), async () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null)],
               },
               // toggleMetaData: {
               //      required: ['seed'],
               //      customValidators: [async () => isValidSeed(inputs.seed)],
               // },
               updateFlags: {
                    required: ['seed'],
                    customValidators: [
                         async () => isValidSeed(inputs.seed),
                         async () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         async () => (inputs.accountInfo.result?.account_flags?.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
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
                         async () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
                         async () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
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
                         async () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         async () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
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
                         async () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         async () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
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
                         async () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         async () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
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
                         async () => (inputs.accountInfo === undefined || inputs.accountInfo === null ? `No account data found` : null),
                         async () => (inputs.accountInfo.result.account_flags.disableMasterKey && !inputs.isMultiSign && !inputs.isRegularKeyAddress ? 'Master key is disabled. Must sign with Regular Key or Multi-sign.' : null),
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
                    return this.ui.setError(`ERROR: Ticket Sequence ${this.selectedSingleTicket} not found for account ${wallet.classicAddress}`);
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

     // private getAccountTickets(accountObjects: xrpl.AccountObjectsResponse): string[] {
     //      const objects = accountObjects.result?.account_objects;
     //      if (!Array.isArray(objects)) return [];

     //      const tickets = objects.reduce((acc: number[], obj) => {
     //           if (obj.LedgerEntryType === 'Ticket' && typeof obj.TicketSequence === 'number') {
     //                acc.push(obj.TicketSequence);
     //           }
     //           return acc;
     //      }, []);

     //      return tickets.sort((a, b) => a - b).map(String);
     // }

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

     getFlagNames(results: any): string {
          return results
               .map((r: any) =>
                    r.flagName
                         .replace(/^asf/, '')
                         .replace(/([A-Z])/g, ' $1')
                         .replace(/\bN F T\b/g, 'NFT')
                         .replace(/\bI O U\b/g, 'IOU')
                         .replace(/\bX R P\b/g, 'XRP')
                         .trim()
               )
               .join(' - ');
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

     copyCheckId(checkId: string) {
          navigator.clipboard.writeText(checkId).then(() => {
               this.ui.showToastMessage('Check ID copied!');
          });
     }

     copyIOUIssuanceAddress(mpt_issuance_id: string) {
          navigator.clipboard.writeText(mpt_issuance_id).then(() => {
               this.ui.showToastMessage('IOU Token Issuer copied!');
          });
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
               this.ui.clearMessages();
               this.ui.clearWarning();
          }

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
