import { TestBed } from '@angular/core/testing';
import { TxEnvironmentService } from './tx-environment.service';
import { WalletManagerService, Wallet } from '../wallets/manager/wallet-manager.service';
import { XrplCacheService } from '../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../xrpl-services/xrpl.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { ToastService } from '../utils/toast/toast.service';
import { CreateNftStoreService } from '../nft/nft-store/nft-store.service';
import { AmmUtilsService } from '../amm/amm-utils/amm-utils.service';

describe('TxEnvironmentService', () => {
     let service: TxEnvironmentService;

     let walletManagerMock: jasmine.SpyObj<WalletManagerService>;
     let cacheMock: jasmine.SpyObj<XrplCacheService>;
     let xrplServiceMock: jasmine.SpyObj<XrplService>;
     let utilsMock: jasmine.SpyObj<UtilsService>;
     let toastMock: jasmine.SpyObj<ToastService>;
     let nftMock: jasmine.SpyObj<InstanceType<typeof CreateNftStoreService>>;
     let ammMock: jasmine.SpyObj<AmmUtilsService>;

     const mockWallet: Wallet = {
          address: 'rTEST',
          classicAddress: 'rTEST',
          seed: 'seed',
          encryptionAlgorithm: 'ed25519',
     };

     beforeEach(() => {
          walletManagerMock = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet']);
          cacheMock = jasmine.createSpyObj('XrplCacheService', ['getClient', 'getFee', 'getLedgerIndex', 'getLedgerInfo', 'getAccountInfo', 'getAccountObjects', 'getAccountLines', 'getAccountObjectsWithType', 'getServerInfo', 'getBlockingObjects', 'getGatewayBalance']);
          xrplServiceMock = jasmine.createSpyObj('XrplService', ['getClient', 'getNFTSellOffers', 'getNFTBuyOffers', 'getAMMInfo', 'getEscrowBySequence']);
          utilsMock = jasmine.createSpyObj('UtilsService', ['getWalletWithEncryptionAlgorithm']);
          toastMock = jasmine.createSpyObj('ToastService', ['error']);
          nftMock = jasmine.createSpyObj('CreateNftStoreService', [], {
               nftId: () => 'NFT123',
          });
          ammMock = jasmine.createSpyObj('AmmUtilsService', ['checkAmmParticipation']);

          walletManagerMock.getSelectedWallet.and.returnValue(mockWallet);

          cacheMock.getClient.and.resolveTo({} as any);
          cacheMock.getAccountInfo.and.resolveTo({ account: 'info' } as any);
          cacheMock.getAccountObjects.and.resolveTo({ objects: [] } as any);
          cacheMock.getAccountLines.and.resolveTo({ lines: [] } as any);
          cacheMock.getFee.and.resolveTo('10');
          cacheMock.getLedgerIndex.and.resolveTo(123);
          cacheMock.getLedgerInfo.and.resolveTo({} as any);
          cacheMock.getAccountObjectsWithType.and.resolveTo({ objects: [] } as any);
          cacheMock.getServerInfo.and.resolveTo({} as any);
          cacheMock.getBlockingObjects.and.resolveTo([]);
          cacheMock.getGatewayBalance.and.resolveTo({} as any);

          xrplServiceMock.getClient.and.resolveTo({} as any);
          xrplServiceMock.getNFTSellOffers.and.resolveTo([]);
          xrplServiceMock.getNFTBuyOffers.and.resolveTo([]);
          xrplServiceMock.getAMMInfo.and.resolveTo({ amm: true } as any);
          xrplServiceMock.getEscrowBySequence.and.resolveTo({} as any);

          utilsMock.getWalletWithEncryptionAlgorithm.and.resolveTo({
               classicAddress: 'rTEST',
          } as any);

          TestBed.configureTestingModule({
               providers: [TxEnvironmentService, { provide: WalletManagerService, useValue: walletManagerMock }, { provide: XrplCacheService, useValue: cacheMock }, { provide: XrplService, useValue: xrplServiceMock }, { provide: UtilsService, useValue: utilsMock }, { provide: ToastService, useValue: toastMock }, { provide: CreateNftStoreService, useValue: nftMock }, { provide: AmmUtilsService, useValue: ammMock }],
          });

          service = TestBed.inject(TxEnvironmentService);
     });

     it('should create environment with minimal options', async () => {
          const env = await service.prepareTxEnvironment();

          expect(env.client).toBeDefined();
          expect(env.wallet.classicAddress).toBe('rTEST');
     });

     it('should include account info when requested', async () => {
          const env = await service.prepareTxEnvironment({
               includeAccountInfo: true,
          });

          expect(env.accountInfo).toBeDefined();
          expect(cacheMock.getAccountInfo).toHaveBeenCalled();
     });

     it('should include account objects when requested', async () => {
          const env = await service.prepareTxEnvironment({
               includeAccountObject: true,
          });

          expect(env.accountObjects).toBeDefined();
     });

     it('should include trustlines when requested', async () => {
          await service.prepareTxEnvironment({
               includeTrustlines: true,
          });

          expect(cacheMock.getAccountLines).toHaveBeenCalled();
     });

     it('should include NFT data when requested', async () => {
          await service.prepareTxEnvironment({
               includeNftSellOffers: true,
               includeNftBuyOffers: true,
          });

          expect(xrplServiceMock.getNFTSellOffers).toHaveBeenCalled();
          expect(xrplServiceMock.getNFTBuyOffers).toHaveBeenCalled();
     });

     it('should include AMM participation when enabled', async () => {
          await service.prepareTxEnvironment({
               includeAmmResponse: true,
               includeParticipation: true,
          });

          expect(xrplServiceMock.getAMMInfo).toHaveBeenCalled();
     });

     it('should include destination data when provided', async () => {
          await service.prepareTxEnvironment({
               includeDestinationAccountInfo: true,
               includeDestinationAccountObject: true,
               destinationAddress: 'rDEST',
          });

          expect(cacheMock.getAccountInfo).toHaveBeenCalledWith('rDEST', jasmine.any(Boolean));
          expect(cacheMock.getAccountObjects).toHaveBeenCalledWith(jasmine.anything(), 'rDEST', jasmine.any(Boolean));
     });

     it('should resolve tasks in parallel safely', async () => {
          const env = await service.prepareTxEnvironment({
               includeFee: true,
               includeLedgerIndex: true,
               includeLedgerInfo: true,
          });

          expect(env.fee).toBe('10');
          expect(env.currentLedger).toBe(123);
     });

     it('should throw if wallet has no seed or mnemonic', () => {
          walletManagerMock.getSelectedWallet.and.returnValue({
               address: 'rX',
               classicAddress: 'rX',
          } as any);

          expect(() => service['getSelectedWallet']()).toThrowError('Selected wallet has no valid signing material.');
     });

     it('should cache environment result when not forced', async () => {
          const first = await service.refreshEnvironment({}, true);
          const second = await service.refreshEnvironment({}, false);

          expect(first.wallet.classicAddress).toBe(second.wallet.classicAddress);
     });

     it('should force refresh when requested', async () => {
          const env = await service.refreshEnvironment({}, true);
          expect(env).toBeDefined();
     });
});
