import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NftUtilService } from './nft-util.service';
import { CreateNftStoreService } from '../nft-store/nft-store.service';
import { TransactionUiService, TxStep } from '../../transaction-ui/transaction-ui.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { LogServiceService } from '../../shared/log-service/log-service.service';
import * as xrpl from 'xrpl';

describe('NftUtilService', () => {
  let service: NftUtilService;

  let nftStore: jasmine.SpyObj<InstanceType<typeof CreateNftStoreService>>;
  let txUiService: jasmine.SpyObj<InstanceType<typeof TransactionUiService>>;
  let xrplService: jasmine.SpyObj<InstanceType<typeof XrplService>>;
  let utilsService: jasmine.SpyObj<InstanceType<typeof UtilsService>>;
  let logService: jasmine.SpyObj<InstanceType<typeof LogServiceService>>;

  beforeEach(() => {
    nftStore = jasmine.createSpyObj('CreateNftStoreService', ['nftId', 'existingNfts', 'setField']);
    txUiService = jasmine.createSpyObj('TransactionUiService', ['currentStep', 'stepMessage']);
    xrplService = jasmine.createSpyObj('XrplService', [
      'getLedgerInfo', 'getAccountInfo', 'getAccountObjects', 'getAccountNFTs',
      'getAccountNFTOffers', 'getNFTSellOffers', 'getNFTBuyOffers'
    ]);
    utilsService = jasmine.createSpyObj('UtilsService', ['decodeHex']);
    logService = jasmine.createSpyObj('LogServiceService', ['logObjects']);

    nftStore.nftId.and.returnValue('');
    nftStore.existingNfts.and.returnValue([]);
    txUiService.currentStep.and.returnValue('idle' as TxStep);
    txUiService.stepMessage.and.returnValue('');

    xrplService.getLedgerInfo.and.resolveTo({ currentRippleTime: 123456 } as any);
    xrplService.getAccountInfo.and.resolveTo({} as any);
    xrplService.getAccountObjects.and.resolveTo({ result: { account_objects: [] } } as any);
    xrplService.getAccountNFTs.and.resolveTo({ result: { account_nfts: [] } } as any);
    xrplService.getAccountNFTOffers.and.resolveTo({ result: { account_objects: [] } } as any);
    xrplService.getNFTSellOffers.and.resolveTo({ result: { offers: [] } } as any);
    xrplService.getNFTBuyOffers.and.resolveTo({ result: { offers: [] } } as any);

    TestBed.configureTestingModule({
      providers: [
        NftUtilService,
        { provide: CreateNftStoreService, useValue: nftStore },
        { provide: TransactionUiService, useValue: txUiService },
        { provide: XrplService, useValue: xrplService },
        { provide: UtilsService, useValue: utilsService },
        { provide: LogServiceService, useValue: logService },
      ]
    });

    service = TestBed.inject(NftUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Button Labels', () => {
    it('should return default labels for idle/waiting_validation', () => {
      expect(service.createNftButtonLabel()).toBe('Create NFT');
      expect(service.burnNftButtonLabel()).toBe('Burn NFT');
      expect(service.updateNftMetadataButtonLabel()).toBe('Update NFT Metadata');
      expect(service.createNftBuyButtonLabel()).toBe('Buy NFT');
      expect(service.createNftSellButtonLabel()).toBe('Sell NFT');
      expect(service.createNftBuyOfferButtonLabel()).toBe('Buy NFT Offer');
      expect(service.createNftSellOfferButtonLabel()).toBe('Sell NFT Offer');
      expect(service.createNftCancelOfferButtonLabel()).toBe('Cancel NFT Offer');
    });

    it('should return stepMessage for other steps', () => {
      txUiService.currentStep.and.returnValue('signing' as TxStep);
      txUiService.stepMessage.and.returnValue('Signing transaction...');

      expect(service.createNftButtonLabel()).toBe('Signing transaction...');
      expect(service.burnNftButtonLabel()).toBe('Signing transaction...');
      expect(service.updateNftMetadataButtonLabel()).toBe('Signing transaction...');
      expect(service.createNftBuyButtonLabel()).toBe('Signing transaction...');
      expect(service.createNftSellButtonLabel()).toBe('Signing transaction...');
      expect(service.createNftBuyOfferButtonLabel()).toBe('Signing transaction...');
      expect(service.createNftSellOfferButtonLabel()).toBe('Signing transaction...');
      expect(service.createNftCancelOfferButtonLabel()).toBe('Signing transaction...');
    });
  });

  describe('NFT Flags', () => {
    it('should decode flags', () => {
      expect(service.decodeNftFlags(0)).toEqual([]);
      expect(service.decodeNftFlags(0x0001 | 0x0008)).toEqual(jasmine.arrayContaining(['tfBurnable', 'tfTransferable']));
    });

    it('should get flags value', () => {
      service.nftFlags.set({ burnableNft: true, transferableNft: true, onlyXrpNft: false, trustLine: false, mutableNft: false });
      expect(service.getFlagsValue()).toBeGreaterThan(0);
    });

    it('should toggle flag', () => {
      service.toggleFlag('burnableNft');
      expect(service.nftFlags().burnableNft).toBeTrue();
    });

    it('should reset flags', () => {
      service.resetFlags();
      expect(service.nftFlags().burnableNft).toBeFalse();
    });

    it('should decode flags for UI', () => {
      expect(service.decodeNftFlagsForUi(0)).toBe('None');
      expect(service.decodeNftFlagsForUi(0x0001 | 0x0010)).toContain('burnableNft');
    });
  });

  describe('Burn & Text Field', () => {
    it('should handle onBurnToggle add/remove', () => {
      nftStore.nftId.and.returnValue('NFT1, NFT2');
      service.onBurnToggle(true, 'NFT3');
      expect(nftStore.setField).toHaveBeenCalledWith('nftId', 'NFT1, NFT2, NFT3');

      service.onBurnToggle(false, 'NFT1');
      expect(nftStore.setField).toHaveBeenCalled();
    });

    it('should update NFT text field', () => {
      nftStore.nftId.and.returnValue('NFT1');
      service.updateNftTextField('NFT2', true);
      expect(nftStore.setField).toHaveBeenCalledWith('nftId', 'NFT1, NFT2');
    });
  });

  describe('NFT Selection', () => {
    it('should compute selectedNftItem and nftItems', () => {
      nftStore.nftId.and.returnValue('NFT123');
      nftStore.existingNfts.and.returnValue([{ NFTokenID: 'NFT123', URI: 'ipfs://test' } as any]);

      expect(service.selectedNftItem()).toBeTruthy();
      expect(service.nftItems().length).toBe(1);
    });
  });

  describe('getNftOfferDetails', () => {
    it('should fetch single NFT data', fakeAsync(() => {
      nftStore.nftId.and.returnValue('NFT123');
      service.getNftOfferDetails({} as any, { classicAddress: 'rTest' } as any)
        .then(result => expect(result).toBeDefined());
      tick();
    }));
  });

  describe('Helper Methods', () => {
    // it('should get existing NFTs', () => {
    //   const mockObjects = {
    //     result: {
    //       account_objects: [{
    //         LedgerEntryType: 'NFTokenPage',
    //         index: 'p1',
    //         NFTokens: [{ NFToken: { NFTokenID: 'A'.repeat(64), URI: '1234ABCD' } }]
    //       }]
    //     }
    //   };
    //   utilsService.decodeHex.and.returnValue('decodedURI');

    //   const nfts = service.getExistingNfts(mockObjects, 'rTest');
    //   expect(nfts.length).toBe(1);
    //   expect(nfts[0].URI).toBe('decodedURI');
    // });

    it('should parse and validate NFToken IDs', () => {
      const ids = service.parseAndValidateNFTokenIDs('A'.repeat(64) + ',invalid');
      expect(ids.length).toBe(1);
    });
  });
});