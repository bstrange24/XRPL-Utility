import { TestBed } from '@angular/core/testing';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { AcccountDataService } from '../../account-data/acccount-data.service';
import { signal } from '@angular/core';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';

// Mock classes
class MockTrustlineStoreService {
     setField = jasmine.createSpy();
     existingIOUs = jasmine.createSpy().and.returnValue([]);
}

class MockCurrencyStoreService {
     currency = jasmine.createSpy().and.returnValue('USD');
     issuer = jasmine.createSpy().and.returnValue('rIssuer');
     setField = jasmine.createSpy();
     newCurrency = jasmine.createSpy().and.returnValue('USD');
     newIssuer = jasmine.createSpy().and.returnValue('rNewIssuer');
}

class MockAcccountDataService {
     refreshUiState = jasmine.createSpy();
     refreshUiStateAccountConfigure = jasmine.createSpy();
}

describe('TrustlineUtilService', () => {
     let service: TrustlineUtilService;
     let walletManager: jasmine.SpyObj<WalletManagerService>;
     let trustlineCurrencyService: jasmine.SpyObj<TrustlineCurrencyService>;
     let trustlineStoreService: MockTrustlineStoreService;
     let txUiService: jasmine.SpyObj<TransactionUiService>;
     let utilsService: jasmine.SpyObj<UtilsService>;
     let toastService: jasmine.SpyObj<ToastService>;
     let txEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
     let currencyStoreService: MockCurrencyStoreService;
     let acccountDataService: MockAcccountDataService;
     let mockWallet: any;
     let mockEnv: any;
     let mockFlagsSignal: any;

     beforeEach(() => {
          mockWallet = {
               classicAddress: 'rTestAddress',
               address: 'rTestAddress',
          };

          walletManager = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet']);
          trustlineCurrencyService = jasmine.createSpyObj('TrustlineCurrencyService', ['getExistingIOUs', 'clearFlagsValue', 'refreshCurrentBalanceFromEnv', 'selectCurrency', 'getTrustlineState', 'getIssuersForCurrency', 'addToken', 'removeToken', 'currencies', 'updateFlagTotal']);
          trustlineStoreService = new MockTrustlineStoreService();
          txUiService = jasmine.createSpyObj('TransactionUiService', ['setError']);
          utilsService = jasmine.createSpyObj('UtilsService', ['decodeIfNeeded', 'encodeIfNeeded', 'isValidCurrencyCode']);
          toastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
          txEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['refreshEnvironment', 'getValidatedEnvironment']);
          currencyStoreService = new MockCurrencyStoreService();
          acccountDataService = new MockAcccountDataService();

          walletManager.getSelectedWallet.and.returnValue(mockWallet);
          utilsService.decodeIfNeeded.and.callFake((val: string) => val);
          utilsService.encodeIfNeeded.and.callFake((val: string) => val);
          utilsService.isValidCurrencyCode.and.returnValue(true);
          trustlineCurrencyService.currencies.and.returnValue(['USD', 'EUR']);
          trustlineCurrencyService.getIssuersForCurrency.and.returnValue([]);

          // Create flags signal spy
          mockFlagsSignal = signal({
               tfSetfAuth: false,
               tfSetNoRipple: false,
               tfClearNoRipple: false,
               tfSetFreeze: false,
               tfClearFreeze: false,
               tfSetDeepFreeze: false,
               tfClearDeepFreeze: false,
          });
          Object.defineProperty(trustlineCurrencyService, 'flags', {
               get: () => mockFlagsSignal,
          });

          mockEnv = {
               trustlines: { result: { lines: [] } },
               accountObjects: { result: { account_objects: [] } },
               wallet: mockWallet,
               accountInfo: {},
               gatewayBalance: {},
          };

          txEnvironmentService.refreshEnvironment.and.returnValue(Promise.resolve(mockEnv));
          txEnvironmentService.getValidatedEnvironment.and.returnValue(Promise.resolve(mockEnv));

          TestBed.configureTestingModule({
               providers: [
                    TrustlineUtilService,
                    { provide: WalletManagerService, useValue: walletManager },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: TrustlineStoreService, useValue: trustlineStoreService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: UtilsService, useValue: utilsService },
                    { provide: ToastService, useValue: toastService },
                    { provide: TxEnvironmentService, useValue: txEnvironmentService },
                    { provide: CurrencyStoreService, useValue: currencyStoreService },
                    { provide: AcccountDataService, useValue: acccountDataService },
               ],
          });

          service = TestBed.inject(TrustlineUtilService);
     });

     describe('activeTab', () => {
          it('should default to setTrustline', () => {
               expect(service.activeTab()).toBe('setTrustline');
          });
     });

     describe('loadTrustlines', () => {
          it('should return early if no wallet selected', async () => {
               walletManager.getSelectedWallet.and.returnValue(null);
               await service.loadTrustlines();
               expect(trustlineStoreService.setField).not.toHaveBeenCalled();
          });

          it('should load trustlines with forceRefresh true', async () => {
               await service.loadTrustlines(true);
               expect(txEnvironmentService.refreshEnvironment).toHaveBeenCalled();
               expect(trustlineStoreService.setField).toHaveBeenCalledWith('isLoading', true);
               expect(trustlineStoreService.setField).toHaveBeenCalledWith('isLoading', false);
          });

          it('should load trustlines with forceRefresh false', async () => {
               await service.loadTrustlines(false);
               expect(txEnvironmentService.getValidatedEnvironment).toHaveBeenCalled();
          });
     });

     describe('loadTrustlines1', () => {
          it('should load trustlines with refresh', async () => {
               await service.loadTrustlines1(true);
               expect(txEnvironmentService.refreshEnvironment).toHaveBeenCalled();
               expect(trustlineStoreService.setField).toHaveBeenCalledWith('isLoading', true);
               expect(trustlineStoreService.setField).toHaveBeenCalledWith('isLoading', false);
          });
     });

     describe('onCurrencyChange', () => {
          it('should handle currency change', async () => {
               await service.onCurrencyChange('USD');
               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('USD');
               expect(txEnvironmentService.refreshEnvironment).toHaveBeenCalled();
          });
     });

     describe('checkForExistingTrustline', () => {
          it('should return false when no currency or issuer', () => {
               currencyStoreService.currency.and.returnValue('');
               const result = service.checkForExistingTrustline(mockEnv);
               expect(result).toBe(false);
               expect(currencyStoreService.setField).toHaveBeenCalledWith('amount', 0);
          });

          it('should return true when trustline exists', () => {
               mockEnv.trustlines.result.lines = [{ account: 'rIssuer', currency: 'USD', limit: '1000' }];
               const result = service.checkForExistingTrustline(mockEnv);
               expect(result).toBe(true);
               expect(trustlineStoreService.setField).toHaveBeenCalledWith('trustlineAlreadyExist', true);
          });

          it('should return false when trustline does not exist', () => {
               mockEnv.trustlines.result.lines = [];
               const result = service.checkForExistingTrustline(mockEnv);
               expect(result).toBe(false);
               expect(trustlineStoreService.setField).toHaveBeenCalledWith('trustlineAlreadyExist', false);
          });
     });

     describe('updateTrustLineFlagsInUI', () => {
          it('should update flags for setTrustline tab', () => {
               service.activeTab.set('setTrustline');
               const accountObjects = { result: { account_objects: [] } } as any;

               service.updateTrustLineFlagsInUI(accountObjects);
               expect(trustlineCurrencyService.getTrustlineState).toHaveBeenCalled();
          });

          // it('should update flags for removeTrustline tab', () => {
          //      service.activeTab.set('removeTrustline');
          //      const accountObjects = { result: { account_objects: [] } } as any;

          //      // Mock getTrustlineState to return a state with proper structure
          //      trustlineCurrencyService.getTrustlineState.and.returnValue({
          //           Flags: 0,
          //           LowLimit: { issuer: mockWallet.classicAddress, value: '0', currency: 'USD' },
          //           HighLimit: { issuer: '', value: '0', currency: 'USD' },
          //      });

          //      service.updateTrustLineFlagsInUI(accountObjects);
          //      expect(trustlineCurrencyService.updateFlagTotal).toHaveBeenCalled();
          // });
     });

     describe('setRemoveFlagsBasedOnExistingTrustline', () => {
          it('should set removal flags based on trustline state', () => {
               const accountObjects = { result: { account_objects: [] } } as any;

               service.setRemoveFlagsBasedOnExistingTrustline(accountObjects);
               expect(trustlineCurrencyService.updateFlagTotal).toHaveBeenCalled();
          });
     });

     describe('isAddValid', () => {
          // it('should return true for valid currency and issuer', () => {
          //      trustlineCurrencyService.getIssuersForCurrency.and.returnValue([]);
          //      utilsService.isValidCurrencyCode.and.returnValue(true);
          //      currencyStoreService.newCurrency.and.returnValue('USD');
          //      currencyStoreService.newIssuer.and.returnValue('rNewIssuer');
          //      const result = service.isAddValid();
          //      expect(result).toBe(true);
          // });

          it('should return false when currency already exists', () => {
               trustlineCurrencyService.getIssuersForCurrency.and.returnValue(['rNewIssuer']);
               const result = service.isAddValid();
               expect(result).toBe(false);
          });

          it('should return false when currency is invalid', () => {
               utilsService.isValidCurrencyCode.and.returnValue(false);
               const result = service.isAddValid();
               expect(result).toBe(false);
          });
     });

     describe('isRemoveValid', () => {
          it('should return true for valid removal', () => {
               const result = service.isRemoveValid();
               expect(result).toBe(true);
          });

          it('should return false when currency is XRP', () => {
               currencyStoreService.currency.and.returnValue('XRP');
               const result = service.isRemoveValid();
               expect(result).toBe(false);
          });
     });

     describe('addNewCurrencyIssuer', () => {
          beforeEach(() => {
               trustlineCurrencyService.getIssuersForCurrency.and.returnValue([]);
               utilsService.isValidCurrencyCode.and.returnValue(true);
               currencyStoreService.newCurrency.and.returnValue('USD');
               currencyStoreService.newIssuer.and.returnValue('rNewIssuer');
          });

          // it('should add new currency issuer', () => {
          //      service.addNewCurrencyIssuer();
          //      expect(trustlineCurrencyService.addToken).toHaveBeenCalledWith('USD', 'rNewIssuer');
          //      expect(toastService.success).toHaveBeenCalled();
          //      expect(currencyStoreService.setField).toHaveBeenCalledWith('newCurrency', '');
          //      expect(currencyStoreService.setField).toHaveBeenCalledWith('newIssuer', '');
          // });

          it('should show error when invalid', () => {
               utilsService.isValidCurrencyCode.and.returnValue(false);
               service.addNewCurrencyIssuer();
               expect(txUiService.setError).toHaveBeenCalled();
               expect(trustlineCurrencyService.addToken).not.toHaveBeenCalled();
          });
     });

     describe('removeCurrentCurrencyIssuer', () => {
          beforeEach(() => {
               trustlineCurrencyService.getIssuersForCurrency.and.returnValue([]);
               trustlineCurrencyService.currencies.and.returnValue(['USD', 'EUR']);
          });

          it('should remove current currency issuer', () => {
               service.removeCurrentCurrencyIssuer();
               expect(trustlineCurrencyService.removeToken).toHaveBeenCalledWith('USD', 'rIssuer');
               expect(toastService.success).toHaveBeenCalled();
          });

          it('should show error when invalid', () => {
               currencyStoreService.currency.and.returnValue('');
               service.removeCurrentCurrencyIssuer();
               expect(txUiService.setError).toHaveBeenCalled();
          });
     });

     describe('canRemoveTrustline', () => {
          it('should return canRemove true when no issues', () => {
               const line = { balance: '0', freeze: false, no_ripple: false, authorized: false, peer_authorized: false };
               const result = service.canRemoveTrustline(line);
               expect(result.canRemove).toBe(true);
               expect(result.reasons).toEqual([]);
          });

          it('should return canRemove false with reasons', () => {
               const line = { balance: '100', freeze: true, no_ripple: true, authorized: true, peer_authorized: true };
               const result = service.canRemoveTrustline(line);
               expect(result.canRemove).toBe(false);
               expect(result.reasons.length).toBeGreaterThan(0);
          });
     });
});

// import { TestBed } from '@angular/core/testing';
// import { TrustlineUtilService } from './trustline-util.service';
// import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
// import { TrustlineCurrencyService } from '../trustline-currency/trustline-currency.service';
// import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
// import { TrustlineStoreService } from '../trustline-store/trustline-store.service';
// import { UtilsService } from '../../utils/util-service/utils.service';
// import { ToastService } from '../../utils/toast/toast.service';
// import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
// import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
// import { AcccountDataService } from '../../account-data/acccount-data.service';
// import { signal } from '@angular/core';

// // Mock classes
// class MockTrustlineStoreService {
//      setField = jasmine.createSpy();
//      existingIOUs = jasmine.createSpy().and.returnValue([]);
// }

// class MockCurrencyStoreService {
//      currency = jasmine.createSpy().and.returnValue('USD');
//      issuer = jasmine.createSpy().and.returnValue('rIssuer');
//      setField = jasmine.createSpy();
//      newCurrency = jasmine.createSpy().and.returnValue('EUR');
//      newIssuer = jasmine.createSpy().and.returnValue('rNewIssuer');
// }

// class MockAcccountDataService {
//      refreshUiState = jasmine.createSpy();
//      refreshUiStateAccountConfigure = jasmine.createSpy();
// }

// describe('TrustlineUtilService', () => {
//      let service: TrustlineUtilService;
//      let walletManager: jasmine.SpyObj<WalletManagerService>;
//      let trustlineCurrencyService: jasmine.SpyObj<TrustlineCurrencyService>;
//      let trustlineStoreService: MockTrustlineStoreService;
//      let txUiService: jasmine.SpyObj<TransactionUiService>;
//      let utilsService: jasmine.SpyObj<UtilsService>;
//      let toastService: jasmine.SpyObj<ToastService>;
//      let txEnvironmentService: jasmine.SpyObj<TxEnvironmentService>;
//      let currencyStoreService: MockCurrencyStoreService;
//      let acccountDataService: MockAcccountDataService;
//      let mockWallet: any;
//      let mockEnv: any;
//      let mockFlagsSignal: any;

//      beforeEach(() => {
//           mockWallet = {
//                classicAddress: 'rTestAddress',
//                address: 'rTestAddress',
//           };

//           walletManager = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet']);
//           trustlineCurrencyService = jasmine.createSpyObj('TrustlineCurrencyService', ['getExistingIOUs', 'clearFlagsValue', 'refreshCurrentBalanceFromEnv', 'selectCurrency', 'getTrustlineState', 'getIssuersForCurrency', 'addToken', 'removeToken', 'currencies', 'updateFlagTotal']);
//           trustlineStoreService = new MockTrustlineStoreService();
//           txUiService = jasmine.createSpyObj('TransactionUiService', ['setError']);
//           utilsService = jasmine.createSpyObj('UtilsService', ['decodeIfNeeded', 'encodeIfNeeded', 'isValidCurrencyCode']);
//           toastService = jasmine.createSpyObj('ToastService', ['success', 'error']);
//           txEnvironmentService = jasmine.createSpyObj('TxEnvironmentService', ['refreshEnvironment', 'getValidatedEnvironment']);
//           currencyStoreService = new MockCurrencyStoreService();
//           acccountDataService = new MockAcccountDataService();

//           walletManager.getSelectedWallet.and.returnValue(mockWallet);
//           utilsService.decodeIfNeeded.and.callFake((val: string) => val);
//           utilsService.encodeIfNeeded.and.callFake((val: string) => val);
//           utilsService.isValidCurrencyCode.and.returnValue(true);
//           trustlineCurrencyService.currencies.and.returnValue(['USD', 'EUR']);
//           trustlineCurrencyService.getIssuersForCurrency.and.returnValue([]);

//           // Create flags signal spy
//           mockFlagsSignal = signal({
//                tfSetfAuth: false,
//                tfSetNoRipple: false,
//                tfClearNoRipple: false,
//                tfSetFreeze: false,
//                tfClearFreeze: false,
//                tfSetDeepFreeze: false,
//                tfClearDeepFreeze: false,
//           });
//           Object.defineProperty(trustlineCurrencyService, 'flags', {
//                get: () => mockFlagsSignal,
//           });

//           mockEnv = {
//                trustlines: { result: { lines: [] } },
//                accountObjects: { result: { account_objects: [] } },
//                wallet: mockWallet,
//                accountInfo: {},
//                gatewayBalance: {},
//           };

//           txEnvironmentService.refreshEnvironment.and.returnValue(Promise.resolve(mockEnv));
//           txEnvironmentService.getValidatedEnvironment.and.returnValue(Promise.resolve(mockEnv));

//           TestBed.configureTestingModule({
//                providers: [
//                     TrustlineUtilService,
//                     { provide: WalletManagerService, useValue: walletManager },
//                     { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
//                     { provide: TrustlineStoreService, useValue: trustlineStoreService },
//                     { provide: TransactionUiService, useValue: txUiService },
//                     { provide: UtilsService, useValue: utilsService },
//                     { provide: ToastService, useValue: toastService },
//                     { provide: TxEnvironmentService, useValue: txEnvironmentService },
//                     { provide: CurrencyStoreService, useValue: currencyStoreService },
//                     { provide: AcccountDataService, useValue: acccountDataService },
//                ],
//           });

//           service = TestBed.inject(TrustlineUtilService);
//      });

//      describe('activeTab', () => {
//           it('should default to setTrustline', () => {
//                expect(service.activeTab()).toBe('setTrustline');
//           });
//      });

//      describe('loadTrustlines', () => {
//           it('should return early if no wallet selected', async () => {
//                walletManager.getSelectedWallet.and.returnValue(null);
//                await service.loadTrustlines();
//                expect(trustlineStoreService.setField).not.toHaveBeenCalled();
//           });

//           it('should load trustlines with forceRefresh true', async () => {
//                await service.loadTrustlines(true);
//                expect(txEnvironmentService.refreshEnvironment).toHaveBeenCalled();
//                expect(trustlineStoreService.setField).toHaveBeenCalledWith('isLoading', true);
//                expect(trustlineStoreService.setField).toHaveBeenCalledWith('isLoading', false);
//           });

//           it('should load trustlines with forceRefresh false', async () => {
//                await service.loadTrustlines(false);
//                expect(txEnvironmentService.getValidatedEnvironment).toHaveBeenCalled();
//           });
//      });

//      describe('loadTrustlines1', () => {
//           it('should load trustlines with refresh', async () => {
//                await service.loadTrustlines1(true);
//                expect(txEnvironmentService.refreshEnvironment).toHaveBeenCalled();
//                expect(trustlineStoreService.setField).toHaveBeenCalledWith('isLoading', true);
//                expect(trustlineStoreService.setField).toHaveBeenCalledWith('isLoading', false);
//           });
//      });

//      describe('onCurrencyChange', () => {
//           it('should handle currency change', async () => {
//                await service.onCurrencyChange('USD');
//                expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('USD');
//                expect(txEnvironmentService.refreshEnvironment).toHaveBeenCalled();
//           });
//      });

//      describe('checkForExistingTrustline', () => {
//           it('should return false when no currency or issuer', () => {
//                currencyStoreService.currency.and.returnValue('');
//                const result = service.checkForExistingTrustline(mockEnv);
//                expect(result).toBe(false);
//                expect(currencyStoreService.setField).toHaveBeenCalledWith('amount', 0);
//           });

//           it('should return true when trustline exists', () => {
//                mockEnv.trustlines.result.lines = [{ account: 'rIssuer', currency: 'USD', limit: '1000' }];
//                const result = service.checkForExistingTrustline(mockEnv);
//                expect(result).toBe(true);
//                expect(trustlineStoreService.setField).toHaveBeenCalledWith('trustlineAlreadyExist', true);
//           });

//           it('should return false when trustline does not exist', () => {
//                mockEnv.trustlines.result.lines = [];
//                const result = service.checkForExistingTrustline(mockEnv);
//                expect(result).toBe(false);
//                expect(trustlineStoreService.setField).toHaveBeenCalledWith('trustlineAlreadyExist', false);
//           });
//      });

//      describe('updateTrustLineFlagsInUI', () => {
//           it('should update flags for setTrustline tab', () => {
//                service.activeTab.set('setTrustline');
//                const accountObjects = { result: { account_objects: [] } } as any;

//                service.updateTrustLineFlagsInUI(accountObjects);
//                expect(trustlineCurrencyService.getTrustlineState).toHaveBeenCalled();
//           });

//           // it('should update flags for removeTrustline tab', () => {
//           //      service.activeTab.set('removeTrustline');
//           //      const accountObjects = { result: { account_objects: [] } } as any;

//           //      service.updateTrustLineFlagsInUI(accountObjects);
//           //      // updateFlagTotal is called inside the method for removeTrustline
//           //      expect(trustlineCurrencyService.updateFlagTotal).toHaveBeenCalled();
//           // });
//      });

//      describe('setRemoveFlagsBasedOnExistingTrustline', () => {
//           it('should set removal flags based on trustline state', () => {
//                const accountObjects = { result: { account_objects: [] } } as any;

//                service.setRemoveFlagsBasedOnExistingTrustline(accountObjects);
//                expect(trustlineCurrencyService.updateFlagTotal).toHaveBeenCalled();
//           });
//      });

//      describe('isAddValid', () => {
//           // it('should return true for valid currency and issuer', () => {
//           //      trustlineCurrencyService.getIssuersForCurrency.and.returnValue([]);
//           //      utilsService.isValidCurrencyCode.and.returnValue(true);
//           //      const result = service.isAddValid();
//           //      expect(result).toBe(true);
//           // });

//           it('should return false when currency already exists', () => {
//                trustlineCurrencyService.getIssuersForCurrency.and.returnValue(['rNewIssuer']);
//                const result = service.isAddValid();
//                expect(result).toBe(false);
//           });

//           it('should return false when currency is invalid', () => {
//                utilsService.isValidCurrencyCode.and.returnValue(false);
//                const result = service.isAddValid();
//                expect(result).toBe(false);
//           });
//      });

//      describe('isRemoveValid', () => {
//           it('should return true for valid removal', () => {
//                const result = service.isRemoveValid();
//                expect(result).toBe(true);
//           });

//           it('should return false when currency is XRP', () => {
//                currencyStoreService.currency.and.returnValue('XRP');
//                const result = service.isRemoveValid();
//                expect(result).toBe(false);
//           });
//      });

//      describe('addNewCurrencyIssuer', () => {
//           beforeEach(() => {
//                trustlineCurrencyService.getIssuersForCurrency.and.returnValue([]);
//                utilsService.isValidCurrencyCode.and.returnValue(true);
//           });

//           // it('should add new currency issuer', () => {
//           //      service.addNewCurrencyIssuer();
//           //      expect(trustlineCurrencyService.addToken).toHaveBeenCalledWith('EUR', 'rNewIssuer');
//           //      expect(toastService.success).toHaveBeenCalled();
//           //      expect(currencyStoreService.setField).toHaveBeenCalledWith('newCurrency', '');
//           //      expect(currencyStoreService.setField).toHaveBeenCalledWith('newIssuer', '');
//           // });

//           it('should show error when invalid', () => {
//                utilsService.isValidCurrencyCode.and.returnValue(false);
//                service.addNewCurrencyIssuer();
//                expect(txUiService.setError).toHaveBeenCalled();
//                expect(trustlineCurrencyService.addToken).not.toHaveBeenCalled();
//           });
//      });

//      describe('removeCurrentCurrencyIssuer', () => {
//           beforeEach(() => {
//                trustlineCurrencyService.getIssuersForCurrency.and.returnValue([]);
//                trustlineCurrencyService.currencies.and.returnValue(['USD', 'EUR']);
//           });

//           it('should remove current currency issuer', () => {
//                service.removeCurrentCurrencyIssuer();
//                expect(trustlineCurrencyService.removeToken).toHaveBeenCalledWith('USD', 'rIssuer');
//                expect(toastService.success).toHaveBeenCalled();
//           });

//           it('should show error when invalid', () => {
//                currencyStoreService.currency.and.returnValue('');
//                service.removeCurrentCurrencyIssuer();
//                expect(txUiService.setError).toHaveBeenCalled();
//           });
//      });

//      describe('canRemoveTrustline', () => {
//           it('should return canRemove true when no issues', () => {
//                const line = { balance: '0', freeze: false, no_ripple: false, authorized: false, peer_authorized: false };
//                const result = service.canRemoveTrustline(line);
//                expect(result.canRemove).toBe(true);
//                expect(result.reasons).toEqual([]);
//           });

//           it('should return canRemove false with reasons', () => {
//                const line = { balance: '100', freeze: true, no_ripple: true, authorized: true, peer_authorized: true };
//                const result = service.canRemoveTrustline(line);
//                expect(result.canRemove).toBe(false);
//                expect(result.reasons.length).toBeGreaterThan(0);
//           });
//      });
// });
