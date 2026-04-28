import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Wallet, WalletManagerService } from '../../../services/wallets/manager/wallet-manager.service';
import { WalletDestinationBase } from '../../../services/wallets/walletDestinationBase';
import { DownloadUtilService } from '../../../services/utils/download-util/download-util.service';
import * as xrpl from 'xrpl';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { CurrencyStoreService } from '../../../services/currency/currency-store/currency-store.service';
import { MptUtilService } from '../../../services/mpt/mpt-util/mpt-util.service';
import { TrustlineCurrencyService } from '../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../../services/trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../../services/trustlines/trustline-utils/trustline-util.service';
import { ValidationService } from '../../../services/utils/validation/transaction-validation-rule.service';
import { XrplTransactionOrchestratorService } from '../../../services/xrpl-transaction-orchestrator/xrpl-transaction-orchestrator.service';
import { XrplTransactionService } from '../../../services/xrpl-transactions/xrpl-transaction.service';
import { ActivatedRoute } from '@angular/router';
import { AcccountDataService } from '../../../services/account-data/acccount-data.service';
import { CopyUtilService } from '../../../services/utils/copy-util/copy-util.service';
import { StorageService } from '../../../services/shared/local-storage/storage.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { TransactionDropdownService } from '../../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../../services/transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../../services/transaction-ui/transaction-ui.service';
import { WalletDataService } from '../../../services/wallets/refresh-wallet/refresh-wallets.service';
import { AppConstants } from '../../../core/app.constants';
import { CONDITIONAL_ESCROW_TAB_META, CONDITIONAL_ESCROW_TABS, TIME_ESCROW_TAB_META, TIME_ESCROW_TABS } from '../constants/time-escrow.ui';
import { ESCROW_TAB } from '../constants/time-escrow.constants';
import { DropdownItem } from '../../../models/dropdown-item.model';
import { SelectItem } from '../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { EscrowUtilService } from '../../../services/escrow/escrow-util/escrow-util.service';
import { EscrowStoreService } from '../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowActionTypes, EscrowConfig } from '../constants/time-escrow.types';
import { EscrowTransactionViewModelService } from '../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { MptStoreService } from '../../../services/mpt/mpt-store/mpt-store.service';
import { EscrowOrchestratorService } from '../../../services/escrow/escrow-orchestrator/escrow-orchestrator.service';
import { ConnectionGuardService } from '../../../services/shared/connection-guard/connection-guard.service';
import { RightPanelService } from '../../../services/utils/right-panel/right-panel.service';
import { EscrowRequirementsInfoComponent } from '../ui-components/escrow-requirements-info/escrow-requirements-info.component';

@Component({
     standalone: true,
     template: '',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class EscrowBaseComponent extends WalletDestinationBase implements OnInit {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplTransactionOrchestratorService = inject(XrplTransactionOrchestratorService);
     public readonly validationService = inject(ValidationService);
     public readonly escrowTransactionViewModelService = inject(EscrowTransactionViewModelService);
     public readonly escrowOrchestratorService = inject(EscrowOrchestratorService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly mptStoreService = inject(MptStoreService);
     private readonly rightPanelService = inject(RightPanelService);
     public readonly timeMenuTabs = TIME_ESCROW_TABS;
     public readonly timeTabMeta = TIME_ESCROW_TAB_META;
     public readonly conditionMenuTabs = CONDITIONAL_ESCROW_TABS;
     public readonly conditionTabMeta = CONDITIONAL_ESCROW_TAB_META;
     abstract readonly isConditional: boolean;

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     ngOnInit(): void {
          this.applyTabFromQueryParam(this.route, ESCROW_TAB, tab => this.setTab(tab));
          this.trustlineCurrencyService.load();
          this.trustlineCurrencyService.preferXrpAsDefault.set(true);
          this.trustlineCurrencyService.addXrpInCurrencyDropdown.set(true);
          this.trustlineCurrencyService.addMptInCurrencyDropdown.set(true);
          this.transactionDropdownService.loadCustomDestinations();
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.refreshCurrentBalance();

          this.rightPanelService.setPanel(EscrowRequirementsInfoComponent, {
               activeTab: this.escrowTransactionViewModelService.activeTab,
               page: this.isConditional,
          });
     }

     public get activeTab() {
          return this.escrowTransactionViewModelService.activeTab();
     }

     public override infoPanelExpanded = signal(false);

     public override toggleInfoPanel() {
          this.infoPanelExpanded.set(!this.infoPanelExpanded());
     }

     public currencyItems() {
          return this.trustlineCurrencyService.currencyItems();
     }

     public selectedCurrencyItem() {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     }

     public escrowItems() {
          return this.escrowUtilService.escrowItems(this.escrowStoreService.allEscrowsRaw(), this.currentWallet()?.address || '', this.escrowTransactionViewModelService.activeTab() === 'cancelEscrow');
     }

     public selectedEscrowItem() {
          return this.escrowUtilService.selectedEscrowItem(this.escrowItems(), this.escrowStoreService.escrowSequenceNumber());
     }

     public onEscrowSelected(item: SelectItem | null) {
          if (!item?.id) {
               this.escrowStoreService.setField('escrowSequenceNumber', '');
               this.escrowStoreService.setField('escrowOwner', '');
               return;
          }

          if (this.escrowTransactionViewModelService.activeTab() === 'cancelEscrow') {
               this.escrowStoreService.setField('escrowSequenceNumber', item.id);
          } else {
               const escrow = this.escrowStoreService.expiredOrFulfilledEscrows().find((e: any) => e.EscrowSequence?.toString() === item.id);

               if (escrow) {
                    this.escrowStoreService.setField('escrowSequenceNumber', escrow.EscrowSequence);
                    this.escrowStoreService.setField('escrowOwner', escrow.Sender);
               }
          }
     }

     public selectedEscrowIsExpired(): boolean {
          const seq = this.escrowStoreService.escrowSequenceNumber();
          if (!seq) return false;
          const escrows = this.escrowStoreService.existingEscrow();
          const escrow = escrows.find(e => e.Sequence?.toString() === seq.toString());
          return this.escrowUtilService.isEscrowExpired?.(escrow?.CancelAfter, escrow?.FinishAfter, this.escrowTransactionViewModelService.activeTab()) ?? false;
     }

     public toggleEscrowFinishAfteExpiration(enabled: boolean) {
          this.escrowStoreService.setField('enableEscrowFinishAfterExpirationDate', enabled);
     }

     public toggleEscrowFinishAfterExpiration(enabled: boolean) {
          this.escrowStoreService.setField('enableEscrowFinishAfterExpirationDate', enabled);
     }

     public toggleEscrowCancelAfterExpiration(enabled: boolean) {
          this.escrowStoreService.setField('enableEscrowCancelAfterExpirationDate', enabled);
     }

     public setEscrowFinishAfterExpirationToNow() {
          return this.xrplDateService.toLocalDateTimeString(new Date());
     }

     public clearEscrowFinishAfterExpiration() {
          this.escrowStoreService.setField('escrowFinishAfterExpirationDate', '');
     }

     public setEscrowCancelAfterExpirationToNow() {
          return this.xrplDateService.toLocalDateTimeString(new Date());
     }

     public clearEscrowCancelAfterExpiration() {
          this.escrowStoreService.setField('escrowCancelAfterExpirationDate', '');
     }

     public onFocus(event: Event) {
          (event.target as HTMLInputElement).select?.();
     }

     public onMptSelected(item: any) {
          this.mptStoreService.setField('mptIssuanceId', item?.id || '');
     }

     public issuerItems() {
          return this.trustlineCurrencyService.issuerItems();
     }

     public selectedIssuerItem() {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     }

     public mptItems() {
          const mpts = this.mptStoreService.existingMpts?.() || [];
          return this.mptUtilService.computeMptItems(mpts);
     }

     public selectedMptItem() {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          return this.mptUtilService.computeSelectedMptItem(this.mptItems(), issuanceId);
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {
          this.trustlineCurrencyService.selectCurrency('XRP');
          await this.getEscrows(false);
     }

     async onCurrencyChange(item: any) {
          const currency = item?.id ?? item ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.syncAfterSelection();
     }

     async onIssuerChange(item: any) {
          const issuer = item?.id ?? item ?? 'XRP';
          this.trustlineCurrencyService.selectIssuer(issuer);
          await this.syncAfterSelection();
     }

     async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          await this.trustlineUtilService.loadTrustlines(false);
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);

          // Add this: If both currency and issuer are set, fetch env and update flags
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;
          this.currentWallet.set(wallet);
          if (this.selectedDestinationAddress() === wallet.address) this.selectedDestinationAddress.set('');
          this.trustlineCurrencyService.refreshCurrentBalance();
          this.resetInputFields();
     }

     trackByAddress(_index: number, item: DropdownItem): string {
          return item.address;
     }

     toggleOutstandingIOU() {
          this.trustlineStoreService.setField('outstandingIOUCollapsed', !this.trustlineStoreService.outstandingIOUCollapsed());
     }

     toggleOutstandingEscrows() {
          this.escrowStoreService.setField('outstandingEscrowCollapsed', !this.escrowStoreService.outstandingEscrowCollapsed());
     }

     onWalletSelected(wallet: Wallet): void {
          this.selectWallet(wallet);
     }

     async setTab(tab: string): Promise<void> {
          if (!ESCROW_TAB.includes(tab as any)) return;
          this.escrowTransactionViewModelService.activeTab.set(tab as EscrowActionTypes);
          this.resetInputFields();
          if (this.hasWallets()) await this.getEscrows(false);
     }

     async getEscrows(forceRefresh = false): Promise<void> {
          this.isSummaryLoading.set(true);
          await this.measure('getEscrows', true, async () => {
               this.txUiService.resetCurrentStepToIdle();
               this.txUiService.clearAllOptionsAndMessages();
               this.xrplTxOptionsStore.reset();
               this.trustlineStoreService.reset();

               if (!this.walletManagerService.ensureWalletSelected()) return;

               try {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
                    if (!env) throw new Error('Unable to get environment.');

                    await this.refreshAccountObject(env);
                    this.updateSharedObjectsStore(env);
                    const currencyValue = this.currencyStoreService.currency() ?? 'XRP';
                    if (currencyValue !== 'XRP' && currencyValue !== 'MPT' && this.currencyStoreService.issuer()) {
                         await this.trustlineUtilService.loadTrustlines(forceRefresh);
                         this.trustlineCurrencyService.selectCurrency(currencyValue);
                    }

                    this.updateSharedObjectsStore(env);
                    this.acccountDataService.refreshUiState(env.wallet, env.accountInfo, env.accountObjects);
               } catch (error: any) {
                    console.error('Failed to get escrows:', error);
                    this.toastService.error(error.message || 'Failed to get escrows', AppConstants.TOAST.ERROR);
               } finally {
                    this.isSummaryLoading.set(false);
                    this.txUiService.resetCurrentStepToIdle();
               }
          });
     }

     public async performAction(): Promise<void> {
          const currentTab = this.escrowTransactionViewModelService.activeTab();
          const wallet = this.currentWallet();

          let destinationAddress = '';
          if (currentTab === 'createEscrow') {
               destinationAddress = this.transactionDropdownService.getFinalDestinationAddress(this.escrowTransactionViewModelService.selectedDestinationAddress, this.escrowTransactionViewModelService.destinationSearchQuery);
               if (!destinationAddress || !xrpl.isValidAddress(destinationAddress)) {
                    this.toastService.error(`Please enter a valid destination address or select one from the dropdown.`, AppConstants.TOAST.ERROR);
                    return;
               }
               this.selectedDestinationAddress.set(destinationAddress);
               this.escrowStoreService.setField('destination', destinationAddress);
          }

          if (currentTab === 'finishEscrow' || currentTab === 'cancelEscrow') {
               const escrowSequenceNumber = this.escrowStoreService.escrowSequenceNumber();
               if (!escrowSequenceNumber) {
                    this.toastService.error('Please select a valid Escrow Sequence Number', AppConstants.TOAST.ERROR);
                    return;
               }
          }

          let env: any = null;
          try {
               env = await this.txEnvironmentService.prepareTxEnvironmentWithWallet(wallet, {
                    includeAccountInfo: true,
                    includeAccountObject: true,
                    includeFee: true,
                    includeLedgerInfo: true,
                    includeServerInfo: true,
                    includeDestinationAccountInfo: true,
                    includeTrustlines: true,
                    includeEscrows: true,
                    destinationAddress,
               });
               if (!env) throw new Error('Unable to get environment.');
          } catch (err: any) {
               console.error('prepareTxEnvironment failed:', err);
               this.toastService.error('Failed to prepare transaction environment', AppConstants.TOAST.ERROR);
               return;
          }

          // Finish-specific safety checks
          if (currentTab === 'finishEscrow' || currentTab === 'cancelEscrow') {
               const escrowObject = await this.xrplService.getEscrowBySequence(env.client, wallet.address, Number(this.escrowStoreService.escrowSequenceNumber()));

               if (!escrowObject) {
                    return this.toastService.error(`No escrow found with Sequence Number ${this.escrowStoreService.escrowSequenceNumber()}`, AppConstants.TOAST.ERROR);
               }
               this.escrowStoreService.setField('escrowOwner', escrowObject.Account);

               if (currentTab === 'finishEscrow') {
                    if (escrowObject.Expiration) {
                         const currentRippleTime = await this.xrplService.getCurrentRippleTime(env.client);
                         if (currentRippleTime >= escrowObject.Expiration) {
                              return this.toastService.error('This escrow has expired.', AppConstants.TOAST.ERROR);
                         }
                    }
               }
          }

          this.escrowStoreService.setField('isConditional', this.isConditional);

          const escrowState = this.escrowStoreService.getAll();
          const currencyState = this.currencyStoreService.getAll();
          const trustlineState = this.trustlineStoreService.getAll();
          const accountState = this.accountConfiguratorStoreService.getAll();
          const txOptionsState = this.xrplTxOptionsStore.getAll();
          const mptState = this.mptStoreService.getAll();

          const config: EscrowConfig = {
               escrow: escrowState,
               account: accountState,
               trustline: trustlineState,
               currency: currencyState,
               txOptions: txOptionsState,
               mpt: mptState,
               wallet: wallet,
               preFetchedEnv: env,
               extra: {},
          };

          let txResult: { success: boolean; hash?: string; error?: string } | null = null;

          await this.withPerf('performAction', async () => {
               try {
                    switch (currentTab) {
                         case 'createEscrow':
                              txResult = await this.escrowOrchestratorService.executeEscrowTx('createEscrow', config);
                              break;
                         case 'finishEscrow':
                              txResult = await this.escrowOrchestratorService.executeEscrowTx('finishEscrow', config);
                              break;
                         case 'cancelEscrow':
                              txResult = await this.escrowOrchestratorService.executeEscrowTx('cancelEscrow', config);
                              break;
                    }
               } catch (error: any) {
                    console.error(`[${currentTab}] execution failed:`, error);
                    this.toastService.error(error.message || 'Transaction failed', AppConstants.TOAST.ERROR);
                    return;
               }
          });

          if (!txResult) {
               this.toastService.error('Unexpected error when submitting transaction.', AppConstants.TOAST.ERROR);
               return;
          }

          await this.handleTxResult(txResult, env.client, env.wallet, this.escrowStoreService.escrowOwner(), this.escrowStoreService.destination(), '', { includeCheckObjects: true });
          this.txUiService.resetCurrentStepToIdle();
     }

     protected async refreshAccountObject(env: any): Promise<void> {
          this.escrowStoreService.setField('existingEscrow', await this.escrowUtilService.getExistingEscrows(env.accountObjects, env.wallet.classicAddress, this.isConditional, this.escrowTransactionViewModelService.activeTab()));
          this.escrowStoreService.setField('expiredOrFulfilledEscrows', await this.escrowUtilService.getExpiredOrFulfilledEscrows(env.accountObjects, env.wallet.classicAddress, this.escrowTransactionViewModelService.activeTab()));
          this.mptStoreService.setField('existingMpts', this.mptUtilService.getExistingMpts(env.accountObjects, env.wallet.classicAddress));
          this.escrowStoreService.setField('existingIOUs', this.trustlineCurrencyService.getExistingIOUs(env.accountObjects, env.wallet.classicAddress));
          const escrows = await this.escrowUtilService.loadAllEscrows(env.accountObjects);
          this.escrowStoreService.setField('allEscrowsRaw', escrows);
     }

     toggleOptions(enabled: boolean): void {
          this.txUiService.wantsOptions.set(enabled);
     }

     private async syncAfterSelection(load = true) {
          if (load) await this.trustlineUtilService.loadTrustlines();
          await this.trustlineCurrencyService.refreshCurrentBalance();
     }

     handleSearchQueryChange(query: string) {
          this.escrowTransactionViewModelService.destinationSearchQuery.set(query);
          this.escrowStoreService.setField('escrowIdSearchQuery', query);
     }

     handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.escrowTransactionViewModelService.selectedDestinationAddress.set(addr);
          this.escrowStoreService.setField('destination', addr);
     }

     populateDefaultDateTime() {
          this.escrowStoreService.setField('escrowCancelAfterExpirationDate', '');
          this.escrowStoreService.setField('escrowFinishAfterExpirationDate', '');
     }

     resetInputFields() {
          this.destinationSearchQuery.set('');
          this.escrowTransactionViewModelService.selectedDestinationAddress.set('');
          this.trustlineCurrencyService.selectCurrency('XRP');
          this.trustlineCurrencyService.selectIssuer('XRP');
          this.mptStoreService.resetMptFields();
          this.escrowStoreService.resetEscrowFields();
     }
}
