import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { NftCancelOffersComponent } from './nft-cancel-offers.component';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('NftCancelOffersComponent', () => {
     let component: NftCancelOffersComponent;
     let fixture: ComponentFixture<NftCancelOffersComponent>;

     // Services
     let txUiService: any;
     let checksStoreService: any;
     let currencyStoreService: any;
     let utilsService: any;
     let trustlineCurrencyService: any;
     let trustlineUtilService: any;
     let xrplDateService: any;
     let nftUtilService: any;
     let nftCreateStoreService: any;
     let nftOffersTransactionViewModelService: any;

     // Mock offer items
     const mockOfferItems = [
          { id: 'offer1', display: '100 XRP offer', secondary: 'NFT123...', rawAmount: '100000000', isIOU: false },
          { id: 'offer2', display: '50 XRP offer', secondary: 'NFT456...', rawAmount: '50000000', isIOU: false },
          { id: 'offer3', display: '200 XRP offer', secondary: 'NFT789...', rawAmount: '200000000', isIOU: false },
     ];

     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     beforeEach(async () => {
          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          checksStoreService = {};

          currencyStoreService = {
               currency: signal('XRP'),
               issuer: signal(''),
               balance: signal('1000'),
          };

          utilsService = {
               updateAmount: jasmine.createSpy('updateAmount'),
               formatAmount: jasmine.createSpy('formatAmount').and.callFake((val: any) => val),
          };

          trustlineCurrencyService = {
               selectCurrency: jasmine.createSpy('selectCurrency'),
               selectIssuer: jasmine.createSpy('selectIssuer'),
               refreshCurrentBalance: jasmine.createSpy('refreshCurrentBalance').and.resolveTo(),
          };

          trustlineUtilService = {
               loadTrustlines: jasmine.createSpy('loadTrustlines').and.resolveTo(),
          };

          xrplDateService = {
               toLocalDateTimeString: jasmine.createSpy('toLocalDateTimeString').and.returnValue('2024-01-01T00:00:00'),
          };

          nftUtilService = {};

          nftCreateStoreService = {
               nftId: signal(''),
               nftOfferId: signal(''),
               expiration: signal(''),
               setField: jasmine.createSpy('setField'),
               existingSellOffers: signal([]),
          };

          nftOffersTransactionViewModelService = {
               offerItems: jasmine.createSpy('offerItems').and.returnValue(mockOfferItems),
               activeTab: signal('cancelNftOffer'),
          };

          await TestBed.configureTestingModule({
               imports: [NftCancelOffersComponent],
               providers: [
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: ChecksStoreService, useValue: checksStoreService },
                    { provide: CurrencyStoreService, useValue: currencyStoreService },
                    { provide: UtilsService, useValue: utilsService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: TrustlineUtilService, useValue: trustlineUtilService },
                    { provide: XrplDateService, useValue: xrplDateService },
                    { provide: NftUtilService, useValue: nftUtilService },
                    { provide: CreateNftStoreService, useValue: nftCreateStoreService },
                    { provide: NftOffersTransactionViewModelService, useValue: nftOffersTransactionViewModelService },
               ],
          })
               .overrideComponent(NftCancelOffersComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(NftCancelOffersComponent);
          component = fixture.componentInstance;

          // Set inputs
          component.destinationItems = mockDestinationItems;
          component.selectedDestinationItem = mockDestinationItems[0];
          component.destinationSearchQuery = '';

          fixture.detectChanges();
     });

     afterEach(() => {
          nftCreateStoreService.setField.calls.reset();
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

     describe('setNftExpirationDate', () => {
          it('should set expiration field in store', () => {
               const testDate = '2024-12-31T00:00:00';
               component.setNftExpirationDate(testDate);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('expiration', testDate);
          });
     });

     describe('onNftSelected', () => {
          it('should set nftId when item is provided', () => {
               const item = { id: 'nft123', display: 'NFT 1' } as SelectItem;
               component.onNftSelected(item);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', 'nft123');
          });

          it('should not set nftId when item is null', () => {
               component.onNftSelected(null);

               expect(nftCreateStoreService.setField).not.toHaveBeenCalled();
          });
     });

     describe('selectedOfferItem', () => {
          it('should return null when no offer ID', () => {
               nftCreateStoreService.nftOfferId.set('');
               const result = component.selectedOfferItem();
               expect(result).toBeNull();
          });

          // it('should return matching offer item when offer ID exists', () => {
          //      nftCreateStoreService.nftOfferId.set('offer2');
          //      const result = component.selectedOfferItem();
          //      expect(result).toEqual(mockOfferItems[1]);
          // });

          it('should return null when offer ID not found', () => {
               nftCreateStoreService.nftOfferId.set('nonexistent');
               const result = component.selectedOfferItem();
               expect(result).toBeNull();
          });
     });

     describe('onOfferSelected', () => {
          it('should set nftOfferId when item is provided', () => {
               const item = { id: 'offer123', display: 'Offer 1' } as SelectItem;
               component.onOfferSelected(item);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftOfferId', 'offer123');
          });

          it('should handle null item', () => {
               component.onOfferSelected(null);

               expect(nftCreateStoreService.setField).not.toHaveBeenCalled();
          });

          it('should handle item with undefined id', () => {
               const item = { display: 'Offer 1' } as SelectItem;
               component.onOfferSelected(item);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftOfferId', '');
          });
     });

     describe('Service injections', () => {
          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });

          it('should have checksStoreService injected', () => {
               expect(component.checksStoreService).toBe(checksStoreService);
          });

          it('should have currencyStoreService injected', () => {
               expect(component.currencyStoreService).toBe(currencyStoreService);
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

          it('should have nftUtilService injected', () => {
               expect(component.nftUtilService).toBe(nftUtilService);
          });

          it('should have nftCreateStoreService injected', () => {
               expect(component.nftCreateStoreService).toBe(nftCreateStoreService);
          });

          it('should have nftOffersTransactionViewModelService injected', () => {
               expect(component.nftOffersTransactionViewModelService).toBe(nftOffersTransactionViewModelService);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          // it('should have offerItems available for template', () => {
          //      const items = component.nftOffersTransactionViewModelService.offerItems();
          //      expect(items).toEqual(mockOfferItems);
          //      expect(items.length).toBe(3);
          // });

          // it('should have selectedOfferItem available for template', () => {
          //      nftCreateStoreService.nftOfferId.set('offer1');
          //      const selected = component.selectedOfferItem();
          //      expect(selected).toEqual(mockOfferItems[0]);
          // });

          it('should have nftOfferId signal available for template', () => {
               expect(component.nftCreateStoreService.nftOfferId).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty offer items', () => {
               nftOffersTransactionViewModelService.offerItems.and.returnValue([]);
               const items = component.nftOffersTransactionViewModelService.offerItems();
               expect(items).toEqual([]);
          });

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

          it('should handle long offer IDs', () => {
               const longId = 'a'.repeat(1000);
               component.onOfferSelected({ id: longId } as SelectItem);
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftOfferId', longId);
          });
     });
});
