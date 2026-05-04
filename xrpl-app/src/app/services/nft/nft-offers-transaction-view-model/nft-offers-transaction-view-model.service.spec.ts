import { TestBed } from '@angular/core/testing';
import { NftOffersTransactionViewModelService } from './nft-offers-transaction-view-model.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { CreateNftStoreService } from '../nft-store/nft-store.service';
import { NftUtilService } from '../nft-util/nft-util.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { signal, WritableSignal } from '@angular/core';
import * as xrpl from 'xrpl';

// Add this at the top of the test file, after imports
(window as any).Buffer = {
     from: (str: string) => ({
          toString: () => {
               let hex = '';
               for (let i = 0; i < str.length; i++) {
                    const charCode = str.charCodeAt(i);
                    hex += charCode.toString(16).padStart(2, '0');
               }
               return hex;
          },
     }),
};

describe('NftOffersTransactionViewModelService', () => {
     let service: NftOffersTransactionViewModelService;
     let mockXrplCacheService: jasmine.SpyObj<XrplCacheService>;
     let mockCheckUtilService: jasmine.SpyObj<CheckUtilService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockWalletManagerService: jasmine.SpyObj<WalletManagerService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockTrustlineCurrencyService: jasmine.SpyObj<TrustlineCurrencyService>;
     let mockCurrencyStoreService: jasmine.SpyObj<typeof CurrencyStoreService>;
     let mockTrustlineStoreService: jasmine.SpyObj<typeof TrustlineStoreService>;
     let mockNftCreateStoreService: any;
     let mockNftUtilService: jasmine.SpyObj<NftUtilService>;

     let currencyItemsSignal: WritableSignal<any[]>;
     let issuerItemsSignal: WritableSignal<any[]>;
     let currencySignal: WritableSignal<string>;
     let issuerSignal: WritableSignal<string>;
     let balanceSignal: WritableSignal<string>;
     let existingBuyOffersSignal: WritableSignal<any[]>;
     let existingSellOffersSignal: WritableSignal<any[]>;

     const mockWallet = {
          address: 'rTestAddress1234567890',
          classicAddress: 'rTestAddress1234567890',
          name: 'Test Wallet',
          seed: 'test-seed',
     };

     const mockBuyOffers = [
          {
               OfferIndex: 'offer123',
               NFTokenID: 'nft12345678901234567890',
               Amount: '1000000',
               Owner: 'rOwnerAddress',
               Flags: 0,
          },
     ];

     const mockSellOffers = [
          {
               OfferIndex: 'offer456',
               NFTokenID: 'nft09876543210987654321',
               Amount: '2000000',
               Owner: 'rSellerAddress',
               Flags: 1,
               Expiration: 1234567890,
          },
          {
               OfferIndex: 'offer789',
               NFTokenID: 'nft11111111111111111111',
               Amount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
               Owner: 'rSellerAddress2',
               Flags: 1,
          },
     ];

     beforeEach(() => {
          currencyItemsSignal = signal<any[]>([
               { id: 'USD', display: 'USD', group: 'Currency' },
               { id: 'EUR', display: 'EUR', group: 'Currency' },
          ]);
          issuerItemsSignal = signal<any[]>([
               { id: 'rIssuerAddress', display: 'rIssuerAddress', group: 'Issuer' },
               { id: 'rOtherIssuer', display: 'rOtherIssuer', group: 'Issuer' },
          ]);
          currencySignal = signal<string>('USD');
          issuerSignal = signal<string>('rIssuerAddress');
          balanceSignal = signal<string>('1000');
          existingBuyOffersSignal = signal<any[]>(mockBuyOffers);
          existingSellOffersSignal = signal<any[]>(mockSellOffers);

          mockXrplCacheService = jasmine.createSpyObj('XrplCacheService', ['someMethod']);
          mockCheckUtilService = jasmine.createSpyObj('CheckUtilService', ['someMethod']);
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);
          mockWalletManagerService = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['someMethod']);
          mockTrustlineCurrencyService = jasmine.createSpyObj('TrustlineCurrencyService', ['currencyItems', 'issuerItems']);
          mockCurrencyStoreService = jasmine.createSpyObj('CurrencyStoreService', ['currency', 'issuer', 'balance']);
          mockTrustlineStoreService = jasmine.createSpyObj('TrustlineStoreService', ['someMethod']);
          mockNftCreateStoreService = {
               existingBuyOffers: existingBuyOffersSignal,
               existingSellOffers: existingSellOffersSignal,
          };
          mockNftUtilService = jasmine.createSpyObj('NftUtilService', ['someMethod']);

          mockWalletManagerService.getSelectedWallet.and.returnValue(mockWallet as any);

          Object.defineProperty(mockTrustlineCurrencyService, 'currencyItems', { get: () => currencyItemsSignal });
          Object.defineProperty(mockTrustlineCurrencyService, 'issuerItems', { get: () => issuerItemsSignal });
          Object.defineProperty(mockCurrencyStoreService, 'currency', { get: () => currencySignal });
          Object.defineProperty(mockCurrencyStoreService, 'issuer', { get: () => issuerSignal });
          Object.defineProperty(mockCurrencyStoreService, 'balance', { get: () => balanceSignal });

          TestBed.configureTestingModule({
               providers: [
                    NftOffersTransactionViewModelService,
                    { provide: XrplCacheService, useValue: mockXrplCacheService },
                    { provide: CheckUtilService, useValue: mockCheckUtilService },
                    { provide: UtilsService, useValue: mockUtilsService },
                    { provide: WalletManagerService, useValue: mockWalletManagerService },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: TrustlineCurrencyService, useValue: mockTrustlineCurrencyService },
                    { provide: CurrencyStoreService, useValue: mockCurrencyStoreService },
                    { provide: TrustlineStoreService, useValue: mockTrustlineStoreService },
                    { provide: CreateNftStoreService, useValue: mockNftCreateStoreService },
                    { provide: NftUtilService, useValue: mockNftUtilService },
               ],
          });

          service = TestBed.inject(NftOffersTransactionViewModelService);
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should initialize activeTab to sellNft', () => {
               expect(service.activeTab()).toBe('sellNft');
          });
     });

     describe('selectedIssuerAddress', () => {
          it('should return issuer from currency store', () => {
               expect(service.selectedIssuerAddress()).toBe('rIssuerAddress');
          });
     });

     describe('selectedCurrencyItem', () => {
          it('should return matching currency item', () => {
               const item = service.selectedCurrencyItem();
               expect(item?.id).toBe('USD');
          });

          it('should return null when no match found', () => {
               currencySignal.set('GBP');
               const item = service.selectedCurrencyItem();
               expect(item).toBeNull();
          });
     });

     describe('selectedIssuerItem', () => {
          it('should return matching issuer item', () => {
               const item = service.selectedIssuerItem();
               expect(item?.id).toBe('rIssuerAddress');
          });
     });

     describe('infoData', () => {
          it('should return null when no wallet', () => {
               mockWalletManagerService.getSelectedWallet.and.returnValue(null);
               expect(service.infoData()).toBeNull();
          });

          it('should return info for buyNft tab', () => {
               service.activeTab.set('buyNft');
               const info = service.infoData();
               expect(info?.walletName).toBe('Test Wallet');
               expect(info?.activeTab).toBe('buyNft');
               expect(info?.offerCount).toBe(1);
               expect(info?.offersToShow.length).toBe(1);
          });

          it('should return info for buyNftOffer tab', () => {
               service.activeTab.set('buyNftOffer');
               const info = service.infoData();
               expect(info?.offerCount).toBe(1);
          });

          it('should return info for sellNft tab', () => {
               service.activeTab.set('sellNft');
               const info = service.infoData();
               expect(info?.offerCount).toBe(2);
          });

          it('should return info for sellNftOffer tab', () => {
               service.activeTab.set('sellNftOffer');
               const info = service.infoData();
               expect(info?.offerCount).toBe(2);
          });

          it('should return info for cancelNftOffer tab', () => {
               service.activeTab.set('cancelNftOffer');
               const info = service.infoData();
               expect(info?.offerCount).toBe(2);
          });

          it('should format XRP amount correctly', () => {
               service.activeTab.set('buyNft');
               const info = service.infoData();
               expect(info?.offersToShow[0].amount).toContain('XRP');
          });

          // it('should format IOU amount correctly', () => {
          //      service.activeTab.set('sellNft');
          //      const info = service.infoData();
          //      const iouOffer = info?.offersToShow.find(o => o.amount === '100 USD');
          //      expect(iouOffer).toBeDefined();
          // });

          it('should handle wallet without name', () => {
               const walletWithoutName = { ...mockWallet, name: null };
               mockWalletManagerService.getSelectedWallet.and.returnValue(walletWithoutName as any);

               const info = service.infoData();
               expect(info?.walletName).toContain('...');
          });
     });

     describe('offerItems', () => {
          it('should return sell offers with XRP display', () => {
               const items = service.offerItems();
               const xrpOffer = items.find(i => i.rawAmount === '2000000');
               expect(xrpOffer?.display).toContain('XRP');
               expect(xrpOffer?.isIOU).toBe(false);
          });

          it('should return sell offers with IOU display', () => {
               const items = service.offerItems();
               const iouOffer = items.find(i => i.isIOU === true);
               expect(iouOffer?.display).toContain('USD');
               expect(iouOffer?.isIOU).toBe(true);
          });

          it('should format NFTokenID for secondary display', () => {
               const items = service.offerItems();
               expect(items[0].secondary).toBeDefined();
          });

          it('should handle empty sell offers', () => {
               existingSellOffersSignal.set([]);
               const items = service.offerItems();
               expect(items.length).toBe(0);
          });
     });
});
