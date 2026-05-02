import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { NftSellComponent } from './nft-sell.component';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { NftOffersTransactionViewModelService } from '../../../../services/nft/nft-offers-transaction-view-model/nft-offers-transaction-view-model.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NftTransactionOrchestrator } from '../../../../services/nft/nft-orchestrator/nft-orchestrator.service';

describe('NftSellComponent', () => {
     let component: NftSellComponent;
     let fixture: ComponentFixture<NftSellComponent>;

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
     let trustlineCurrency: any;
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

     const mockNftItems = [
          { id: 'nft1', display: 'NFT 1', secondary: 'Token 1' },
          { id: 'nft2', display: 'NFT 2', secondary: 'Token 2' },
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

          currencyStoreService = {
               currency: signal('XRP'),
               issuer: signal(''),
               balance: signal('1000'),
          };

          nftOffersTransactionViewModelService = {
               currencyItems: jasmine.createSpy('currencyItems').and.returnValue(mockCurrencyItems),
               selectedCurrencyItem: jasmine.createSpy('selectedCurrencyItem').and.returnValue(mockCurrencyItems[0]),
               issuerItems: jasmine.createSpy('issuerItems').and.returnValue(mockIssuerItems),
               selectedIssuerItem: jasmine.createSpy('selectedIssuerItem').and.returnValue(mockIssuerItems[0]),
               activeTab: signal('sellNft'),
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

          walletManagerService = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue({ address: 'rTestWallet' }),
          };

          nftUtilService = {
               nftItems: jasmine.createSpy('nftItems').and.returnValue(mockNftItems),
               selectedNftItem: jasmine.createSpy('selectedNftItem').and.returnValue(mockNftItems[0]),
          };

          trustlineCurrency = {
               selectCurrency: jasmine.createSpy('selectCurrency'),
          };

          nftCreateTransactionViewModelService = {};

          nftCreateStoreService = {
               nftId: signal(''),
               nftOfferId: signal(''),
               expiration: signal(''),
               amount: signal(''),
               existingNfts: signal([]),
               setField: jasmine.createSpy('setField'),
          };

          nftTransactionOrchestrator = {};

          await TestBed.configureTestingModule({
               imports: [NftSellComponent],
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
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrency },
                    { provide: NftTransactionViewModelService, useValue: nftCreateTransactionViewModelService },
                    { provide: CreateNftStoreService, useValue: nftCreateStoreService },
                    { provide: NftTransactionOrchestrator, useValue: nftTransactionOrchestrator },
               ],
          })
               .overrideComponent(NftSellComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(NftSellComponent);
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

     describe('onNftSelected', () => {
          it('should set nftId when item is provided', () => {
               const item = { id: 'nft123', display: 'NFT 1' } as SelectItem;
               component.onNftSelected(item);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', 'nft123');
          });

          it('should handle item with undefined id', () => {
               const item = { display: 'NFT 1' } as SelectItem;
               component.onNftSelected(item);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', '');
          });

          it('should not set nftId when item is null', () => {
               component.onNftSelected(null);

               expect(nftCreateStoreService.setField).not.toHaveBeenCalled();
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

          // it('should have trustlineCurrencyService injected', () => {
          //      expect(component.trustlineCurrencyService).toBe(trustlineCurrencyService);
          // });

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
          // it('should have currencyItems available for template', () => {
          //      const items = component.nftOffersTransactionViewModelService.currencyItems();
          //      expect(items).toEqual(mockCurrencyItems);
          // });

          // it('should have selectedCurrencyItem available for template', () => {
          //      const selected = component.nftOffersTransactionViewModelService.selectedCurrencyItem();
          //      expect(selected).toEqual(mockCurrencyItems[0]);
          // });

          it('should have amount signal available for template', () => {
               expect(component.nftCreateStoreService.amount).toBeDefined();
          });

          it('should have currency signal available for template', () => {
               expect(component.currencyStoreService.currency()).toBe('XRP');
          });

          // it('should have issuerItems available for template', () => {
          //      const items = component.nftOffersTransactionViewModelService.issuerItems();
          //      expect(items).toEqual(mockIssuerItems);
          // });

          // it('should have selectedIssuerItem available for template', () => {
          //      const selected = component.nftOffersTransactionViewModelService.selectedIssuerItem();
          //      expect(selected).toEqual(mockIssuerItems[0]);
          // });

          it('should have balance available for template', () => {
               expect(component.currencyStoreService.balance()).toBe('1000');
          });

          // it('should have nftItems available for template', () => {
          //      const items = component.nftUtilService.nftItems();
          //      expect(items).toEqual(mockNftItems);
          // });

          // it('should have selectedNftItem available for template', () => {
          //      const selected = component.nftUtilService.selectedNftItem();
          //      expect(selected).toEqual(mockNftItems[0]);
          // });

          it('should have nftId signal available for template', () => {
               expect(component.nftCreateStoreService.nftId).toBeDefined();
          });

          it('should have expiration signal available for template', () => {
               expect(component.nftCreateStoreService.expiration).toBeDefined();
          });

          it('should have existingNfts available for template', () => {
               expect(component.nftCreateStoreService.existingNfts().length).toBe(0);
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

          it('should handle empty nftItems', () => {
               nftUtilService.nftItems.and.returnValue([]);
               const items = component.nftUtilService.nftItems();
               expect(items).toEqual([]);
          });

          it('should handle long NFT IDs', () => {
               const longId = 'a'.repeat(1000);
               component.onNftSelected({ id: longId } as SelectItem);
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', longId);
          });

          it('should handle rapid expiration date changes', () => {
               for (let i = 0; i < 10; i++) {
                    component.setNftExpirationDate(`2024-12-${i + 1}T00:00:00`);
               }

               expect(nftCreateStoreService.setField).toHaveBeenCalledTimes(10);
          });
     });
});
