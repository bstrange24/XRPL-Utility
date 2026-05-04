import { TestBed } from '@angular/core/testing';
import { NftTransactionBuilderService } from './nft-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { NftUtilService } from '../nft-util/nft-util.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AppConstants } from '../../../core/app.constants';
import * as xrpl from 'xrpl';

// Mock Buffer for tests
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

describe('NftTransactionBuilderService', () => {
     let service: NftTransactionBuilderService;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockXrplTransactionService: jasmine.SpyObj<XrplTransactionService>;
     let mockTrustlineUtilService: jasmine.SpyObj<TrustlineUtilService>;
     let mockNftUtilService: jasmine.SpyObj<NftUtilService>;

     const mockWallet: xrpl.Wallet = {
          classicAddress: 'rTestAddress1234567890',
          seed: 'test-seed',
          publicKey: 'test-public-key',
          privateKey: 'test-private-key',
     } as any;

     const mockEnv: PrepareTxEnvironmentResult = {
          fee: '12',
          ledgerInfo: {
               lastIndex: 1000,
               currentRippleTime: 700000000,
          },
     } as any;

     beforeEach(() => {
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['setTransferFee', 'toRippleTime', 'setExpiration']);
          mockXrplTransactionService = jasmine.createSpyObj('XrplTransactionService', ['buildSendMaxAmount']);
          mockTrustlineUtilService = jasmine.createSpyObj('TrustlineUtilService', ['someMethod']);
          mockNftUtilService = jasmine.createSpyObj('NftUtilService', ['decodeNftFlags']);

          mockUtilsService.toRippleTime.and.returnValue(700000100);
          mockUtilsService.setTransferFee.and.callThrough();
          mockUtilsService.setExpiration.and.callThrough();
          mockNftUtilService.decodeNftFlags.and.returnValue([]);
          mockXrplTransactionService.buildSendMaxAmount.and.returnValue({
               sendMax: '1000000',
               paymentType: '',
               currency: undefined,
          });

          TestBed.configureTestingModule({
               providers: [NftTransactionBuilderService, { provide: UtilsService, useValue: mockUtilsService }, { provide: XrplTransactionService, useValue: mockXrplTransactionService }, { provide: TrustlineUtilService, useValue: mockTrustlineUtilService }, { provide: NftUtilService, useValue: mockNftUtilService }],
          });

          service = TestBed.inject(NftTransactionBuilderService);
     });

     describe('buildCreateNftTx', () => {
          it('should build a basic NFTokenMint transaction', () => {
               const nft = {
                    taxon: '12345',
               };
               const currency = {};

               const tx = service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               expect(tx.TransactionType).toBe('NFTokenMint');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.NFTokenTaxon).toBe(12345);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should include Amount for XRP when tfOnlyXRP flag is set', () => {
               const nft = {
                    taxon: '12345',
                    amount: '100',
                    nftFlags: 1,
               };
               const currency = {};
               mockNftUtilService.decodeNftFlags.and.returnValue(['tfOnlyXRP']);

               const tx = service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               // Just verify Amount exists and is a string (the actual xrpl.xrpToDrops will run)
               expect(tx.Amount).toBeDefined();
               expect(typeof tx.Amount).toBe('string');
          });

          it('should include Amount for non-XRP currency', () => {
               const nft = {
                    taxon: '12345',
                    amount: '100',
                    nftFlags: 0,
               };
               const currency = {
                    currencyCode: 'USD',
               };
               mockNftUtilService.decodeNftFlags.and.returnValue([]);

               const tx = service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               expect(tx.Amount).toBe('1000000');
               expect(mockXrplTransactionService.buildSendMaxAmount).toHaveBeenCalledWith('USD', mockWallet.classicAddress, '100', false);
          });

          it('should include Flags when nftFlags is provided', () => {
               const nft = {
                    taxon: '12345',
                    nftFlags: 8,
               };
               const currency = {};

               const tx = service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               expect(tx.Flags).toBe(8);
          });

          it('should include URI when initialURI is provided', () => {
               const nft = {
                    taxon: '12345',
                    initialURI: 'https://example.com/nft.json',
               };
               const currency = {};

               const tx = service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               // Just verify URI exists (the actual xrpl.convertStringToHex will run)
               expect(tx.URI).toBeDefined();
          });

          it('should include Destination when provided', () => {
               const nft = {
                    taxon: '12345',
                    destination: 'rDestination123',
               };
               const currency = {};

               const tx = service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               expect(tx.Destination).toBe('rDestination123');
          });

          it('should include Issuer when nfTokenMinterAddress is provided', () => {
               const nft = {
                    taxon: '12345',
                    nfTokenMinterAddress: 'rMinter123',
               };
               const currency = {};

               const tx = service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               expect(tx.Issuer).toBe('rMinter123');
          });

          it('should include expiration when provided and valid', () => {
               const nft = {
                    taxon: '12345',
                    expiration: '2024-12-31',
               };
               const currency = {};
               mockUtilsService.toRippleTime.and.returnValue(700000100);

               service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               expect(mockUtilsService.toRippleTime).toHaveBeenCalledWith('2024-12-31');
               expect(mockUtilsService.setExpiration).toHaveBeenCalled();
          });

          it('should throw error when expiration is in the past', () => {
               const nft = {
                    taxon: '12345',
                    expiration: '2020-01-01',
               };
               const currency = {};
               mockUtilsService.toRippleTime.and.returnValue(600000000);

               expect(() => service.buildCreateNftTx(mockWallet, mockEnv, nft, currency)).toThrowError('NFT expiration time must be in the future');
          });

          it('should set transfer fee when provided', () => {
               const nft = {
                    taxon: '12345',
                    transferFee: 500,
               };
               const currency = {};

               service.buildCreateNftTx(mockWallet, mockEnv, nft, currency);

               expect(mockUtilsService.setTransferFee).toHaveBeenCalled();
          });
     });

     describe('buildBurnNftTx', () => {
          it('should build a valid NFTokenBurn transaction', () => {
               const nft = {
                    nftId: 'nft1234567890',
               };

               const tx = service.buildBurnNftTx(mockWallet, mockEnv, nft);

               expect(tx.TransactionType).toBe('NFTokenBurn');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.NFTokenID).toBe('nft1234567890');
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });

     describe('buildUpdateNftMetaDataTx', () => {
          it('should build a valid NFTokenModify transaction', () => {
               const nft = {
                    nftId: 'nft1234567890',
               };

               const tx = service.buildUpdateNftMetaDataTx(mockWallet, mockEnv, nft);

               expect(tx.TransactionType).toBe('NFTokenModify');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.NFTokenID).toBe('nft1234567890');
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should include Owner when nftOwnerAddress is provided', () => {
               const nft = {
                    nftId: 'nft1234567890',
                    nftOwnerAddress: 'rOwner123',
               };

               const tx = service.buildUpdateNftMetaDataTx(mockWallet, mockEnv, nft);

               expect(tx.Owner).toBe('rOwner123');
          });

          it('should include URI when initialURI is provided', () => {
               const nft = {
                    nftId: 'nft1234567890',
                    initialURI: 'https://example.com/updated.json',
               };

               const tx = service.buildUpdateNftMetaDataTx(mockWallet, mockEnv, nft);

               // Just verify URI exists (the actual xrpl.convertStringToHex will run)
               expect(tx.URI).toBeDefined();
          });
     });

     describe('buildBuyNftDataTx', () => {
          it('should build a valid NFTokenAcceptOffer transaction for buying NFT', () => {
               const nft = {
                    nftOfferId: 'offer123',
               };

               const tx = service.buildBuyNftDataTx(mockWallet, mockEnv, nft);

               expect(tx.TransactionType).toBe('NFTokenAcceptOffer');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.NFTokenSellOffer).toBe('offer123');
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });

     describe('buildSellNftDataTx', () => {
          it('should build a valid NFTokenCreateOffer transaction for selling NFT', () => {
               const nft = {
                    nftId: 'nft123',
                    amount: '1000',
               };
               const currency = { currency: 'XRP' };

               const tx = service.buildSellNftDataTx(mockWallet, mockEnv, nft, currency);

               expect(tx.TransactionType).toBe('NFTokenCreateOffer');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.NFTokenID).toBe('nft123');
               expect(tx.Flags).toBe(1);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });

          it('should include expiration when provided and valid', () => {
               const nft = {
                    nftId: 'nft123',
                    amount: '1000',
                    expiration: '2024-12-31',
               };
               const currency = { currency: 'XRP' };
               mockUtilsService.toRippleTime.and.returnValue(700000100);

               service.buildSellNftDataTx(mockWallet, mockEnv, nft, currency);

               expect(mockUtilsService.setExpiration).toHaveBeenCalled();
          });

          it('should throw error when expiration is in the past', () => {
               const nft = {
                    nftId: 'nft123',
                    amount: '1000',
                    expiration: '2020-01-01',
               };
               const currency = { currency: 'XRP' };
               mockUtilsService.toRippleTime.and.returnValue(600000000);

               expect(() => service.buildSellNftDataTx(mockWallet, mockEnv, nft, currency)).toThrowError('NFT expiration time must be in the future');
          });
     });

     describe('buildBuyNftOfferDataTx', () => {
          it('should build a valid NFTokenAcceptOffer transaction for buying NFT offer', () => {
               const nft = {
                    nftOfferId: 'offer456',
               };
               const currency = {};

               const tx = service.buildBuyNftOfferDataTx(mockWallet, mockEnv, nft, currency);

               expect(tx.TransactionType).toBe('NFTokenAcceptOffer');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.NFTokenSellOffer).toBe('offer456');
               expect(tx.Flags).toBe(0);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });

     describe('buildSellNftOfferDataTx', () => {
          it('should build a valid NFTokenAcceptOffer transaction for selling NFT offer', () => {
               const nft = {
                    nftOfferId: 'offer789',
               };
               const currency = {};

               const tx = service.buildSellNftOfferDataTx(mockWallet, mockEnv, nft, currency);

               expect(tx.TransactionType).toBe('NFTokenAcceptOffer');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.NFTokenSellOffer).toBe('offer789');
               expect(tx.Flags).toBe(1);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });

     describe('buildCancelNftOfferDataTx', () => {
          it('should build a valid NFTokenCancelOffer transaction', () => {
               const nft = {
                    nftOfferId: 'offer999',
               };

               const tx = service.buildCancelNftOfferDataTx(mockWallet, mockEnv, nft);

               expect(tx.TransactionType).toBe('NFTokenCancelOffer');
               expect(tx.Account).toBe(mockWallet.classicAddress);
               expect(tx.NFTokenOffers).toEqual(['offer999']);
               expect(tx.Fee).toBe('12');
               expect(tx.LastLedgerSequence).toBe(1000 + AppConstants.LAST_LEDGER_ADD_TIME);
          });
     });
});
