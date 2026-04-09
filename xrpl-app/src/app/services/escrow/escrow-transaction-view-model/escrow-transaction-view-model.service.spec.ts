import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowTransactionViewModelService } from './escrow-transaction-view-model.service';
import { EscrowStoreService } from '../escrow-store/escrow-store.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { EscrowUtilService } from '../escrow-util/escrow-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { EscrowOrchestratorService } from '../escrow-orchestrator/escrow-orchestrator.service';
import { TransactionDropdownService } from '../../transaction-dropdown/transaction-dropdown.service';
import { MptStoreService } from '../../mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../mpt/mpt-util/mpt-util.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { WalletDataService } from '../../wallets/refresh-wallet/refresh-wallets.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { AcccountDataService } from '../../account-data/acccount-data.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { EscrowTransactionBuilderService } from '../escrow-transaction-builder/escrow-transaction-builder.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { SufficentAccountBalanceService } from '../../utils/sufficent-account-balance/sufficent-account-balance.service';

describe('EscrowTransactionViewModelService', () => {
     let service: EscrowTransactionViewModelService;
     let escrowStore: InstanceType<typeof EscrowStoreService>;

     const mockWallet = { address: 'rTEST', name: 'My Wallet', classicAddress: 'rTEST' };

     const mockWalletManager = {
          getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          wallets: signal([mockWallet]),
     };

     const mockTxUiService = {
          explorerUrl: signal('https://testnet.xrpl.org/'),
          currentStep: signal('idle'),
          stepMessage: jasmine.createSpy('stepMessage').and.returnValue(''),
          warningMessage: '',
     };

     const mockTrustlineCurrency = {
          currencyItems: signal([]),
          issuerItems: signal([]),
     };

     const mockCurrencyStore = {
          currency: signal('XRP'),
          issuer: signal(''),
          currencyCode: signal('XRP'),
          currencyIssuer: signal(''),
          balance: jasmine.createSpy('balance').and.returnValue(''),
          setField: jasmine.createSpy('setField'),
     };

     const mockTrustlineStore = {
          outstandingIOUCollapsed: signal(false),
          setField: jasmine.createSpy('setField'),
          reset: jasmine.createSpy('reset'),
     };

     const mockEscrowUtil = {
          isEscrowExpired: jasmine.createSpy('isEscrowExpired').and.returnValue(false),
          escrowItems: jasmine.createSpy('escrowItems').and.returnValue([]),
          selectedEscrowItem: jasmine.createSpy('selectedEscrowItem').and.returnValue(null),
          formatEscrowAmount: jasmine.createSpy('formatEscrowAmount').and.returnValue('1 XRP'),
          onEscrowSelected: jasmine.createSpy('onEscrowSelected'),
          onEscrowSelectedInUi: jasmine.createSpy('onEscrowSelectedInUi'),
          checkEscrowStatus: jasmine.createSpy('checkEscrowStatus').and.returnValue({ canFinish: true, canCancel: false }),
          validateEscrowCreate: jasmine.createSpy('validateEscrowCreate').and.returnValue({ valid: true, errors: [] }),
          validateTimeEscrowUI: jasmine.createSpy('validateTimeEscrowUI').and.returnValue([]),
          validateConditionalEscrowUI: jasmine.createSpy('validateConditionalEscrowUI').and.returnValue(''),
          getExistingEscrows: jasmine.createSpy('getExistingEscrows').and.resolveTo([]),
          getExpiredOrFulfilledEscrows: jasmine.createSpy('getExpiredOrFulfilledEscrows').and.resolveTo([]),
          loadAllEscrows: jasmine.createSpy('loadAllEscrows').and.resolveTo([]),
          escrowLength: signal(0),
          selectedEscrowSequenceNumber: signal(''),
          createEscrowButtonLabel: signal('Create Escrow'),
          finishEscrowButtonLabel: signal('Finish Escrow'),
          cancelEscrowButtonLabel: signal('Cancel Escrow'),
          generateConditionButtonLabel: signal('Generate Condition'),
     };

     const mockUtils = {
          formatIOUXrpAmountOutstanding: jasmine.createSpy('formatIOUXrpAmountOutstanding').and.returnValue('10 XRP'),
          encodeIfNeeded: jasmine.createSpy('encodeIfNeeded').and.callFake((v: string) => v),
          normalizeCurrencyCode: jasmine.createSpy('normalizeCurrencyCode').and.callFake((c: string) => c),
     };

     const mockDropdownService = {
          setupAutoSelectOnValidTypedAddress: jasmine.createSpy(),
          loadCustomDestinations: jasmine.createSpy(),
          allDestinations: jasmine.createSpy('allDestinations').and.returnValue(signal([])),
          destinationMap: jasmine.createSpy('destinationMap').and.returnValue(signal(new Map())),
          destinationItems: jasmine.createSpy('destinationItems').and.returnValue(signal([])),
          selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(signal(null)),
          customDestinations: signal([]),
     };

     const mockMptUtil = {
          computeMptItems: jasmine.createSpy('computeMptItems').and.returnValue([]),
          computeSelectedMptItem: jasmine.createSpy('computeSelectedMptItem').and.returnValue(null),
     };

     const mockMptStore = {
          existingMpts: signal([]),
          mptIssuanceId: jasmine.createSpy('mptIssuanceId').and.returnValue(''),
          setField: jasmine.createSpy('setField'),
     };

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [
                    EscrowTransactionViewModelService,
                    EscrowStoreService,
                    XrplTxOptionsStore,
                    { provide: WalletManagerService, useValue: mockWalletManager },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: TrustlineCurrencyService, useValue: mockTrustlineCurrency },
                    { provide: CurrencyStoreService, useValue: mockCurrencyStore },
                    { provide: TrustlineStoreService, useValue: mockTrustlineStore },
                    { provide: EscrowUtilService, useValue: mockEscrowUtil },
                    { provide: UtilsService, useValue: mockUtils },
                    { provide: TransactionDropdownService, useValue: mockDropdownService },
                    { provide: MptStoreService, useValue: mockMptStore },
                    { provide: MptUtilService, useValue: mockMptUtil },
                    { provide: XrplDateService, useValue: { rippleToISO: () => '', isExpired: () => false } },
                    { provide: WalletDataService, useValue: { refreshWallets: jasmine.createSpy().and.resolveTo() } },
                    { provide: XrplCacheService, useValue: { getTxCached: jasmine.createSpy().and.resolveTo({}) } },
                    { provide: XrplTransactionService, useValue: { waitForFinalOutcome: jasmine.createSpy().and.resolveTo({}), processTxFinalResult: jasmine.createSpy(), processTxError: jasmine.createSpy() } },
                    { provide: TxEnvironmentService, useValue: { prepareTxEnvironment: jasmine.createSpy().and.resolveTo(null) } },
                    { provide: CopyUtilService, useValue: {} },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: ToastService, useValue: { success: jasmine.createSpy(), error: jasmine.createSpy() } },
                    { provide: AcccountDataService, useValue: { refreshUiState: jasmine.createSpy(), loadAccountData: jasmine.createSpy() } },
                    { provide: CheckUtilService, useValue: { isCheckExpired: jasmine.createSpy().and.returnValue(false) } },
                    { provide: ValidationService, useValue: { validate: jasmine.createSpy().and.resolveTo([]) } },
                    { provide: EscrowTransactionBuilderService, useValue: { buildCreateEscrowTx: jasmine.createSpy(), buildFinishEscrowTx: jasmine.createSpy(), buildCancelEscrowTx: jasmine.createSpy() } },
                    { provide: TrustlineUtilService, useValue: { loadTrustlines: jasmine.createSpy().and.resolveTo() } },
                    { provide: SufficentAccountBalanceService, useValue: { checkXrpBalance: jasmine.createSpy().and.resolveTo({ success: true }), checkTokenBalance: jasmine.createSpy().and.resolveTo({ success: true }) } },
                    {
                         provide: EscrowOrchestratorService,
                         useValue: {
                              executeEscrowTx: jasmine.createSpy().and.resolveTo({ success: true }),
                              handleSimulationSuccess: jasmine.createSpy().and.returnValue({ success: true }),
                         },
                    },
               ],
          });
          service = TestBed.inject(EscrowTransactionViewModelService);
          escrowStore = TestBed.inject(EscrowStoreService);
          escrowStore.resetAll();
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('activeTab', () => {
          it('should default to createEscrow', () => {
               expect(service.activeTab()).toBe('createEscrow');
          });

          it('should update when set', () => {
               service.activeTab.set('finishEscrow');
               expect(service.activeTab()).toBe('finishEscrow');
          });
     });

     describe('escrowCount', () => {
          it('should count existingEscrow for createEscrow tab', () => {
               escrowStore.setField('existingEscrow', [{ id: '1' }, { id: '2' }]);
               service.activeTab.set('createEscrow');
               expect(service.escrowCount()).toBe(2);
          });

          it('should count allEscrowsRaw filtered by Destination for finishEscrow tab', () => {
               escrowStore.setField('allEscrowsRaw', [
                    { Destination: 'rTEST', EscrowSequence: 1 },
                    { Destination: 'rOTHER', EscrowSequence: 2 },
               ]);
               service.activeTab.set('finishEscrow');
               expect(service.escrowCount()).toBe(1);
          });

          it('should count expiredOrFulfilledEscrows for cancelEscrow tab', () => {
               escrowStore.setField('expiredOrFulfilledEscrows', [{ id: 'X' }, { id: 'Y' }, { id: 'Z' }]);
               service.activeTab.set('cancelEscrow');
               expect(service.escrowCount()).toBe(3);
          });
     });

     describe('escrowsToShow', () => {
          it('should return empty list when no wallet', () => {
               mockWalletManager.getSelectedWallet.and.returnValue(null);
               expect(service.escrowsToShow()).toEqual([]);
               mockWalletManager.getSelectedWallet.and.returnValue(mockWallet);
          });

          it('should return existingEscrow mapped for createEscrow tab', () => {
               escrowStore.setField('existingEscrow', [{ Sequence: 1, Amount: '1000000', Destination: 'rDEST' }]);
               service.activeTab.set('createEscrow');
               const items = service.escrowsToShow();
               expect(items.length).toBe(1);
               expect(items[0].tab).toBe('createEscrow');
          });

          it('should return allEscrowsRaw filtered by Destination for finishEscrow tab', () => {
               escrowStore.setField('allEscrowsRaw', [{ Destination: 'rTEST', EscrowSequence: 10, Amount: '1000000', Sender: 'rSENDER' }]);
               service.activeTab.set('finishEscrow');
               const items = service.escrowsToShow();
               expect(items.length).toBe(1);
               expect(items[0].tab).toBe('finishEscrow');
          });

          it('should return expiredOrFulfilledEscrows mapped for cancelEscrow tab', () => {
               escrowStore.setField('expiredOrFulfilledEscrows', [{ EscrowSequence: 5, Amount: '2000000', Destination: 'rDEST2', Sender: 'rTEST' }]);
               service.activeTab.set('cancelEscrow');
               const items = service.escrowsToShow();
               expect(items.length).toBe(1);
               expect(items[0].tab).toBe('cancelEscrow');
          });
     });

     describe('explorerLinks', () => {
          it('should return null when not on createEscrow tab', () => {
               service.activeTab.set('finishEscrow');
               expect(service.explorerLinks()).toBeNull();
          });

          it('should return null when no wallet data', () => {
               mockWalletManager.getSelectedWallet.and.returnValue(null);
               service.activeTab.set('createEscrow');
               expect(service.explorerLinks()).toBeNull();
               mockWalletManager.getSelectedWallet.and.returnValue(mockWallet);
          });

          it('should return null when no escrows or IOUs', () => {
               service.activeTab.set('createEscrow');
               expect(service.explorerLinks()).toBeNull();
          });

          it('should return a link when existingEscrow has items', () => {
               escrowStore.setField('existingEscrow', [{ id: 'E1' }]);
               service.activeTab.set('createEscrow');
               const links = service.explorerLinks();
               expect(links).toContain('View Escrows');
               expect(links).toContain(mockWallet.address);
          });

          it('should return IOU link when existingIOUs has items', () => {
               escrowStore.setField('existingIOUs', [{ id: 'I1' }]);
               service.activeTab.set('createEscrow');
               const links = service.explorerLinks();
               expect(links).toContain('View IOUs');
          });
     });

     describe('infoData', () => {
          it('should return null when no wallet', () => {
               mockWalletManager.getSelectedWallet.and.returnValue(null);
               expect(service.infoData()).toBeNull();
               mockWalletManager.getSelectedWallet.and.returnValue(mockWallet);
          });

          it('should return wallet info when wallet exists', () => {
               const info = service.infoData();
               expect(info).not.toBeNull();
               expect(info!.walletName).toBe('My Wallet');
          });
     });

     describe('selectedEscrowIsExpired', () => {
          it('should return false when no sequence number', () => {
               escrowStore.setField('escrowSequenceNumber', '');
               expect(service.selectedEscrowIsExpired()).toBeFalse();
          });

          it('should return false on createEscrow tab even with sequence number', () => {
               escrowStore.setField('escrowSequenceNumber', '123');
               service.activeTab.set('createEscrow');
               expect(service.selectedEscrowIsExpired()).toBeFalse();
          });

          it('should check expiry on finishEscrow tab when sequence matches', () => {
               escrowStore.setField('escrowSequenceNumber', '10');
               escrowStore.setField('allEscrowsRaw', [{ EscrowSequence: 10, CancelAfter: 100, FinishAfter: 200 }]);
               mockEscrowUtil.isEscrowExpired.and.returnValue(true);
               service.activeTab.set('finishEscrow');
               expect(service.selectedEscrowIsExpired()).toBeTrue();
          });
     });
});
