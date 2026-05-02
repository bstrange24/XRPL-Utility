import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksTransactionViewModelService } from './checks-transaction-view-model.service';
import { ChecksStoreService } from '../checks-store/checks-store.service';
import { CheckUtilService } from '../checks-util/check-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';

describe('ChecksTransactionViewModelService', () => {
     let service: ChecksTransactionViewModelService;
     let checksStoreServiceMock: any;
     let checkUtilServiceMock: any;
     let utilsServiceMock: any;
     let walletManagerServiceMock: any;
     let txUiServiceMock: any;
     let trustlineCurrencyServiceMock: any;
     let currencyStoreServiceMock: any;
     let trustlineStoreServiceMock: any;

     const mockWallet = {
          address: 'rTestWallet',
          name: 'Test Wallet',
     };

     const mockExistingChecks = [
          { id: 'check1', sendMax: '1000000', destination: 'rDest1', expiration: 100 },
          { id: 'check2', sendMax: '2000000', destination: 'rDest2', expiration: 200 },
     ];

     const mockCashableChecks = [
          { id: 'check1', sendMax: '1000000', sender: 'rSender1', expiration: 100, destinationTag: undefined },
          { id: 'check3', sendMax: '3000000', sender: 'rSender2', expiration: 300, destinationTag: undefined },
     ];

     const mockCancellableChecks = [
          { id: 'check2', sendMax: '2000000', destination: 'rDest2', expiration: 200, destinationTag: undefined },
          { id: 'check4', sendMax: '4000000', destination: 'rDest3', expiration: 400, destinationTag: undefined },
     ];

     const mockCurrencyItems = [
          { id: 'USD', display: 'USD', secondary: 'USD', isCurrentAccount: false },
          { id: 'XRP', display: 'XRP', secondary: 'XRP', isCurrentAccount: true },
     ];

     const mockIssuerItems = [
          { id: 'rIssuer1', display: 'Issuer 1', secondary: 'rIssuer1', isCurrentAccount: false },
          { id: 'rIssuer2', display: 'Issuer 2', secondary: 'rIssuer2', isCurrentAccount: false },
     ];

     beforeEach(() => {
          checksStoreServiceMock = {
               existingChecks: signal(mockExistingChecks),
               cashableChecks: signal(mockCashableChecks),
               cancellableChecks: signal(mockCancellableChecks),
               checkIdField: signal(''),
               checkIdSearchQuery: signal(''),
               existingIOUs: signal([]),
          };

          checkUtilServiceMock = {
               isCheckExpired: jasmine.createSpy('isCheckExpired').and.returnValue(false),
               mapCheckItems: jasmine.createSpy('mapCheckItems').and.returnValue(signal([])),
               checkIdDisplay: jasmine.createSpy('checkIdDisplay').and.returnValue(signal('')),
               filteredCheckItems: jasmine.createSpy('filteredCheckItems').and.returnValue(signal([])),
          };

          utilsServiceMock = {
               formatIOUXrpAmountOutstanding: jasmine.createSpy('formatIOUXrpAmountOutstanding').and.callFake((amount: any) => {
                    if (typeof amount === 'string') return `${Number(amount) / 1000000} XRP`;
                    return `${amount.value} ${amount.currency}`;
               }),
          };

          walletManagerServiceMock = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
               wallets: signal([mockWallet]),
          };

          txUiServiceMock = {
               currentStep: signal('idle'),
               stepMessage: signal(''),
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          trustlineCurrencyServiceMock = {
               currencyItems: signal(mockCurrencyItems),
               issuerItems: signal(mockIssuerItems),
          };

          currencyStoreServiceMock = {
               currency: signal(''),
               issuer: signal(''),
               balance: signal('0'),
          };

          trustlineStoreServiceMock = {};

          TestBed.configureTestingModule({
               providers: [
                    ChecksTransactionViewModelService,
                    { provide: ChecksStoreService, useValue: checksStoreServiceMock },
                    { provide: CheckUtilService, useValue: checkUtilServiceMock },
                    { provide: UtilsService, useValue: utilsServiceMock },
                    { provide: WalletManagerService, useValue: walletManagerServiceMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyServiceMock },
                    { provide: CurrencyStoreService, useValue: currencyStoreServiceMock },
                    { provide: TrustlineStoreService, useValue: trustlineStoreServiceMock },
               ],
          });

          service = TestBed.inject(ChecksTransactionViewModelService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('activeTab', () => {
          it('should default to createCheck', () => {
               expect(service.activeTab()).toBe('createCheck');
          });

          it('should be settable', () => {
               service.activeTab.set('cashCheck');
               expect(service.activeTab()).toBe('cashCheck');
          });
     });

     // describe('currencyItems', () => {
     //      it('should return currency items from trustlineCurrencyService', () => {
     //           expect(service.currencyItems()).toEqual(mockCurrencyItems);
     //      });
     // });

     describe('issuerItems', () => {
          it('should return issuer items from trustlineCurrencyService', () => {
               expect(service.issuerItems()).toEqual(mockIssuerItems);
          });
     });

     describe('selectedIssuerAddress', () => {
          it('should return issuer from currencyStore', () => {
               currencyStoreServiceMock.issuer.set('rIssuer1');
               expect(service.selectedIssuerAddress()).toBe('rIssuer1');
          });
     });

     describe('selectedCurrencyItem', () => {
          it('should return matching currency item', () => {
               currencyStoreServiceMock.currency.set('USD');
               const item = service.selectedCurrencyItem();
               expect(item?.id).toBe('USD');
          });

          it('should return null when no match', () => {
               currencyStoreServiceMock.currency.set('EUR');
               expect(service.selectedCurrencyItem()).toBeNull();
          });
     });

     describe('selectedIssuerItem', () => {
          it('should return matching issuer item', () => {
               currencyStoreServiceMock.issuer.set('rIssuer1');
               const item = service.selectedIssuerItem();
               expect(item?.id).toBe('rIssuer1');
          });
     });

     describe('checkCount', () => {
          it('should return existing checks count for createCheck tab', () => {
               service.activeTab.set('createCheck');
               expect(service.checkCount()).toBe(2);
          });

          it('should return cashable checks count for cashCheck tab', () => {
               service.activeTab.set('cashCheck');
               expect(service.checkCount()).toBe(2);
          });

          it('should return cancellable checks count for cancelCheck tab', () => {
               service.activeTab.set('cancelCheck');
               expect(service.checkCount()).toBe(2);
          });
     });

     describe('checksToShow', () => {
          it('should return formatted existing checks for createCheck tab', () => {
               service.activeTab.set('createCheck');
               const checks = service.checksToShow();
               expect(checks.length).toBe(2);
               expect(checks[0].id).toBe('check1');
          });

          it('should return formatted cashable checks for cashCheck tab', () => {
               service.activeTab.set('cashCheck');
               const checks = service.checksToShow();
               expect(checks.length).toBe(2);
               expect(checks[0].id).toBe('check1');
               expect(checks[0].sender).toBe('rSender1');
          });

          it('should return formatted cancellable checks for cancelCheck tab', () => {
               service.activeTab.set('cancelCheck');
               const checks = service.checksToShow();
               expect(checks.length).toBe(2);
               expect(checks[0].id).toBe('check2');
          });

          it('should return empty array when no wallet selected', () => {
               walletManagerServiceMock.getSelectedWallet.and.returnValue(null);
               expect(service.checksToShow()).toEqual([]);
          });
     });

     describe('explorerLinks', () => {
          it('should return null for non-createCheck tabs', () => {
               service.activeTab.set('cashCheck');
               expect(service.explorerLinks()).toBeNull();
          });

          it('should return links for createCheck tab', () => {
               service.activeTab.set('createCheck');
               checksStoreServiceMock.existingIOUs.set([{ id: 'iou1' }]);
               const links = service.explorerLinks();
               expect(links).toContain('View Checks');
               expect(links).toContain('View IOUs');
          });
     });

     describe('infoData', () => {
          it('should return null when no wallet selected', () => {
               walletManagerServiceMock.getSelectedWallet.and.returnValue(null);
               expect(service.infoData()).toBeNull();
          });

          it('should return info data', () => {
               const info = service.infoData();
               expect(info?.walletName).toBe('Test Wallet');
               expect(info?.checkCount).toBe(2);
               expect(info?.checksToShow).toBeDefined();
          });
     });

     describe('currentWalletData', () => {
          it('should return null when no wallet selected', () => {
               walletManagerServiceMock.getSelectedWallet.and.returnValue(null);
               expect(service.currentWalletData()).toBeNull();
          });

          it('should return formatted wallet data', () => {
               const walletData = service.currentWalletData();
               expect(walletData?.address).toBe('rTestWallet');
               expect(walletData?.name).toBe('Test Wallet');
          });
     });

     describe('selectedCheckItem', () => {
          it('should return null when no check id', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.selectedCheckItem()).toBeNull();
          });
     });

     describe('selectedCheckIsExpired', () => {
          it('should return false when no check selected', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.selectedCheckIsExpired()).toBeFalse();
          });
     });

     describe('selectedFullCheck', () => {
          it('should return null when no check id', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.selectedFullCheck()).toBeNull();
          });
     });

     describe('selectedCheckDestination', () => {
          it('should return empty string when no check selected', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.selectedCheckDestination()).toBe('');
          });
     });

     describe('selectedCheckCreator', () => {
          it('should return empty string when no check selected', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.selectedCheckCreator()).toBe('');
          });
     });

     describe('selectedCheckIndex', () => {
          it('should return empty string when no check selected', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.selectedCheckIndex()).toBe('');
          });
     });

     describe('selectedCheckAmount', () => {
          it('should return empty string when no check selected', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.selectedCheckAmount()).toBe('');
          });
     });

     describe('isIOUCheck', () => {
          it('should return false when no check selected', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.isIOUCheck()).toBeFalse();
          });
     });

     describe('selectedCheckIssuer', () => {
          it('should return empty string when no check selected', () => {
               checksStoreServiceMock.checkIdField.set('');
               expect(service.selectedCheckIssuer()).toBe('');
          });
     });

     describe('Button labels', () => {
          it('should return "Create Check" for createCheck button', () => {
               expect(service.createCheckButtonLabel()).toBe('Create Check');
          });

          it('should return "Cash Check" for cashCheck button', () => {
               expect(service.cashCheckButtonLabel()).toBe('Cash Check');
          });

          it('should return "Cancel Check" for cancelCheck button', () => {
               expect(service.cancelCheckButtonLabel()).toBe('Cancel Check');
          });
     });
});
