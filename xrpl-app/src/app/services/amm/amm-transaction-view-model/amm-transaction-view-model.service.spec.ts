import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AmmTransactionViewModelService } from './amm-transaction-view-model.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { AmmStoreService } from '../amm-store/amm-store.service';
import { OfferCurrencyService } from '../../offer/offer-currency/offer-currency.service';

describe('AmmTransactionViewModelService', () => {
     let service: AmmTransactionViewModelService;
     let xrplCacheServiceMock: any;
     let utilsServiceMock: any;
     let walletManagerServiceMock: any;
     let txUiServiceMock: any;
     let ammStoreServiceMock: any;
     let offerCurrencyServiceMock: any;

     const mockIssuers = [
          { address: 'rIssuer1', name: 'Issuer One' },
          { address: 'rIssuer2', name: 'Issuer Two' },
     ];

     const mockAvailableCurrencies = ['USD', 'EUR', 'XRP'];

     beforeEach(() => {
          xrplCacheServiceMock = {};

          utilsServiceMock = {};

          walletManagerServiceMock = {};

          txUiServiceMock = {};

          ammStoreServiceMock = {};

          offerCurrencyServiceMock = {
               getAvailableCurrencies: jasmine.createSpy('getAvailableCurrencies').and.returnValue(mockAvailableCurrencies),
               getIssuersForCurrency: jasmine.createSpy('getIssuersForCurrency').and.returnValue(mockIssuers),
               weWant: {
                    currency: signal(''),
                    issuers: signal([]),
                    balance: signal('0'),
               },
               weSpend: {
                    currency: signal('XRP'),
                    issuers: signal([]),
                    balance: signal('0'),
               },
          };

          TestBed.configureTestingModule({
               providers: [AmmTransactionViewModelService, { provide: XrplCacheService, useValue: xrplCacheServiceMock }, { provide: UtilsService, useValue: utilsServiceMock }, { provide: WalletManagerService, useValue: walletManagerServiceMock }, { provide: TransactionUiService, useValue: txUiServiceMock }, { provide: AmmStoreService, useValue: ammStoreServiceMock }, { provide: OfferCurrencyService, useValue: offerCurrencyServiceMock }],
          });

          service = TestBed.inject(AmmTransactionViewModelService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('activeTab', () => {
          it('should default to createAMM', () => {
               expect(service.activeTab()).toBe('createAMM');
          });

          it('should be settable', () => {
               service.activeTab.set('depositToAMM');
               expect(service.activeTab()).toBe('depositToAMM');
          });
     });

     describe('pool1Currency', () => {
          it('should default to empty string', () => {
               expect(service.pool1Currency()).toBe('');
          });

          it('should be settable', () => {
               service.pool1Currency.set('USD');
               expect(service.pool1Currency()).toBe('USD');
          });
     });

     describe('pool1Issuer', () => {
          it('should default to empty string', () => {
               expect(service.pool1Issuer()).toBe('');
          });

          it('should be settable', () => {
               service.pool1Issuer.set('rIssuer1');
               expect(service.pool1Issuer()).toBe('rIssuer1');
          });
     });

     describe('pool2Currency', () => {
          it('should default to XRP', () => {
               expect(service.pool2Currency()).toBe('XRP');
          });

          it('should be settable', () => {
               service.pool2Currency.set('EUR');
               expect(service.pool2Currency()).toBe('EUR');
          });
     });

     describe('pool2Issuer', () => {
          it('should default to empty string', () => {
               expect(service.pool2Issuer()).toBe('');
          });

          it('should be settable', () => {
               service.pool2Issuer.set('rIssuer2');
               expect(service.pool2Issuer()).toBe('rIssuer2');
          });
     });

     describe('asset1UserBalance', () => {
          it('should return weWant balance', () => {
               offerCurrencyServiceMock.weWant.balance.set('100');
               expect(service.asset1UserBalance()).toBe('100');
          });
     });

     describe('asset2UserBalance', () => {
          it('should return weSpend balance', () => {
               offerCurrencyServiceMock.weSpend.balance.set('200');
               expect(service.asset2UserBalance()).toBe('200');
          });
     });

     describe('pool1CurrencyItems', () => {
          it('should return currency items', () => {
               const items = service.pool1CurrencyItems();
               expect(items.length).toBe(3);
               expect(items[0].id).toBe('USD');
               expect(items[0].display).toBe('USD');
          });

          it('should show XRP secondary as "Native currency"', () => {
               const items = service.pool1CurrencyItems();
               const xrpItem = items.find(i => i.id === 'XRP');
               expect(xrpItem?.secondary).toBe('Native currency');
          });

          it('should show issuer count for non-XRP currencies', () => {
               offerCurrencyServiceMock.getIssuersForCurrency.and.returnValue(mockIssuers);
               const items = service.pool1CurrencyItems();
               const usdItem = items.find(i => i.id === 'USD');
               expect(usdItem?.secondary).toBe('2 issuers');
          });

          it('should show "No issuers" when none available', () => {
               offerCurrencyServiceMock.getIssuersForCurrency.and.returnValue([]);
               const items = service.pool1CurrencyItems();
               const usdItem = items.find(i => i.id === 'USD');
               expect(usdItem?.secondary).toBe('No issuers');
          });
     });

     describe('selectedPool1CurrencyItem', () => {
          it('should return null when no currency selected', () => {
               service.pool1Currency.set('');
               expect(service.selectedPool1CurrencyItem()).toBeNull();
          });

          it('should return matching currency item', () => {
               service.pool1Currency.set('USD');
               const item = service.selectedPool1CurrencyItem();
               expect(item?.id).toBe('USD');
          });
     });

     describe('pool1IssuerItems', () => {
          it('should return issuer items', () => {
               offerCurrencyServiceMock.weWant.issuers.set(mockIssuers);
               const items = service.pool1IssuerItems();
               expect(items.length).toBe(2);
               expect(items[0].id).toBe('rIssuer1');
               expect(items[0].display).toBe('Issuer One');
               expect(items[0].secondary).toContain('...');
          });

          it('should return empty array when no issuers', () => {
               offerCurrencyServiceMock.weWant.issuers.set([]);
               const items = service.pool1IssuerItems();
               expect(items).toEqual([]);
          });
     });

     describe('selectedPool1IssuerItem', () => {
          it('should return null when no issuer selected', () => {
               service.pool1Issuer.set('');
               expect(service.selectedPool1IssuerItem()).toBeNull();
          });

          it('should return matching issuer item', () => {
               offerCurrencyServiceMock.weWant.issuers.set(mockIssuers);
               service.pool1Issuer.set('rIssuer1');
               const item = service.selectedPool1IssuerItem();
               expect(item?.id).toBe('rIssuer1');
          });
     });

     describe('pool2CurrencyItems', () => {
          it('should return XRP only', () => {
               const items = service.pool2CurrencyItems();
               expect(items.length).toBe(1);
               expect(items[0].id).toBe('XRP');
               expect(items[0].display).toBe('XRP');
               expect(items[0].secondary).toBe('Native currency');
          });
     });

     describe('selectedPool2CurrencyItem', () => {
          it('should return the XRP currency item', () => {
               const item = service.selectedPool2CurrencyItem();
               expect(item?.id).toBe('XRP');
          });
     });

     describe('pool2IssuerItems', () => {
          it('should return issuer items', () => {
               offerCurrencyServiceMock.weSpend.issuers.set(mockIssuers);
               const items = service.pool2IssuerItems();
               expect(items.length).toBe(2);
               expect(items[0].id).toBe('rIssuer1');
          });

          it('should return empty array when no issuers', () => {
               offerCurrencyServiceMock.weSpend.issuers.set([]);
               const items = service.pool2IssuerItems();
               expect(items).toEqual([]);
          });
     });

     describe('selectedPool2IssuerItem', () => {
          it('should return null when no issuer selected', () => {
               service.pool2Issuer.set('');
               expect(service.selectedPool2IssuerItem()).toBeNull();
          });

          it('should return matching issuer item', () => {
               offerCurrencyServiceMock.weSpend.issuers.set(mockIssuers);
               service.pool2Issuer.set('rIssuer1');
               const item = service.selectedPool2IssuerItem();
               expect(item?.id).toBe('rIssuer1');
          });
     });

     describe('Signals integration', () => {
          it('should update pool1IssuersTrigger when changed', () => {
               const initial = service.pool1IssuersTrigger();
               service.pool1IssuersTrigger.update(n => n + 1);
               expect(service.pool1IssuersTrigger()).toBe(initial + 1);
          });

          it('should update pool2IssuersTrigger when changed', () => {
               const initial = service.pool2IssuersTrigger();
               service.pool2IssuersTrigger.update(n => n + 1);
               expect(service.pool2IssuersTrigger()).toBe(initial + 1);
          });
     });
});
