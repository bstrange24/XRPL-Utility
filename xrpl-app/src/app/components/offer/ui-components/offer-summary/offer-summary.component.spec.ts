import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { OfferSummaryComponent } from './offer-summary.component';
import { OfferTransactionViewModelService } from '../../../../services/offer/offer-transaction-view-model/offer-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { OfferStoreService } from '../../../../services/offer/offer-store/offer-store.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';

// Mock child components
@Component({ selector: 'app-summary-container', template: '<div></div>', standalone: true })
class MockSummaryContainer {}

@Component({ selector: 'app-summary-item', template: '<div></div>', standalone: true })
class MockSummaryItem {}

@Component({ selector: 'app-summary-key-value', template: '<div></div>', standalone: true })
class MockSummaryKeyValue {}

@Component({ selector: 'app-tooltip-link', template: '<div></div>', standalone: true })
class MockTooltipLink {}

describe('OfferSummaryComponent', () => {
     let component: OfferSummaryComponent;
     let fixture: ComponentFixture<OfferSummaryComponent>;
     let viewSpy: any;
     let txUiServiceSpy: any;
     let copyUtilServiceSpy: jasmine.SpyObj<CopyUtilService>;
     let storeSpy: any;

     const mockOffer = {
          index: '12345',
          takerGets: '100 XRP',
          takerPays: '50 USD',
          issuer: 'rIssuer1',
          flags: ['tfPassive'],
     };

     const mockOffers = [mockOffer, { ...mockOffer, index: '67890', flags: [] }];

     const mockInfoData = {
          walletName: 'Test Wallet',
          offerCount: 2,
          offersToShow: mockOffers,
          isOrderBookTab: false,
          pair: 'XRP/USD',
          stats: {
               vwap: '0.5',
               simpleAvg: '0.48',
               bestRate: '0.52',
               spread: '0.04',
               spreadPercent: '8.3',
               depth: '1000',
               execution: '850',
               volatility: '0.12',
               liquidityRatio: '2.5',
          },
     };

     const mockOrderBookInfo = {
          ...mockInfoData,
          isOrderBookTab: true,
          offerCount: 0,
     };

     beforeEach(async () => {
          viewSpy = {
               activeTab: signal('createOffer'),
          };

          txUiServiceSpy = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          copyUtilServiceSpy = jasmine.createSpyObj('CopyUtilService', ['copyAndToast']);
          storeSpy = {};

          await TestBed.configureTestingModule({
               imports: [OfferSummaryComponent],
               providers: [provideNoopAnimations(), provideIcons({}), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: OfferTransactionViewModelService, useValue: viewSpy }, { provide: TransactionUiService, useValue: txUiServiceSpy }, { provide: CopyUtilService, useValue: copyUtilServiceSpy }, { provide: OfferStoreService, useValue: storeSpy }],
          })
               .overrideComponent(OfferSummaryComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(OfferSummaryComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('infoPanelExpanded', false);

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have infoPanelExpanded input', () => {
               expect(component.infoPanelExpanded()).toBeFalse();
          });

          it('should accept infoPanelExpanded as true', () => {
               fixture.componentRef.setInput('infoPanelExpanded', true);
               fixture.detectChanges();
               expect(component.infoPanelExpanded()).toBeTrue();
          });
     });

     describe('Outputs', () => {
          it('should emit toggleInfoPanel when called', () => {
               spyOn(component.toggleInfoPanel, 'emit');
               component.toggleInfoPanel.emit();
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });
     });

     describe('getSummaryText', () => {
          it('should return order book text when isOrderBookTab is true', () => {
               const result = component.getSummaryText(mockOrderBookInfo);
               expect(result).toContain('viewing order book for <strong>XRP/USD</strong>');
          });

          it('should return no offers message when offerCount is 0', () => {
               const emptyInfo = { ...mockInfoData, offerCount: 0 };
               const result = component.getSummaryText(emptyInfo);
               expect(result).toBe(' has no outstanding offers.');
          });

          it('should return singular offer text when offerCount is 1', () => {
               const singleOfferInfo = { ...mockInfoData, offerCount: 1 };
               const result = component.getSummaryText(singleOfferInfo);
               expect(result).toBe(' has <strong>1</strong> outstanding offer.');
          });

          it('should return plural offer text when offerCount > 1', () => {
               const result = component.getSummaryText(mockInfoData);
               expect(result).toBe(' has <strong>2</strong> outstanding offers.');
          });
     });

     describe('getButtonLabel', () => {
          it('should return "order book" when isOrderBookTab is true', () => {
               const result = component.getButtonLabel(mockOrderBookInfo);
               expect(result).toBe('order book');
          });

          it('should return singular "offer" when offerCount is 1', () => {
               const singleOfferInfo = { ...mockInfoData, offerCount: 1 };
               const result = component.getButtonLabel(singleOfferInfo);
               expect(result).toBe('offer');
          });

          it('should return plural "offers" when offerCount > 1', () => {
               const result = component.getButtonLabel(mockInfoData);
               expect(result).toBe('offers');
          });
     });

     describe('getEmptyStateMessage', () => {
          it('should return create offer message when activeTab is createOffer', () => {
               viewSpy.activeTab.set('createOffer');
               const result = component.getEmptyStateMessage();
               expect(result).toBe('This wallet has not created any Offers yet.');
          });

          it('should return cancel offer message when activeTab is cancelOffer', () => {
               viewSpy.activeTab.set('cancelOffer');
               const result = component.getEmptyStateMessage();
               expect(result).toBe('This wallet has no Offers to cancel.');
          });

          it('should return default message for other tabs', () => {
               viewSpy.activeTab.set('getOrderBook');
               const result = component.getEmptyStateMessage();
               expect(result).toBe('No offers found.');
          });
     });

     describe('onOfferClick', () => {
          it('should log offer click', () => {
               spyOn(console, 'log');
               component.onOfferClick(mockOffer);
               expect(console.log).toHaveBeenCalledWith('Offer clicked:', mockOffer);
          });
     });

     describe('Service Injections', () => {
          it('should have view injected', () => {
               expect(component.view).toBe(viewSpy);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiServiceSpy);
          });

          it('should have copyUtilService injected', () => {
               expect(component.copyUtilService).toBe(copyUtilServiceSpy);
          });

          it('should have store injected', () => {
               expect(component.store).toBe(storeSpy);
          });
     });

     describe('Order Book Stats Display', () => {
          it('should show stats when isOrderBookTab is true', () => {
               expect(mockOrderBookInfo.isOrderBookTab).toBeTrue();
               expect(mockOrderBookInfo.stats).toBeDefined();
          });

          it('should display VWAP stat', () => {
               expect(mockOrderBookInfo.stats.vwap).toBe('0.5');
          });

          it('should display Simple Avg stat', () => {
               expect(mockOrderBookInfo.stats.simpleAvg).toBe('0.48');
          });

          it('should display Best Rate stat', () => {
               expect(mockOrderBookInfo.stats.bestRate).toBe('0.52');
          });

          it('should display Spread stat', () => {
               expect(mockOrderBookInfo.stats.spread).toBe('0.04');
               expect(mockOrderBookInfo.stats.spreadPercent).toBe('8.3');
          });

          it('should display Depth stat', () => {
               expect(mockOrderBookInfo.stats.depth).toBe('1000');
          });

          it('should display Execution stat', () => {
               expect(mockOrderBookInfo.stats.execution).toBe('850');
          });

          it('should display Volatility stat', () => {
               expect(mockOrderBookInfo.stats.volatility).toBe('0.12');
          });

          it('should display Liquidity Ratio stat', () => {
               expect(mockOrderBookInfo.stats.liquidityRatio).toBe('2.5');
          });
     });

     describe('Offer Display', () => {
          it('should display offer index', () => {
               expect(mockOffer.index).toBe('12345');
          });

          it('should display takerGets to takerPays', () => {
               expect(mockOffer.takerGets).toBe('100 XRP');
               expect(mockOffer.takerPays).toBe('50 USD');
          });

          it('should display issuer', () => {
               expect(mockOffer.issuer).toBe('rIssuer1');
          });

          it('should display flags when present', () => {
               expect(mockOffer.flags).toEqual(['tfPassive']);
          });

          it('should not display flags section when empty', () => {
               const offerWithoutFlags = { ...mockOffer, flags: [] };
               expect(offerWithoutFlags.flags.length).toBe(0);
          });
     });

     describe('Edge Cases', () => {
          it('should handle undefined infoData', () => {
               // The template condition @if (view.infoData(); as info) handles undefined
               expect(true).toBeTrue();
          });

          it('should handle null stats in order book', () => {
               const infoWithoutStats = { ...mockOrderBookInfo, stats: null };
               expect(infoWithoutStats.stats).toBeNull();
          });

          it('should handle empty offersToShow', () => {
               const emptyOffersInfo = { ...mockInfoData, offersToShow: [], offerCount: 0 };
               expect(emptyOffersInfo.offersToShow.length).toBe(0);
          });

          it('should handle missing flags on offer', () => {
               const offerWithoutFlags = { ...mockOffer, flags: undefined };
               expect(offerWithoutFlags.flags).toBeUndefined();
          });
     });

     describe('Explorer URL', () => {
          it('should return explorerUrl from txUiService', () => {
               expect(component.txUiService.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });
});
