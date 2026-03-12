import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../core/app.constants';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { ToastService } from '../../services/toast/toast.service';
import { ValidationService } from '../../services/validation/transaction-validation-rule.service';
import { Wallet, WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TooltipLinkComponent } from '../shared/tooltip-link/tooltip-link.component';
import { TransactionOptionsComponent } from '../shared/transaction-options/transaction-options.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TransactionPreviewComponent } from '../transaction-preview/transaction-preview.component';
import { WalletPanelComponent } from '../wallet-panel/wallet-panel.component';
import { SelectItem, SelectSearchDropdownComponent } from '../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { CredentialItem } from '../../models/interface-items.model';
import { AcccountDataService } from '../../services/account-data/acccount-data.service';
import { TxEnvironmentService } from '../../services/transaction-environment/tx-environment.service';
import { CredentialTransactionOrchestratorService, CredentialTxConfig, CredentialTxType } from '../../services/credentials/credential-transaction-orchestrator/credential-transaction-orchestrator.service';
import { CredentialUtilService } from '../../services/credentials/credential-util/credential-util.service';
// import { RequirementsInfoComponent } from '../../components/shared/requirements-info/requirements-info/requirements-info.component';
import { RequirementsInfoComponent } from './ui-components/credential-requirements-info/requirements-info/requirements-info.component';
import { ActivatedRoute } from '@angular/router';
import { WalletDestinationBase } from '../../services/wallets/walletDestinationBase';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../services/transaction-dropdown/transaction-dropdown.service';
import { XrplExpirationInputComponent } from '../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { XrplDateService } from '../../core/xrpl-date.service';
import { CredentialStore } from '../../services/credentials/credential-store/credential-store.service';

@Component({
     selector: 'app-credentials',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, OverlayModule, NavbarComponent, WalletPanelComponent, TransactionPreviewComponent, TransactionOptionsComponent, TooltipLinkComponent, SelectSearchDropdownComponent, XrplExpirationInputComponent, RequirementsInfoComponent],
     templateUrl: './credentials.component.html',
     styleUrl: './credentials.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCredentialsComponent extends WalletDestinationBase implements OnInit {
     public readonly walletManagerService = inject(WalletManagerService);
     private readonly validationService = inject(ValidationService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     private readonly credentialTransactionOrchestratorService = inject(CredentialTransactionOrchestratorService);
     public readonly transactionUiService = inject(TransactionUiService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly credentialUtilService = inject(CredentialUtilService);
     public readonly credentialStore = inject(CredentialStore);

     activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');
     private listCache = { create: [] as any[], accept: [] as any[], delete: [] as any[], verify: [] as any[] };
     private dropdownCache: any[] = [];

     readonly credentialVm = computed(() => {
          // const wallet = this.currentWallet();
          const walletVm = this.walletManager.walletVm();
          const tab = this.activeTab();

          const issued = this.credentialStore.get('existingCredentials');
          const received = this.credentialStore.get('subjectCredentials');

          if (!walletVm.wallet) {
               return {
                    list: [],
                    dropdown: [],
                    stats: {},
                    hasCredentials: false,
               };
          }

          const pendingIssued: any[] = [];
          const acceptedIssued: any[] = [];
          const pendingReceived: any[] = [];
          const acceptedReceived: any[] = [];

          const normalize = (c: any, issuedByMe: boolean) => {
               const accepted = typeof c.Flags === 'number' ? (c.Flags & 65536) !== 0 : c.Flags === 'Credential accepted';

               return {
                    ...c,
                    accepted,
                    issuedByMe,
                    selectable: tab !== 'create' && (tab !== 'verify' || issuedByMe),
               };
          };

          for (const c of issued) {
               const n = normalize(c, true);
               (n.accepted ? acceptedIssued : pendingIssued).push(n);
          }

          for (const c of received) {
               const n = normalize(c, false);
               (n.accepted ? acceptedReceived : pendingReceived).push(n);
          }

          let list: any[] = [];

          switch (tab) {
               case 'create':
                    list = this.listCache.create;
                    list.length = 0;
                    list.push(...pendingIssued, ...acceptedIssued);
                    break;
               case 'delete':
                    list = this.listCache.delete;
                    list.length = 0;
                    list.push(...pendingIssued, ...acceptedIssued);
                    break;
               case 'accept':
                    list = this.listCache.accept;
                    list.length = 0;
                    list.push(...(pendingReceived.length ? pendingReceived : acceptedReceived));
                    break;
               case 'verify':
                    list = this.listCache.verify;
                    list.length = 0;
                    list.push(...pendingIssued, ...acceptedIssued, ...pendingReceived, ...acceptedReceived);
                    break;
          }

          const dropdown = this.dropdownCache;
          dropdown.length = 0;

          for (const c of list) {
               dropdown.push({
                    id: c.index,
                    display: c.CredentialType || 'Unknown',
                    secondary: `${c.index.slice(0, 12)}...`,
               });
          }

          return {
               list,
               dropdown,

               stats: {
                    issued: issued.length,
                    received: received.length,
                    pendingIssued: pendingIssued.length,
                    acceptedIssued: acceptedIssued.length,
                    pendingReceived: pendingReceived.length,
                    acceptedReceived: acceptedReceived.length,
               },

               hasCredentials: list.length > 0,
          };
     });

     readonly vm = computed(() => {
          const tab = this.activeTab();
          // const wallet = this.currentWallet();
          const walletVm = this.walletManager.walletVm();
          const credentialVm = this.credentialVm();

          const selectedId = this.credentialStore.get('credentialID');

          const selectedCredentialItem = selectedId ? (credentialVm.dropdown.find(i => i.id === selectedId) ?? null) : null;

          return {
               tab,
               walletVm,
               walletName: walletVm.wallet?.name || 'Selected wallet',
               address: walletVm.wallet?.address ?? '',

               selectedCredentialItem,

               summaryMessage: this.credentialUtilService.summaryMessage(tab),
               actionButtonLabel: this.credentialUtilService.actionButtonLabel(tab),
               actionButtonClass: this.credentialUtilService.actionButtonClass(tab),

               hasCredentials: credentialVm.hasCredentials,
          };
     });

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ['create', 'accept', 'delete', 'verify'] as const, tab => this.setTab(tab));
          this.txUiService.clearAllOptions();
          this.transactionDropdownService.loadCustomDestinations();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          await this.getCredentialsForAccount(false);
     }

     canSelectCredential(cred: any): boolean {
          // const wallet = this.currentWallet();
          const walletVm = this.walletManager.walletVm();
          const tab = this.activeTab();
          if (!walletVm.wallet) return false;
          if (tab === 'create') return false;
          if (tab === 'verify') return cred.Issuer === walletVm.wallet.address;
          return true;
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          this.currentWallet.set(wallet);
          this.txUiService.currentWallet.set(wallet);

          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
     }

     trackByCredentialIndex(_index: number, cred: CredentialItem) {
          return cred.index;
     }

     async setTab(tab: 'create' | 'accept' | 'delete' | 'verify'): Promise<void> {
          this.activeTab.set(tab);
          this.destinationSearchQuery.set('');

          this.credentialStore.resetCredentialIdDropDown();
          this.txUiService.clearAllOptionsAndMessages();
          this.credentialStore.clearOptionalExpirationDate();

          if (this.hasWallets()) await this.getCredentialsForAccount();
     }

     async getCredentialsForAccount(forceRefresh = false): Promise<void> {
          await this.measure('getCredentialsForAccount', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) return;

                    this.refreshAccountObject(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
                    this.credentialUtilService.clearInputFields();
               } catch (error: any) {
                    console.error('Error in getCredentialsForAccount:', error);
                    this.toastService.error(error.message || 'Error getting credential detail', AppConstants.TOAST.ERROR);
               } finally {
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     async performAction(): Promise<void> {
          const currentTab = this.activeTab();
          let txResult: { success: boolean; error?: string } | null = null;
          let envRef: any = null;

          // 1. Common reset & guard clauses
          this.txUiService.resetCurrentStepToIdle();
          this.txUiService.clearAllOptionsAndMessages();

          if (!this.walletManagerService.ensureWalletSelected()) return;

          // 2. Early subject resolution
          this.selectedDestinationAddress.set(this.credentialStore.get('subject'));
          const subjectDestination = this.transactionDropdownService.getFinalDestinationAddress(this.selectedDestinationAddress, this.destinationSearchQuery);
          const walletVm = this.walletManager.walletVm();

          // 3. Map tab → action type
          let action: CredentialTxType | 'verifyCredential';
          switch (currentTab) {
               case 'create':
                    action = 'createCredential';
                    if (!subjectDestination || !xrpl.isValidAddress(subjectDestination)) {
                         this.toastService.error('Please enter a valid destination address.', AppConstants.TOAST.ERROR);
                         return;
                    }
                    break;
               case 'accept':
                    action = 'acceptCredentials';
                    if (!this.credentialStore.get('credentialID')) {
                         this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
                         return;
                    }
                    break;
               case 'delete':
                    action = 'deleteCredentials';
                    if (!this.credentialStore.get('credentialID')) {
                         this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
                         return;
                    }
                    break;
               case 'verify':
                    action = 'verifyCredential';
                    await this.handleVerifyCredential();
                    return;
               default:
                    this.toastService.error('Unknown action', AppConstants.TOAST.ERROR);
                    return;
          }

          // 4. Fetch environment once for this transaction
          await this.withPerf('performAction', async () => {
               try {
                    envRef = await this.txEnvironmentService.prepareTxEnvironment({
                         includeAccountInfo: true,
                         includeAccountObject: true,
                         includeFee: true,
                         includeLedgerInfo: true,
                         ...(currentTab === 'create' ? { destinationAddress: subjectDestination } : {}),
                    });
               } catch (err: any) {
                    console.error(err);
                    this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
                    return;
               }

               // 5. Build the orchestrator config
               const config: CredentialTxConfig = {
                    wallet: walletVm.wallet!,
                    // wallet: this.currentWallet(),
                    simulate: this.txUiService.isSimulateEnabled(),
                    multiSign: this.txUiService.useMultiSign(),
                    subject: this.credentialStore.get('subject'),
                    credentialType: this.credentialStore.get('credentialType'),
                    credentialID: this.credentialStore.get('credentialID'),
                    credentialIssuer: this.credentialStore.get('credentialIssuer'),
                    expiration: this.credentialStore.get('expirationDate'),
                    uri: this.credentialStore.get('uri'),
                    preFetchedEnv: envRef,
               };

               // 6. Execute
               try {
                    txResult = await this.credentialTransactionOrchestratorService.executeCredentialTx(action as CredentialTxType, config);
               } catch (err: any) {
                    console.error(`Error in ${action}:`, err);
                    this.toastService.error(err.message || 'Transaction failed', AppConstants.TOAST.ERROR);
               }
          });

          // 7. Handle result & side effects
          if (txResult) {
               const successFullTx: boolean = await this.handleTxResult(txResult, envRef.client, envRef.wallet, subjectDestination, this.credentialStore.get('credentialIssuer'), '');
               if (currentTab === 'delete' && successFullTx) {
                    this.credentialStore.resetCredentialIdDropDown();
               }
          }

          this.txUiService.resetCurrentStepToIdle();
     }

     private async handleVerifyCredential(): Promise<boolean> {
          const env = await this.txEnvironmentService.prepareTxEnvironment({ includeAccountInfo: true, includeLedgerInfo: true });
          const { accountInfo, client, ledgerInfo } = env;
          const walletVm = this.walletManager.walletVm();

          const inputs = this.txUiService.getValidationInputs({
               wallet: walletVm.wallet!,
               network: { accountInfo },
               credentials: { credentialId: this.credentialStore.get('credentialID'), credentialType: this.credentialStore.get('credentialType') },
          });

          const errors = await this.validationService.validate('CredentialVerify', { inputs, client, accountInfo });
          if (errors.length > 0) {
               this.toastService.error(errors.join('\n• '), AppConstants.TOAST.ERROR);
               return false;
          }

          const selected = this.credentialStore.get('selectedCredentials');
          if (!selected) {
               this.toastService.error('No credential selected.', AppConstants.TOAST.ERROR);
               return false;
          }

          // Encode credential type
          let credentialTypeHex = '';
          const credentialType = selected.CredentialType ?? '';

          credentialTypeHex = xrpl.convertStringToHex(credentialType).toUpperCase();
          console.info(`Raw credential_type ${credentialType} Encoded credential_type as hex: ${credentialTypeHex}`);

          if (credentialTypeHex.length % 2 !== 0 || !AppConstants.CREDENTIAL_REGEX.test(credentialTypeHex)) {
               this.toastService.error('Credential type must be 128 characters as hexadecimal.', AppConstants.TOAST.ERROR);
               return false;
          }

          const ledgerEntryRequest = {
               command: 'ledger_entry',
               credential: {
                    subject: selected.Subject ?? '',
                    issuer: env.wallet.classicAddress,
                    credential_type: credentialTypeHex,
               },
               ledger_index: 'validated',
          };

          console.info('Looking up credential...', ledgerEntryRequest);
          this.txUiService.setTxSignal(ledgerEntryRequest);

          let xrplResponse;

          try {
               xrplResponse = await client.request(ledgerEntryRequest as any);
          } catch (error: any) {
               if (error.data?.error === 'entryNotFound') {
                    console.info('Credential was not found');
                    this.txUiService.setTxResultSignal(error.data);
                    this.toastService.error('Credential not found.', AppConstants.TOAST.ERROR);
                    return false;
               }

               this.toastService.error(`Failed to check credential: ${error.message || 'Unknown error'}`, AppConstants.TOAST.ERROR);
               return false;
          }

          this.txUiService.setTxResultSignal(xrplResponse.result);

          const credential = (xrplResponse.result as any).node;
          console.info('Found credential:', credential);

          // Accepted check
          if (!(credential.Flags & AppConstants.LSF_ACCEPTED)) {
               console.info('Credential is not accepted.');
               this.toastService.error('Credential is not accepted.', AppConstants.TOAST.ERROR);
               return false;
          }

          if (credential.Expiration) {
               if (this.xrplDateService.isExpired(credential.Expiration, ledgerInfo.currentRippleTime)) {
                    console.info('CCredential is verified but has expired.');
                    this.toastService.error('Credential is verified but has expired.', AppConstants.TOAST.ERROR);
                    return false;
               }

               const expirationISO = this.xrplDateService.rippleToISO(credential.Expiration);
               console.info(`Credential expires at: ${expirationISO}`);
          }

          console.info('Credential is verified.');

          this.txUiService.setSuccess(this.txUiService.result());
          this.toastService.success(`Credential is verified.`, AppConstants.TOAST.SUCCESS, false);

          return true;
     }

     protected refreshAccountObject(env: any): void {
          this.credentialStore.set('existingCredentials', this.credentialUtilService.parseIssuedCredentials(env.accountObjects, env.wallet.classicAddress));
          this.credentialStore.set('subjectCredentials', this.credentialUtilService.parseSubjectCredentials(env.accountObjects, env.wallet.classicAddress));
     }

     handleSearchQueryChange(query: string) {
          this.destinationSearchQuery.set(query);
          this.credentialStore.set('credentialIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.selectedDestinationAddress.set(addr);
          this.credentialStore.set('subject', addr);
     }

     onCredentialSelected(item: SelectItem | null) {
          if (!item) {
               this.credentialUtilService.applySelectedCredential(null);
               return;
          }

          const cred = [...this.credentialStore.get('existingCredentials'), ...this.credentialStore.get('subjectCredentials')].find(c => c.index === item.id);

          if (!cred) return;

          // const isVerifyTab = this.activeTab() === 'verify';
          // const walletVm = this.walletManager.walletVm();
          // const isSubject = cred.Subject === this.currentWallet().address;

          // if (!isVerifyTab || !walletVm.address) {
          this.credentialUtilService.applySelectedCredential(cred);
          // }
          // else {
          //      // Optional: clear selection visually
          //      this.credentialUtilService.applySelectedCredential(null);
          //      this.toastService.info('Verification is typically performed by the issuer or a third party.', AppConstants.TOAST.INFO);
          // }
     }

     selectCredentialFromList(cred: CredentialItem) {
          // this.credentialUtilService.selectCredentialFromList(cred, this.activeTab(), this.currentWallet().address);
          this.credentialUtilService.applySelectedCredential(cred);

          if (this.activeTab() !== 'create') this.infoPanelExpanded.set(false);
          // document.querySelector('.form-group')?.scrollIntoView({ behavior: 'smooth' });
     }

     protected clearInputFields(): void {
          this.credentialUtilService.clearInputFields();
          this.selectedDestinationAddress.set('');
          this.destinationSearchQuery.set('');
     }
}
