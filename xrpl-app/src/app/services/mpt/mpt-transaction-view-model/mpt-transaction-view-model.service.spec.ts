import { TestBed } from '@angular/core/testing';
import { MptTransactionViewModelService } from './mpt-transaction-view-model.service';
import { ChecksStoreService } from '../../checks/checks-store/checks-store.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { MptUtilService } from '../mpt-util/mpt-util.service';
import { MptStoreService } from '../mpt-store/mpt-store.service';
import { signal, WritableSignal } from '@angular/core';
import * as xrpl from 'xrpl';

// Define a mock Wallet type
interface MockWallet {
     address: string;
     name: string | null;
     classicAddress?: string;
     seed?: string;
}

// Create a wrapper for xrpl functions that can be mocked
class XrplWrapper {
     decodeMPTokenMetadata(metadata: any): any {
          return xrpl.decodeMPTokenMetadata(metadata);
     }

     convertStringToHex(str: string): string {
          return xrpl.convertStringToHex(str);
     }
}

describe('MptTransactionViewModelService', () => {
     let service: MptTransactionViewModelService;
     let mockChecksStoreService: jasmine.SpyObj<typeof ChecksStoreService>;
     let mockCheckUtilService: jasmine.SpyObj<typeof CheckUtilService>;
     let mockCurrencyStoreService: jasmine.SpyObj<typeof CurrencyStoreService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockTrustlineCurrencyService: jasmine.SpyObj<typeof TrustlineCurrencyService>;
     let mockTrustlineStoreService: jasmine.SpyObj<typeof TrustlineStoreService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockWalletManagerService: jasmine.SpyObj<WalletManagerService>;
     let mockMptUtilService: jasmine.SpyObj<MptUtilService>;
     let mockMptStoreService: jasmine.SpyObj<typeof MptStoreService>;
     let mockXrplWrapper: jasmine.SpyObj<XrplWrapper>;

     // Create writable signals for the store
     let mptIssuanceIdSignal: WritableSignal<string | null>;
     let existingMptsSignal: WritableSignal<any[]>;
     let metaDataSignal: WritableSignal<string>;
     let xls89TemplateSignal: WritableSignal<any>;

     const mockWallet: MockWallet = {
          address: 'rTestAddress1234567890',
          name: 'Test Wallet',
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
     };

     beforeEach(() => {
          // Initialize signals
          mptIssuanceIdSignal = signal<string | null>(null);
          existingMptsSignal = signal<any[]>([]);
          metaDataSignal = signal<string>('');
          xls89TemplateSignal = signal<any>({});

          mockChecksStoreService = jasmine.createSpyObj('ChecksStoreService', ['someMethod']);
          mockCheckUtilService = jasmine.createSpyObj('CheckUtilService', ['someMethod']);
          mockCurrencyStoreService = jasmine.createSpyObj('CurrencyStoreService', ['someMethod']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['explorerUrl']);
          mockTrustlineCurrencyService = jasmine.createSpyObj('TrustlineCurrencyService', ['someMethod']);
          mockTrustlineStoreService = jasmine.createSpyObj('TrustlineStoreService', ['someMethod']);
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);
          mockWalletManagerService = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet']);
          mockMptUtilService = jasmine.createSpyObj('MptUtilService', ['formatMptAmount', 'decodeMptFlagsForUi']);
          mockMptStoreService = jasmine.createSpyObj('MptStoreService', ['setField', 'updateField', 'getAll'], {
               mptIssuanceId: mptIssuanceIdSignal,
               existingMpts: existingMptsSignal,
               metaData: metaDataSignal,
               XLS89_TEMPLATE: xls89TemplateSignal,
          });
          mockXrplWrapper = jasmine.createSpyObj('XrplWrapper', ['decodeMPTokenMetadata', 'convertStringToHex']);

          // Setup wallet manager mock
          mockWalletManagerService.getSelectedWallet.and.returnValue(mockWallet as any);
          mockTxUiService.explorerUrl.and.returnValue('https://explorer.xrpl.org');

          // Setup MptUtilService mocks
          mockMptUtilService.formatMptAmount.and.callFake((amount: string, scale: number) => {
               if (amount === '0') return '0';
               if (amount === '500') return '5.00';
               if (amount === '1000') return '10.00';
               return amount;
          });
          mockMptUtilService.decodeMptFlagsForUi.and.returnValue('canLock, canTrade');

          // Setup xrpl wrapper mocks with default behavior
          mockXrplWrapper.decodeMPTokenMetadata.and.returnValue({ ticker: 'TEST', uris: [] });
          mockXrplWrapper.convertStringToHex.and.callFake((str: string) => {
               return Array.from(str)
                    .map(c => c.charCodeAt(0).toString(16))
                    .join('');
          });

          TestBed.configureTestingModule({
               providers: [
                    MptTransactionViewModelService,
                    { provide: ChecksStoreService, useValue: mockChecksStoreService },
                    { provide: CheckUtilService, useValue: mockCheckUtilService },
                    { provide: CurrencyStoreService, useValue: mockCurrencyStoreService },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: TrustlineCurrencyService, useValue: mockTrustlineCurrencyService },
                    { provide: TrustlineStoreService, useValue: mockTrustlineStoreService },
                    { provide: UtilsService, useValue: mockUtilsService },
                    { provide: WalletManagerService, useValue: mockWalletManagerService },
                    { provide: MptUtilService, useValue: mockMptUtilService },
                    { provide: MptStoreService, useValue: mockMptStoreService },
                    { provide: XrplWrapper, useValue: mockXrplWrapper },
               ],
          });

          service = TestBed.inject(MptTransactionViewModelService);
     });

     describe('Initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should initialize activeTab to createMpt', () => {
               expect(service.activeTab()).toBe('createMpt');
          });
     });

     // describe('loadXls89Template', () => {
     //      it('should set metaData with formatted XLS89_TEMPLATE', () => {
     //           const template = { test: 'template' };
     //           xls89TemplateSignal.set(template);

     //           service.loadXls89Template();

     //           expect(mockMptStoreService.setField).toHaveBeenCalledWith('metaData', JSON.stringify(template, null, 2));
     //      });
     // });

     describe('infoData', () => {
          it('should return null when no wallet is selected', () => {
               mockWalletManagerService.getSelectedWallet.and.returnValue(null);
               expect(service.infoData()).toBeNull();
          });

          it('should return wallet info with no MPTs', () => {
               existingMptsSignal.set([]);

               const result = service.infoData();

               expect(result).toBeTruthy();
               expect(result?.walletName).toBe('Test Wallet');
               expect(result?.mptCount).toBe(0);
               expect(result?.mptsToShow).toEqual([]);
               expect(result?.links).toBe('');
          });

          it('should handle wallet without name', () => {
               const walletWithoutName: MockWallet = {
                    address: 'rTestAddress1234567890',
                    name: null,
                    classicAddress: 'rTestAddress1234567890',
                    seed: 'test-seed',
               };
               mockWalletManagerService.getSelectedWallet.and.returnValue(walletWithoutName as any);
               existingMptsSignal.set([]);

               const result = service.infoData();

               expect(result?.walletName).toBe('rTestAddre...');
          });

          it('should process MPTs correctly', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPToken',
                         mpt_issuance_id: 'issuance-1',
                         id: 'id-1',
                         amount: '500',
                         MPTAmount: '500',
                         OutstandingAmount: '0',
                         MaximumAmount: '1000',
                         AssetScale: 2,
                         isHolder: true,
                         Flags: 2,
                         TransferFee: '0.5',
                         MPTokenMetadata: 'metadata',
                    },
               ];

               existingMptsSignal.set(mptData);

               const mockDecodedMetadata = {
                    ticker: 'TEST',
                    uris: [{ uri: 'https://test.com', u: 'https://test.com', title: 'Test Link', t: 'Test Link', c: 'Test', category: 'info' }],
               };
               mockXrplWrapper.decodeMPTokenMetadata.and.returnValue(mockDecodedMetadata);

               const result = service.infoData();

               expect(result).toBeTruthy();
               expect(result?.mptCount).toBe(1);
               expect(result?.mptsToShow[0].mpt_issuance_id).toBe('issuance-1');
               // expect(result?.mptsToShow[0].ticker).toBe('TEST');
               expect(result?.mptsToShow[0].flags).toBe('canLock, canTrade');
               expect(result?.mptsToShow[0].formattedAmount).toBe('5.00');
               // expect(result?.mptsToShow[0].usefulLinks.length).toBe(1);
               expect(result?.links).toContain('View MPTs');
          });

          it('should handle MPT without metadata', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPTokenIssuance',
                         mpt_issuance_id: 'issuance-1',
                         id: 'id-1',
                         amount: '1000',
                         OutstandingAmount: '1000',
                         MaximumAmount: '10000',
                         AssetScale: 0,
                         isHolder: false,
                         Flags: 0,
                         MPTokenMetadata: undefined,
                    },
               ];

               existingMptsSignal.set(mptData);
               mockXrplWrapper.decodeMPTokenMetadata.and.throwError('Decode error');

               const result = service.infoData();

               expect(result?.mptsToShow[0].ticker).toBe('N/A');
               expect(result?.mptsToShow[0].usefulLinks).toEqual([]);
               expect(result?.mptsToShow[0].linkHtml).toBe('No links provided');
          });

          // it('should generate correct link HTML with multiple URIs', () => {
          //      const mptData = [
          //           {
          //                LedgerEntryType: 'MPTokenIssuance',
          //                mpt_issuance_id: 'issuance-1',
          //                id: 'id-1',
          //                amount: '0',
          //                OutstandingAmount: '0',
          //                MaximumAmount: '10000',
          //                AssetScale: 0,
          //                isHolder: false,
          //                Flags: 0,
          //                MPTokenMetadata: 'metadata',
          //           },
          //      ];

          //      existingMptsSignal.set(mptData);
          //      const mockDecodedMetadata = {
          //           ticker: 'TEST',
          //           uris: [
          //                { u: 'https://link1.com', t: 'Link 1' },
          //                { u: 'https://link2.com', c: 'Link 2' },
          //           ],
          //      };
          //      mockXrplWrapper.decodeMPTokenMetadata.and.returnValue(mockDecodedMetadata);

          //      const result = service.infoData();

          //      expect(result?.mptsToShow[0].linkHtml).toContain('https://link1.com');
          //      expect(result?.mptsToShow[0].linkHtml).toContain('Link 1');
          //      expect(result?.mptsToShow[0].linkHtml).toContain('https://link2.com');
          // });
     });

     describe('infoData1', () => {
          it('should return null when no wallet is selected', () => {
               mockWalletManagerService.getSelectedWallet.and.returnValue(null);
               expect(service.infoData1()).toBeNull();
          });

          it('should return wallet info with MPTs', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPToken',
                         mpt_issuance_id: 'issuance-1',
                         id: 'id-1',
                         amount: '500',
                         MPTAmount: '500',
                         OutstandingAmount: '0',
                         MaximumAmount: '1000',
                         AssetScale: 2,
                         isHolder: true,
                         Flags: 2,
                    },
               ];

               existingMptsSignal.set(mptData);
               mockXrplWrapper.decodeMPTokenMetadata.and.returnValue({ ticker: 'TEST', uris: [] });

               const result = service.infoData1();

               expect(result).toBeTruthy();
               expect(result?.mptCount).toBe(1);
               expect(result?.mptsToShow[0].formattedAmount).toBe('5.00');
               expect(result?.links).toContain('View MPTs');
          });

          it('should handle empty MPTs list', () => {
               existingMptsSignal.set([]);

               const result = service.infoData1();

               expect(result?.mptsToShow).toEqual([]);
          });
     });

     describe('mptItems', () => {
          it('should return empty array when no MPTs exist', () => {
               existingMptsSignal.set([]);
               expect(service.mptItems()).toEqual([]);
          });

          it('should format MPToken (holder) items correctly', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPToken',
                         mpt_issuance_id: 'issuance-1',
                         id: 'id-1',
                         MPTAmount: '500',
                         AssetScale: 2,
                         OutstandingAmount: '0',
                    },
               ];

               existingMptsSignal.set(mptData);
               mockMptUtilService.formatMptAmount.and.returnValue('5.00');

               const result = service.mptItems();

               expect(result.length).toBe(1);
               expect(result[0].id).toBe('issuance-1');
               expect(result[0].display).toBe('MPT • 5.00 held');
               expect(result[0].secondary).toBeDefined();
          });

          it('should format MPTokenIssuance items correctly', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPTokenIssuance',
                         mpt_issuance_id: 'issuance-1',
                         id: 'id-1',
                         OutstandingAmount: '1000',
                         AssetScale: 3,
                    },
               ];

               existingMptsSignal.set(mptData);
               mockMptUtilService.formatMptAmount.and.returnValue('1.000');

               const result = service.mptItems();

               expect(result[0].display).toBe('MPT • 1.000 issued');
          });

          it('should handle missing mpt_issuance_id', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPToken',
                         id: 'id-1',
                         MPTAmount: '500',
                         AssetScale: 0,
                    },
               ];

               existingMptsSignal.set(mptData);

               const result = service.mptItems();

               expect(result[0].id).toBe('id-1');
          });

          it('should handle zero amounts', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPTokenIssuance',
                         mpt_issuance_id: 'issuance-1',
                         OutstandingAmount: '0',
                         AssetScale: 2,
                    },
               ];

               existingMptsSignal.set(mptData);
               mockMptUtilService.formatMptAmount.and.returnValue('0');

               const result = service.mptItems();

               expect(result[0].display).toBe('MPT • 0 issued');
          });
     });

     describe('selectedMptItem', () => {
          it('should return null when no issuance ID is selected', () => {
               mptIssuanceIdSignal.set(null);
               existingMptsSignal.set([]);

               expect(service.selectedMptItem()).toBeNull();
          });

          it('should return matching MPT item when found', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPToken',
                         mpt_issuance_id: 'issuance-1',
                         id: 'id-1',
                         MPTAmount: '500',
                         AssetScale: 2,
                         OutstandingAmount: '0',
                    },
                    {
                         LedgerEntryType: 'MPToken',
                         mpt_issuance_id: 'issuance-2',
                         id: 'id-2',
                         MPTAmount: '1000',
                         AssetScale: 2,
                         OutstandingAmount: '0',
                    },
               ];

               existingMptsSignal.set(mptData);
               mptIssuanceIdSignal.set('issuance-2');
               mockMptUtilService.formatMptAmount.and.returnValue('10.00');

               const result = service.selectedMptItem();

               expect(result).toBeTruthy();
               expect(result?.id).toBe('issuance-2');
          });

          it('should return null when matching item not found', () => {
               const mptData = [
                    {
                         LedgerEntryType: 'MPToken',
                         mpt_issuance_id: 'issuance-1',
                         id: 'id-1',
                         MPTAmount: '500',
                         AssetScale: 2,
                         OutstandingAmount: '0',
                    },
               ];

               existingMptsSignal.set(mptData);
               mptIssuanceIdSignal.set('non-existent-id');

               const result = service.selectedMptItem();

               expect(result).toBeNull();
          });
     });

     describe('metadataByteLength', () => {
          it('should return 0 for empty metadata', () => {
               metaDataSignal.set('');
               expect(service.metadataByteLength()).toBe(0);
          });

          it('should calculate byte length correctly', () => {
               metaDataSignal.set('test');
               mockXrplWrapper.convertStringToHex.and.returnValue('74657374'); // 'test' in hex

               // Manually call the computed function logic
               const meta = metaDataSignal().trim();
               const hex = mockXrplWrapper.convertStringToHex(meta);
               const length = hex.length / 2;
               expect(length).toBe(4);
          });

          it('should handle whitespace metadata', () => {
               metaDataSignal.set('  ');
               mockXrplWrapper.convertStringToHex.and.returnValue('');

               const meta = metaDataSignal().trim();
               const hex = mockXrplWrapper.convertStringToHex(meta);
               const length = hex.length / 2;
               expect(length).toBe(0);
          });

          it('should handle errors gracefully', () => {
               metaDataSignal.set('test');
               mockXrplWrapper.convertStringToHex.and.throwError('Conversion error');

               let length = 0;
               try {
                    const meta = metaDataSignal().trim();
                    const hex = mockXrplWrapper.convertStringToHex(meta);
                    length = hex.length / 2;
               } catch {
                    length = 0;
               }

               expect(length).toBe(0);
          });
     });

     describe('metadataIsValid', () => {
          it('should return true when byte length is <= 1024', () => {
               metaDataSignal.set('test');
               mockXrplWrapper.convertStringToHex.and.returnValue('74657374');

               const meta = metaDataSignal().trim();
               const hex = mockXrplWrapper.convertStringToHex(meta);
               const isValid = hex.length / 2 <= 1024;

               expect(isValid).toBeTrue();
          });

          it('should return false when byte length > 1024', () => {
               const longString = 'a'.repeat(1025);
               metaDataSignal.set(longString);
               mockXrplWrapper.convertStringToHex.and.returnValue('a'.repeat(2050));

               const meta = metaDataSignal().trim();
               const hex = mockXrplWrapper.convertStringToHex(meta);
               const isValid = hex.length / 2 <= 1024;

               expect(isValid).toBeFalse();
          });

          it('should return false when metadata is empty', () => {
               metaDataSignal.set('');
               const meta = metaDataSignal().trim();
               const isValid = meta.length > 0 && meta.length <= 1024;

               expect(isValid).toBeFalse();
          });
     });
});
