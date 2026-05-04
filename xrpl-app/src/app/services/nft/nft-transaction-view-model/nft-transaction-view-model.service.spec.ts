import { TestBed } from '@angular/core/testing';
import { NftTransactionViewModelService } from './nft-transaction-view-model.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { CreateNftStoreService } from '../nft-store/nft-store.service';
import { NftUtilService } from '../nft-util/nft-util.service';
import { LogServiceService } from '../../shared/log-service/log-service.service';
import { signal } from '@angular/core';

// Mock Buffer globally for the browser environment
class MockBuffer {
     static from(str: string, encoding: string) {
          return {
               toString: (enc: string) => {
                    if (enc === 'utf8' || enc === 'utf-8') return str;
                    if (enc === 'hex') {
                         // Convert string to hex
                         let hex = '';
                         for (let i = 0; i < str.length; i++) {
                              hex += str.charCodeAt(i).toString(16).padStart(2, '0');
                         }
                         return hex;
                    }
                    return str;
               },
          };
     }
}

// Apply Buffer mock
if (typeof (window as any).Buffer === 'undefined') {
     (window as any).Buffer = MockBuffer;
}

// Mock classes
class MockCheckUtilService {}
class MockCurrencyStoreService {}
class MockTransactionUiService {
     explorerUrl = jasmine.createSpy().and.returnValue('https://explorer.xrpl.org/');
     currentStep = signal('idle');
     stepMessage = jasmine.createSpy().and.returnValue('Processing...');
}
class MockTrustlineCurrencyService {}
class MockTrustlineStoreService {}
class MockCreateNftStoreService {
     existingNfts = jasmine.createSpy().and.returnValue([]);
     setField = jasmine.createSpy();
}
class MockNftUtilService {
     decodeNftFlagsForUi = jasmine.createSpy().and.returnValue([]);
}
class MockLogServiceService {
     logObjects = jasmine.createSpy();
}
class MockUtilsService {
     decodeHex = jasmine.createSpy().and.callFake((hex: string) => {
          if (!hex || hex === 'N/A') return null;
          // Simple hex decode without Buffer
          let str = '';
          for (let i = 0; i < hex.length; i += 2) {
               const byte = parseInt(hex.substr(i, 2), 16);
               if (byte === 0) break;
               str += String.fromCharCode(byte);
          }
          return str;
     });
}

describe('NftTransactionViewModelService', () => {
     let service: NftTransactionViewModelService;
     let walletManagerService: jasmine.SpyObj<WalletManagerService>;
     let nftCreateStoreService: MockCreateNftStoreService;
     let nftUtilService: MockNftUtilService;
     let txUiService: MockTransactionUiService;
     let utilsService: MockUtilsService;
     let mockWallet: any;

     beforeEach(() => {
          walletManagerService = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet']);
          nftCreateStoreService = new MockCreateNftStoreService();
          nftUtilService = new MockNftUtilService();
          txUiService = new MockTransactionUiService();
          utilsService = new MockUtilsService();

          mockWallet = {
               address: 'rTestAddress1234567890',
               name: 'Test Wallet',
               classicAddress: 'rTestAddress1234567890',
          };

          walletManagerService.getSelectedWallet.and.returnValue(mockWallet);
          nftCreateStoreService.existingNfts.and.returnValue([]);

          TestBed.configureTestingModule({
               providers: [
                    NftTransactionViewModelService,
                    { provide: CheckUtilService, useValue: new MockCheckUtilService() },
                    { provide: UtilsService, useValue: utilsService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: TrustlineCurrencyService, useValue: new MockTrustlineCurrencyService() },
                    { provide: CurrencyStoreService, useValue: new MockCurrencyStoreService() },
                    { provide: TrustlineStoreService, useValue: new MockTrustlineStoreService() },
                    { provide: CreateNftStoreService, useValue: nftCreateStoreService },
                    { provide: NftUtilService, useValue: nftUtilService },
                    { provide: LogServiceService, useValue: new MockLogServiceService() },
               ],
          });

          service = TestBed.inject(NftTransactionViewModelService);
     });

     describe('activeTab', () => {
          it('should default to createNft', () => {
               expect(service.activeTab()).toBe('createNft');
          });
     });

     describe('infoData', () => {
          it('should return null when no wallet selected', () => {
               walletManagerService.getSelectedWallet.and.returnValue(null);
               expect(service.infoData()).toBeNull();
          });

          it('should return info with no NFTs', () => {
               nftCreateStoreService.existingNfts.and.returnValue([]);

               const info = service.infoData();
               expect(info).not.toBeNull();
               expect(info?.walletName).toBe('Test Wallet');
               expect(info?.activeTab).toBe('createNft');
               expect(info?.nftCount).toBe(0);
               expect(info?.nftsToShow).toEqual([]);
               expect(info?.links).toBe('');
          });

          it('should return info with NFTs', () => {
               const mockNfts = [
                    {
                         NFTokenID: 'nft123',
                         URI: '68747470733a2f2f6578616d706c652e636f6d',
                         Taxon: 1,
                         Sequence: 100,
                         TransferFee: 0,
                         Flags: 0,
                    },
                    {
                         NFTokenID: 'nft456',
                         URI: '',
                         Taxon: 2,
                         Sequence: 200,
                         TransferFee: 500,
                         Flags: 1,
                    },
               ];
               nftCreateStoreService.existingNfts.and.returnValue(mockNfts);
               nftUtilService.decodeNftFlagsForUi.and.callFake((flags: number) => {
                    if (flags === 0) return [];
                    return ['tfTransferable'];
               });

               const info = service.infoData();
               expect(info?.nftCount).toBe(2);
               expect(info?.nftsToShow.length).toBe(2);
               expect(info?.links).toContain('View NFTs');
               expect(info?.walletName).toBe('Test Wallet');
          });

          it('should handle wallet with no name', () => {
               walletManagerService.getSelectedWallet.and.returnValue({
                    address: 'rShortAddress',
                    classicAddress: '',
                    seed: '',
               });

               const info = service.infoData();
               expect(info?.walletName).toBe('rShortAddr...');
          });
     });

     describe('getExistingNfts', () => {
          it('should handle array of NFT objects directly', () => {
               const nftObjects = [
                    {
                         NFTokenID: 'nft1',
                         Issuer: 'rIssuer',
                         NFTokenTaxon: 1,
                         TransferFee: 0,
                         Sequence: 100,
                         Flags: 0,
                    },
                    {
                         NFTokenID: 'nft2',
                         Issuer: 'rIssuer',
                         NFTaxon: 2,
                         TransferFee: 500,
                         nft_serial: 200,
                         Flags: 1,
                    },
               ];

               const result = service.getExistingNfts(nftObjects, 'rAddress');

               expect(nftCreateStoreService.setField).toHaveBeenCalled();
               expect(result.length).toBe(2);
          });

          it('should handle response with NFTokens array', () => {
               const nftResponse = {
                    NFTokens: [{ NFToken: { NFTokenID: 'nft1', Issuer: 'rIssuer', NFTokenTaxon: 1 } }, { NFToken: { NFTokenID: 'nft2', Issuer: 'rIssuer', NFTaxon: 2 } }],
               };

               const result = service.getExistingNfts([nftResponse], 'rAddress');

               expect(nftCreateStoreService.setField).toHaveBeenCalled();
               expect(result.length).toBe(2);
          });

          it('should handle empty array', () => {
               const result = service.getExistingNfts([], 'rAddress');

               expect(result).toEqual([]);
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('existingNfts', []);
          });

          it('should handle null/undefined input', () => {
               const result = service.getExistingNfts(null, 'rAddress');

               expect(result).toEqual([]);
          });

          it('should handle response with account_nfts property', () => {
               const nftResponse = {
                    result: {
                         account_nfts: [
                              { NFTokenID: 'nft1', Issuer: 'rIssuer', NFTokenTaxon: 1 },
                              { NFTokenID: 'nft2', Issuer: 'rIssuer', NFTaxon: 2 },
                         ],
                    },
               };

               const result = service.getExistingNfts(nftResponse, 'rAddress');

               expect(result.length).toBe(2);
          });

          it('should normalize NFT with missing fields', () => {
               const nftObject = {
                    NFTokenID: 'nft1',
               };

               const result = service.getExistingNfts([nftObject], 'rAddress');

               expect(result.length).toBe(1);
               expect(result[0].NFTokenID).toBe('nft1');
               expect(result[0].Flags).toBe(0);
               expect(result[0].Issuer).toBe('N/A');
               expect(result[0].Taxon).toBe('N/A');
               expect(result[0].TransferFee).toBe('N/A');
               expect(result[0].Sequence).toBe('N/A');
          });

          it('should decode URI hex to string', () => {
               const uriHex = '68747470733a2f2f6578616d706c652e636f6d';
               const nftObject = {
                    NFTokenID: 'nft1',
                    URI: uriHex,
               };

               const result = service.getExistingNfts([nftObject], 'rAddress');

               expect(utilsService.decodeHex).toHaveBeenCalledWith(uriHex);
          });
     });
});
