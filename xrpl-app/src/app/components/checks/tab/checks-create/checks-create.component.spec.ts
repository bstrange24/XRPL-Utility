import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksCreateComponent } from './checks-create.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('ChecksCreateComponent', () => {
     let component: ChecksCreateComponent;
     let fixture: ComponentFixture<ChecksCreateComponent>;
     let trustlineCurrencyService: any;
     let trustlineUtilService: any;
     let currencyStoreService: any;

     // Create writable signals for testing
     const currencySignal = signal('XRP');
     const issuerSignal = signal('');
     let currencyItemsSignal = signal<any[]>([]);
     let issuerItemsSignal = signal<any[]>([]);

     beforeEach(async () => {
          // Create mocks with signals - return the signal value, not the signal itself
          trustlineCurrencyService = {
               currencyItems: jasmine.createSpy('currencyItems').and.callFake(() => currencyItemsSignal()),
               issuerItems: jasmine.createSpy('issuerItems').and.callFake(() => issuerItemsSignal()),
               preferXrpAsDefault: signal(false),
               selectCurrency: jasmine.createSpy('selectCurrency'),
               selectIssuer: jasmine.createSpy('selectIssuer'),
               refreshCurrentBalance: jasmine.createSpy('refreshCurrentBalance').and.resolveTo(),
          };

          trustlineUtilService = {
               loadTrustlines: jasmine.createSpy('loadTrustlines').and.resolveTo(),
          };

          currencyStoreService = {
               currency: currencySignal,
               currencyCode: signal('XRP'),
               issuer: issuerSignal,
               balance: signal(''),
          };

          await TestBed.configureTestingModule({
               imports: [ChecksCreateComponent],
               providers: [
                    { provide: TransactionUiService, useValue: { currentStep: signal('idle'), wantsOptions: signal(false), explorerUrl: signal('') } },
                    {
                         provide: ChecksStoreService,
                         useValue: {
                              amount: signal(''),
                              checkExpirationDate: signal(''),
                              enableExpirationDate: signal(false),
                              setField: jasmine.createSpy('setField'),
                         },
                    },
                    { provide: CurrencyStoreService, useValue: currencyStoreService },
                    {
                         provide: ChecksTransactionViewModelService,
                         useValue: {
                              activeTab: signal('createCheck'),
                              selectedCurrencyItem: signal(null),
                              selectedIssuerItem: signal(null),
                              currencyItems: signal([]),
                              issuerItems: signal([]),
                              createCheckButtonLabel: signal('Create Check'),
                         },
                    },
                    { provide: UtilsService, useValue: {} },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: TrustlineUtilService, useValue: trustlineUtilService },
                    { provide: XrplDateService, useValue: {} },
                    { provide: CheckUtilService, useValue: { isCheckExpired: () => false } },
               ],
          })
               .overrideComponent(ChecksCreateComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksCreateComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset signals between tests
          currencySignal.set('XRP');
          issuerSignal.set('');
          currencyItemsSignal.set([]);
          issuerItemsSignal.set([]);

          // Reset spies
          trustlineCurrencyService.selectCurrency.calls.reset();
          trustlineCurrencyService.selectIssuer.calls.reset();
          trustlineUtilService.loadTrustlines.calls.reset();
          trustlineCurrencyService.refreshCurrentBalance.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('onFocus', () => {
          it('should format numeric input to 6 decimal places', () => {
               const mockInput = { value: '2.5' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('2.500000');
          });

          it('should format integer to 6 decimal places', () => {
               const mockInput = { value: '10' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('10.000000');
          });

          it('should not modify empty input', () => {
               const mockInput = { value: '' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('');
          });

          it('should not modify non-numeric input', () => {
               const mockInput = { value: 'abc' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('abc');
          });
     });

     describe('onCurrencySelected', () => {
          const mockCurrencyItem = { id: 'USD', display: 'USD' } as SelectItem;

          beforeEach(() => {
               trustlineCurrencyService.selectCurrency.calls.reset();
               trustlineUtilService.loadTrustlines.calls.reset();
               trustlineCurrencyService.refreshCurrentBalance.calls.reset();
          });

          it('should select currency and refresh data', async () => {
               await component.onCurrencySelected(mockCurrencyItem);

               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('USD');
               expect(trustlineUtilService.loadTrustlines).toHaveBeenCalledWith(false);
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
          });

          it('should default to XRP when item is null', async () => {
               await component.onCurrencySelected(null);

               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('XRP');
               expect(trustlineUtilService.loadTrustlines).toHaveBeenCalledWith(false);
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
          });

          // Note: The component does NOT emit currencySelected event, so remove that test
     });

     describe('onIssuerSelected', () => {
          const mockIssuerItem = { id: 'rIssuer123', display: 'Issuer Name' } as SelectItem;

          beforeEach(() => {
               trustlineCurrencyService.selectIssuer.calls.reset();
               trustlineUtilService.loadTrustlines.calls.reset();
               trustlineCurrencyService.refreshCurrentBalance.calls.reset();

               // Set a currency so the condition passes
               currencySignal.set('USD');
          });

          afterEach(() => {
               currencySignal.set('XRP');
          });

          it('should select issuer and refresh data when currency exists', async () => {
               await component.onIssuerSelected(mockIssuerItem);

               expect(trustlineCurrencyService.selectIssuer).toHaveBeenCalledWith('rIssuer123');
               expect(trustlineUtilService.loadTrustlines).toHaveBeenCalledWith(false);
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
          });

          it('should handle null issuer item', async () => {
               await component.onIssuerSelected(null);

               expect(trustlineCurrencyService.selectIssuer).toHaveBeenCalledWith('');
          });

          it('should not load trustlines if currency is not selected', async () => {
               currencySignal.set('');
               trustlineUtilService.loadTrustlines.calls.reset();

               await component.onIssuerSelected(mockIssuerItem);

               expect(trustlineUtilService.loadTrustlines).not.toHaveBeenCalled();
               expect(trustlineCurrencyService.refreshCurrentBalance).not.toHaveBeenCalled();
          });

          // Note: The component does NOT emit issuerSelected event, so remove that test
     });

     describe('currencyItems', () => {
          it('should return currency items from trustlineCurrencyService', () => {
               const mockItems = [{ id: 'XRP', display: 'XRP' }] as any;
               currencyItemsSignal.set(mockItems);

               const result = component.currencyItems();

               expect(result).toEqual(mockItems); // Use toEqual, not toBe
               expect(trustlineCurrencyService.currencyItems).toHaveBeenCalled();
          });
     });

     describe('selectedCurrencyItem', () => {
          it('should return selected currency item when currency exists', () => {
               const mockItems = [
                    { id: 'XRP', display: 'XRP' },
                    { id: 'USD', display: 'USD' },
               ] as any;
               currencyItemsSignal.set(mockItems);
               currencySignal.set('USD');

               const result = component.selectedCurrencyItem();

               expect(result).toEqual(mockItems[1]);
          });

          it('should return null when no currency is selected', () => {
               currencySignal.set('');

               const result = component.selectedCurrencyItem();

               expect(result).toBeNull();
          });

          it('should return null when currency not found in items', () => {
               const mockItems = [{ id: 'XRP', display: 'XRP' }] as any;
               currencyItemsSignal.set(mockItems);
               currencySignal.set('EUR');

               const result = component.selectedCurrencyItem();

               expect(result).toBeNull();
          });
     });

     describe('issuerItems', () => {
          it('should return issuer items from trustlineCurrencyService', () => {
               const mockItems = [{ id: 'rIssuer1', display: 'Issuer 1' }] as any;
               issuerItemsSignal.set(mockItems);

               const result = component.issuerItems();

               expect(result).toEqual(mockItems); // Use toEqual, not toBe
               expect(trustlineCurrencyService.issuerItems).toHaveBeenCalled();
          });
     });

     describe('selectedIssuerItem', () => {
          it('should return selected issuer item when issuer exists', () => {
               const mockItems = [
                    { id: 'rIssuer1', display: 'Issuer 1' },
                    { id: 'rIssuer2', display: 'Issuer 2' },
               ] as any;
               issuerItemsSignal.set(mockItems);
               issuerSignal.set('rIssuer2');

               const result = component.selectedIssuerItem();

               expect(result).toEqual(mockItems[1]);
          });

          it('should return null when no issuer is selected', () => {
               issuerSignal.set('');

               const result = component.selectedIssuerItem();

               expect(result).toBeNull();
          });

          it('should return null when issuer not found in items', () => {
               const mockItems = [{ id: 'rIssuer1', display: 'Issuer 1' }] as any;
               issuerItemsSignal.set(mockItems);
               issuerSignal.set('rNonExistent');

               const result = component.selectedIssuerItem();

               expect(result).toBeNull();
          });
     });

     describe('@Input properties', () => {
          it('should accept destinationItems input', () => {
               const mockItems = [{ id: 'dest1', display: 'Destination 1' }] as any;
               component.destinationItems = mockItems;
               expect(component.destinationItems).toBe(mockItems);
          });

          it('should accept selectedDestinationItem input', () => {
               const mockItem = { id: 'dest1', display: 'Destination 1' } as any;
               component.selectedDestinationItem = mockItem;
               expect(component.selectedDestinationItem).toBe(mockItem);
          });

          it('should accept destinationSearchQuery input', () => {
               component.destinationSearchQuery = 'test query';
               expect(component.destinationSearchQuery).toBe('test query');
          });
     });
});
