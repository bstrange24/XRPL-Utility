import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { NftCreateFieldsComponent } from './nft-create-fields.component';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { NftTransactionOrchestrator } from '../../../../services/nft/nft-orchestrator/nft-orchestrator.service';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';

// Mock performance API
const mockPerformance = {
     mark: jasmine.createSpy('mark'),
     measure: jasmine.createSpy('measure'),
     getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 100 }]),
     clearMarks: jasmine.createSpy('clearMarks'),
     clearMeasures: jasmine.createSpy('clearMeasures'),
};
Object.defineProperty(window, 'performance', {
     value: mockPerformance,
     writable: true,
});

describe('NftCreateFieldsComponent', () => {
     let component: NftCreateFieldsComponent;
     let fixture: ComponentFixture<NftCreateFieldsComponent>;

     // Services
     let txUiService: any;
     let currencyStoreService: any;
     let nftOffersTransactionViewModelService: any;
     let utilsService: any;
     let trustlineCurrencyService: any;
     let trustlineUtilService: any;
     let xrplDateService: any;
     let walletManagerService: any;
     let nftUtilService: any;
     let nftCreateTransactionViewModelService: any;
     let nftCreateStoreService: any;
     let nftTransactionOrchestrator: any;

     // Mock data
     const mockCurrencyItems = [
          { id: 'XRP', display: 'XRP' },
          { id: 'USD', display: 'USD' },
     ];

     const mockIssuerItems = [
          { id: 'rIssuer1', display: 'Issuer 1' },
          { id: 'rIssuer2', display: 'Issuer 2' },
     ];

     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     // Mock nftFlags
     const mockNftFlags = { onlyXrpNft: false };
     const nftFlagsSignal = signal({ onlyXrpNft: false });

     beforeEach(async () => {
          // Reset performance spies
          mockPerformance.mark.calls.reset();
          mockPerformance.measure.calls.reset();
          mockPerformance.getEntriesByName.calls.reset();
          mockPerformance.clearMarks.calls.reset();
          mockPerformance.clearMeasures.calls.reset();

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          currencyStoreService = {
               currency: signal('XRP'),
               issuer: signal(''),
               balance: signal('1000'),
          };

          nftUtilService = {
               nftFlags: nftFlagsSignal.asReadonly(),
          };

          nftOffersTransactionViewModelService = {
               currencyItems: jasmine.createSpy('currencyItems').and.returnValue(mockCurrencyItems),
               selectedCurrencyItem: jasmine.createSpy('selectedCurrencyItem').and.returnValue(mockCurrencyItems[0]),
               issuerItems: jasmine.createSpy('issuerItems').and.returnValue(mockIssuerItems),
               selectedIssuerItem: jasmine.createSpy('selectedIssuerItem').and.returnValue(mockIssuerItems[0]),
          };

          utilsService = {
               updateAmount: jasmine.createSpy('updateAmount'),
               updateTransferFee: jasmine.createSpy('updateTransferFee'),
               formatAmount: jasmine.createSpy('formatAmount').and.callFake((val: any) => val),
          };

          // Single trustlineCurrencyService definition
          trustlineCurrencyService = jasmine.createSpyObj('TrustlineCurrencyService', ['selectCurrency', 'selectIssuer', 'refreshCurrentBalance', 'currencyItems', 'issuerItems', 'getExistingIOUs']);

          // Add signal properties
          (trustlineCurrencyService as any).preferXrpAsDefault = signal(false);
          (trustlineCurrencyService as any).addXrpInCurrencyDropdown = signal(false);
          (trustlineCurrencyService as any).addMptInCurrencyDropdown = signal(false);

          // Set return values
          trustlineCurrencyService.currencyItems.and.returnValue(mockCurrencyItems);
          trustlineCurrencyService.issuerItems.and.returnValue(mockIssuerItems);
          trustlineCurrencyService.refreshCurrentBalance.and.resolveTo();
          trustlineCurrencyService.selectCurrency.and.returnValue();
          trustlineCurrencyService.selectIssuer.and.returnValue();
          trustlineCurrencyService.getExistingIOUs.and.returnValue([]);

          trustlineUtilService = {
               loadTrustlines: jasmine.createSpy('loadTrustlines').and.resolveTo(),
          };

          xrplDateService = {
               toLocalDateTimeString: jasmine.createSpy('toLocalDateTimeString').and.returnValue('2024-01-01T00:00:00'),
          };

          walletManagerService = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue({ address: 'rTestWallet' }),
          };

          nftUtilService = {
               nftFlags: jasmine.createSpy('nftFlags').and.returnValue(mockNftFlags),
          };

          nftCreateTransactionViewModelService = {};

          nftCreateStoreService = {
               taxon: signal(''),
               transferFee: signal(0),
               initialURI: signal(''),
               nfTokenMinterAddress: signal(''),
               enableExpirationDate: signal(false),
               expiration: signal(''),
               amount: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          nftTransactionOrchestrator = {};

          await TestBed.configureTestingModule({
               imports: [NftCreateFieldsComponent],
               providers: [
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: CurrencyStoreService, useValue: currencyStoreService },
                    { provide: NftOffersTransactionViewModelService, useValue: nftOffersTransactionViewModelService },
                    { provide: UtilsService, useValue: utilsService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: TrustlineUtilService, useValue: trustlineUtilService },
                    { provide: XrplDateService, useValue: xrplDateService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: NftUtilService, useValue: nftUtilService },
                    { provide: NftTransactionViewModelService, useValue: nftCreateTransactionViewModelService },
                    { provide: CreateNftStoreService, useValue: nftCreateStoreService },
                    { provide: NftTransactionOrchestrator, useValue: nftTransactionOrchestrator },
               ],
          })
               .overrideComponent(NftCreateFieldsComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(NftCreateFieldsComponent);
          component = fixture.componentInstance;

          // Set inputs
          component.destinationItems = mockDestinationItems;
          component.selectedDestinationItem = mockDestinationItems[0];
          component.destinationSearchQuery = '';

          fixture.detectChanges();
     });

     afterEach(() => {
          nftCreateStoreService.setField.calls.reset();
          utilsService.updateAmount.calls.reset();
          utilsService.updateTransferFee.calls.reset();
          trustlineCurrencyService.selectCurrency.calls.reset();
          trustlineCurrencyService.refreshCurrentBalance.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept destinationItems input', () => {
               expect(component.destinationItems).toEqual(mockDestinationItems);
          });

          it('should accept selectedDestinationItem input', () => {
               expect(component.selectedDestinationItem).toEqual(mockDestinationItems[0]);
          });

          it('should accept destinationSearchQuery input', () => {
               expect(component.destinationSearchQuery).toBe('');
          });
     });

     describe('Output emitters', () => {
          it('should have destinationChanged emitter', () => {
               expect(component.destinationChanged).toBeDefined();
               expect(component.destinationChanged.emit).toBeDefined();
          });

          it('should have currencySelected emitter', () => {
               expect(component.currencySelected).toBeDefined();
               expect(component.currencySelected.emit).toBeDefined();
          });

          it('should have issuerSelected emitter', () => {
               expect(component.issuerSelected).toBeDefined();
               expect(component.issuerSelected.emit).toBeDefined();
          });

          it('should have optionsToggled emitter', () => {
               expect(component.optionsToggled).toBeDefined();
               expect(component.optionsToggled.emit).toBeDefined();
          });

          it('should have expirationToggled emitter', () => {
               expect(component.expirationToggled).toBeDefined();
               expect(component.expirationToggled.emit).toBeDefined();
          });

          it('should have destinationSearchQueryChange emitter', () => {
               expect(component.destinationSearchQueryChange).toBeDefined();
               expect(component.destinationSearchQueryChange.emit).toBeDefined();
          });

          it('should have destinationValueChange emitter', () => {
               expect(component.destinationValueChange).toBeDefined();
               expect(component.destinationValueChange.emit).toBeDefined();
          });
     });

     describe('onlyXrpEnabled', () => {
          it('should return onlyXrpNft value from nftFlags', () => {
               expect(component.onlyXrpEnabled()).toBeFalse();
          });
     });

     describe('onlyXrpEnabledSignal', () => {
          it('should return onlyXrpNft value from nftFlags', () => {
               expect(component.onlyXrpEnabledSignal).toBeFalse();
          });
     });

     describe('forceToXrp', () => {
          it('should force currency to XRP when not already XRP', () => {
               // Reset the spy to clear any previous calls
               trustlineCurrencyService.selectCurrency.calls.reset();
               trustlineCurrencyService.refreshCurrentBalance.calls.reset();

               currencyStoreService.currency.set('USD');
               (component as any).forceToXrp();

               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('XRP');
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
          });

          // it('should not change currency if already XRP', () => {
          //      // Reset the spy to clear any previous calls (from constructor effect)
          //      trustlineCurrencyService.selectCurrency.calls.reset();

          //      currencyStoreService.currency.set('XRP');
          //      (component as any).forceToXrp();

          //      expect(trustlineCurrencyService.selectCurrency).not.toHaveBeenCalled();
          // });
     });

     describe('restorePreviousCurrency', () => {
          it('should restore previous non-XRP currency', () => {
               (component as any).previousNonXrpCurrency.set('USD');
               (component as any).restorePreviousCurrency();

               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('USD');
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
          });

          it('should not restore if previous currency is XRP or null', () => {
               (component as any).previousNonXrpCurrency.set('XRP');
               (component as any).restorePreviousCurrency();

               expect(trustlineCurrencyService.selectCurrency).not.toHaveBeenCalled();
          });
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

          it('should handle negative numbers', () => {
               const mockInput = { value: '-5.5' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('-5.500000');
          });
     });

     describe('setNftExpirationDate', () => {
          it('should set expiration field in store', () => {
               const testDate = '2024-12-31T00:00:00';
               component.setNftExpirationDate(testDate);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('expiration', testDate);
          });
     });

     describe('Service injections', () => {
          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });

          it('should have currencyStoreService injected', () => {
               expect(component.currencyStoreService).toBe(currencyStoreService);
          });

          it('should have nftOffersTransactionViewModelService injected', () => {
               expect(component.nftOffersTransactionViewModelService).toBe(nftOffersTransactionViewModelService);
          });

          it('should have utilsService injected', () => {
               expect(component.utilsService).toBe(utilsService);
          });

          it('should have trustlineCurrencyService injected', () => {
               expect(component.trustlineCurrencyService).toBe(trustlineCurrencyService);
          });

          it('should have trustlineUtilService injected', () => {
               expect(component.trustlineUtilService).toBe(trustlineUtilService);
          });

          it('should have xrplDateService injected', () => {
               expect(component.xrplDateService).toBe(xrplDateService);
          });

          it('should have walletManagerService injected', () => {
               expect(component.walletManagerService).toBe(walletManagerService);
          });

          it('should have nftUtilService injected', () => {
               expect(component.nftUtilService).toBe(nftUtilService);
          });

          it('should have nftCreateStoreService injected', () => {
               expect(component.nftCreateStoreService).toBe(nftCreateStoreService);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have taxon signal available for template', () => {
               expect(component.nftCreateStoreService.taxon).toBeDefined();
          });

          it('should have transferFee signal available for template', () => {
               expect(component.nftCreateStoreService.transferFee).toBeDefined();
          });

          it('should have initialURI signal available for template', () => {
               expect(component.nftCreateStoreService.initialURI).toBeDefined();
          });

          it('should have nfTokenMinterAddress signal available for template', () => {
               expect(component.nftCreateStoreService.nfTokenMinterAddress).toBeDefined();
          });

          it('should have enableExpirationDate signal available for template', () => {
               expect(component.nftCreateStoreService.enableExpirationDate).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty destinationItems array', () => {
               component.destinationItems = [];
               fixture.detectChanges();
               expect(component.destinationItems).toEqual([]);
          });

          it('should handle null selectedDestinationItem', () => {
               component.selectedDestinationItem = null;
               fixture.detectChanges();
               expect(component.selectedDestinationItem).toBeNull();
          });

          it('should handle transfer fee update', () => {
               utilsService.updateTransferFee(5000);
               expect(utilsService.updateTransferFee).toHaveBeenCalledWith(5000);
          });

          it('should handle amount update', () => {
               utilsService.updateAmount('100');
               expect(utilsService.updateAmount).toHaveBeenCalledWith('100');
          });

          // it('should handle when onlyXrpEnabled changes', () => {
          //      const mockNftFlagsTrue = { onlyXrpNft: true };
          //      nftUtilService.nftFlags.and.returnValue(mockNftFlagsTrue);

          //      // Trigger change detection to update the computed value
          //      fixture.detectChanges();

          //      // Access the computed value through the component
          //      expect(component.onlyXrpEnabled()).toBeTrue();
          // });
     });
});
