import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksTransactionViewModelService } from './checks-transaction-view-model.service';
import { ChecksStoreService } from '../checks-store/checks-store.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { CheckUtilService } from '../checks-util/check-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';

describe('ChecksTransactionViewModelService', () => {
     let service: ChecksTransactionViewModelService;
     let checksStore: InstanceType<typeof ChecksStoreService>;

     const mockWallet = { address: 'rTEST', name: 'My Wallet', classicAddress: 'rTEST' };

     const mockWalletManager = {
          getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          wallets: signal([mockWallet]),
     };

     const mockTxUiService = {
          explorerUrl: signal('https://testnet.xrpl.org/'),
          currentStep: signal('idle'),
          stepMessage: jasmine.createSpy('stepMessage').and.returnValue(''),
     };

     const mockTrustlineCurrency = {
          currencyItems: signal([]),
          issuerItems: signal([]),
     };

     const mockCurrencyStore = {
          currency: signal('XRP'),
          issuer: signal(''),
          balance: jasmine.createSpy('balance').and.returnValue(''),
     };

     const mockTrustlineStore = {
          outstandingIOUCollapsed: signal(false),
     };

     const mockCheckUtil = {
          isCheckExpired: jasmine.createSpy('isCheckExpired').and.returnValue(false),
          mapCheckItems: jasmine.createSpy('mapCheckItems').and.returnValue(signal([])),
          filteredCheckItems: jasmine.createSpy('filteredCheckItems').and.returnValue(signal([])),
          checkIdDisplay: jasmine.createSpy('checkIdDisplay').and.returnValue(signal('')),
          onCheckSelected: jasmine.createSpy('onCheckSelected'),
     };

     const mockUtils = {
          formatIOUXrpAmountOutstanding: jasmine.createSpy('formatIOUXrpAmountOutstanding').and.returnValue('10 XRP'),
     };

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [
                    ChecksTransactionViewModelService,
                    ChecksStoreService,
                    { provide: WalletManagerService, useValue: mockWalletManager },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: TrustlineCurrencyService, useValue: mockTrustlineCurrency },
                    { provide: CurrencyStoreService, useValue: mockCurrencyStore },
                    { provide: TrustlineStoreService, useValue: mockTrustlineStore },
                    { provide: CheckUtilService, useValue: mockCheckUtil },
                    { provide: UtilsService, useValue: mockUtils },
               ],
          });
          service = TestBed.inject(ChecksTransactionViewModelService);
          checksStore = TestBed.inject(ChecksStoreService);
          checksStore.resetAll();
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('activeTab', () => {
          it('should default to createCheck', () => {
               expect(service.activeTab()).toBe('createCheck');
          });

          it('should update when set', () => {
               service.activeTab.set('cashCheck');
               expect(service.activeTab()).toBe('cashCheck');
          });
     });

     describe('checkCount', () => {
          it('should count existingChecks for createCheck tab', () => {
               checksStore.setField('existingChecks', [{ id: '1' }, { id: '2' }]);
               service.activeTab.set('createCheck');
               expect(service.checkCount()).toBe(2);
          });

          it('should count cashableChecks for cashCheck tab', () => {
               checksStore.setField('cashableChecks', [{ id: 'A' }]);
               service.activeTab.set('cashCheck');
               expect(service.checkCount()).toBe(1);
          });

          it('should count cancellableChecks for cancelCheck tab', () => {
               checksStore.setField('cancellableChecks', [{ id: 'X' }, { id: 'Y' }, { id: 'Z' }]);
               service.activeTab.set('cancelCheck');
               expect(service.checkCount()).toBe(3);
          });
     });

     describe('checksToShow', () => {
          it('should return empty list when no wallet', () => {
               mockWalletManager.getSelectedWallet.and.returnValue(null);
               expect(service.checksToShow()).toEqual([]);
               mockWalletManager.getSelectedWallet.and.returnValue(mockWallet);
          });

          it('should return existingChecks mapped for createCheck tab', () => {
               checksStore.setField('existingChecks', [
                    {
                         id: 'IDX1',
                         destination: 'rDEST',
                         sendMax: '1000000',
                         expiration: undefined,
                         destinationTag: undefined,
                         invoiceId: undefined,
                    },
               ]);
               service.activeTab.set('createCheck');
               const items = service.checksToShow();
               expect(items.length).toBe(1);
               expect(items[0].tab).toBe('createCheck');
               expect(items[0].id).toBe('IDX1');
          });

          it('should return cashableChecks mapped for cashCheck tab', () => {
               checksStore.setField('cashableChecks', [
                    {
                         id: 'CASH1',
                         destination: 'rDEST',
                         sender: 'rSND',
                         sendMax: '1000000',
                         expiration: undefined,
                    },
               ]);
               service.activeTab.set('cashCheck');
               const items = service.checksToShow();
               expect(items.length).toBe(1);
               expect(items[0].tab).toBe('cashCheck');
               expect((items[0] as any).sender).toBe('rSND');
          });

          it('should return cancellableChecks mapped for cancelCheck tab', () => {
               checksStore.setField('cancellableChecks', [
                    {
                         id: 'CNCL1',
                         destination: 'rDEST',
                         sendMax: '500000',
                         expiration: undefined,
                    },
               ]);
               service.activeTab.set('cancelCheck');
               const items = service.checksToShow();
               expect(items.length).toBe(1);
               expect(items[0].tab).toBe('cancelCheck');
          });
     });

     describe('explorerLinks', () => {
          it('should return null when not on createCheck tab', () => {
               service.activeTab.set('cashCheck');
               expect(service.explorerLinks()).toBeNull();
          });

          it('should return null when no wallet data', () => {
               mockWalletManager.getSelectedWallet.and.returnValue(null);
               service.activeTab.set('createCheck');
               expect(service.explorerLinks()).toBeNull();
               mockWalletManager.getSelectedWallet.and.returnValue(mockWallet);
          });

          it('should return null when no checks or IOUs', () => {
               service.activeTab.set('createCheck');
               expect(service.explorerLinks()).toBeNull();
          });

          it('should return a link when existingChecks has items', () => {
               checksStore.setField('existingChecks', [{ id: 'C1' }]);
               service.activeTab.set('createCheck');
               const links = service.explorerLinks();
               expect(links).toContain('View Checks');
               expect(links).toContain(mockWallet.address);
          });

          it('should return IOU link when existingIOUs has items', () => {
               checksStore.setField('existingIOUs', [{ id: 'I1' }]);
               service.activeTab.set('createCheck');
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

     describe('button labels', () => {
          it('should return Create Check label when step is idle', () => {
               (mockTxUiService.currentStep as any).set('idle');
               expect(service.createCheckButtonLabel()).toBe('Create Check');
          });

          it('should return Cash Check label when step is idle', () => {
               expect(service.cashCheckButtonLabel()).toBe('Cash Check');
          });

          it('should return Cancel Check label when step is idle', () => {
               expect(service.cancelCheckButtonLabel()).toBe('Cancel Check');
          });

          it('should return waiting message when step is waiting_validation', () => {
               (mockTxUiService.currentStep as any).set('waiting_validation');
               expect(service.createCheckButtonLabel()).toBe('Waiting for ledger validation...');
          });
     });
});
