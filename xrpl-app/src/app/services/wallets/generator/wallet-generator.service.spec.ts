import { TestBed } from '@angular/core/testing';
import { WalletGeneratorService } from './wallet-generator.service';
import { WalletManagerService } from '../manager/wallet-manager.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { HttpClient } from '@angular/common/http';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { of, throwError } from 'rxjs';

describe('WalletGeneratorService', () => {
     let service: WalletGeneratorService;

     let walletManagerMock: jasmine.SpyObj<WalletManagerService>;
     let storageMock: jasmine.SpyObj<StorageService>;
     let httpMock: jasmine.SpyObj<HttpClient>;
     let xrplCacheMock: jasmine.SpyObj<XrplCacheService>;
     let xrplServiceMock: jasmine.SpyObj<XrplService>;
     let utilsMock: jasmine.SpyObj<UtilsService>;

     beforeEach(() => {
          walletManagerMock = jasmine.createSpyObj('WalletManagerService', ['addWallet', 'wallets']);
          storageMock = jasmine.createSpyObj('StorageService', ['get']);
          httpMock = jasmine.createSpyObj('HttpClient', ['get', 'post']);
          xrplCacheMock = jasmine.createSpyObj('XrplCacheService', ['getClient']);
          xrplServiceMock = jasmine.createSpyObj('XrplService', ['getClient', 'getAccountInfo']);
          utilsMock = jasmine.createSpyObj('UtilsService', ['sleep']);

          walletManagerMock.wallets.and.returnValue([]);

          TestBed.configureTestingModule({
               providers: [WalletGeneratorService, { provide: WalletManagerService, useValue: walletManagerMock }, { provide: StorageService, useValue: storageMock }, { provide: HttpClient, useValue: httpMock }, { provide: XrplCacheService, useValue: xrplCacheMock }, { provide: XrplService, useValue: xrplServiceMock }, { provide: UtilsService, useValue: utilsMock }],
          });

          service = TestBed.inject(WalletGeneratorService);

          // default mocks
          utilsMock.sleep.and.resolveTo();
          xrplCacheMock.getClient.and.resolveTo({} as any);
          xrplServiceMock.getAccountInfo.and.resolveTo({} as any);
     });

     const mockWallet = {
          address: 'r123',
          classicAddress: 'r123',
          seed: 'seed',
          secret: {
               familySeed: 'seed',
               mnemonic: 'mnemonic',
               secretNumbers: '1,2,3',
          },
          keypair: {
               algorithm: 'ed25519',
          },
     };

     it('should generate wallet and persist it', async () => {
          httpMock.post.and.returnValue(of(mockWallet));

          const result = await service.generateWallet('familySeed', 'testnet', 'ed25519');

          expect(result.address).toBe('r123');
          expect(utilsMock.sleep).toHaveBeenCalledWith(6000);
          expect(xrplServiceMock.getAccountInfo).toHaveBeenCalled();
          expect(walletManagerMock.addWallet).toHaveBeenCalled();
     });

     it('should import wallet via familySeed', async () => {
          httpMock.get.and.returnValue(of(mockWallet));
          storageMock.get.and.returnValue(null);

          const result = await service.importWallet('familySeed', 'seed', 'ed25519');

          expect(result.address).toBe('r123');
          expect(walletManagerMock.addWallet).toHaveBeenCalled();
     });

     it('should import wallet via mnemonic', async () => {
          httpMock.get.and.returnValue(of(mockWallet));
          storageMock.get.and.returnValue(null);

          await service.importWallet('mnemonic', 'test words', 'ed25519');

          expect(httpMock.get).toHaveBeenCalled();
     });

     it('should import wallet via secretNumbers', async () => {
          httpMock.post.and.returnValue(of(mockWallet));
          storageMock.get.and.returnValue(null);

          await service.importWallet('secretNumbers', ['1', '2', '3'], 'ed25519');

          expect(httpMock.post).toHaveBeenCalled();
     });

     it('should throw if wallet already exists in walletManager', async () => {
          walletManagerMock.wallets.and.returnValue([{ address: 'r123' }] as any);
          httpMock.get.and.returnValue(of(mockWallet));
          storageMock.get.and.returnValue(null);

          await expectAsync(service.importWallet('familySeed', 'seed', 'ed25519')).toBeRejectedWithError('Wallet already exists in application.');
     });

     it('should throw if wallet exists in custom destinations', async () => {
          walletManagerMock.wallets.and.returnValue([]);
          storageMock.get.and.returnValue(JSON.stringify([{ address: 'r123' }]));
          httpMock.get.and.returnValue(of(mockWallet));

          await expectAsync(service.importWallet('familySeed', 'seed', 'ed25519')).toBeRejectedWithError('Wallet exists as custom destination. Remove it before importing.');
     });

     it('should handle http GET error', async () => {
          httpMock.get.and.returnValue(throwError(() => ({ error: { error: 'API failure' } })));
          storageMock.get.and.returnValue(null);

          await expectAsync(service.importWallet('familySeed', 'seed', 'ed25519')).toBeRejectedWithError('API failure');
     });

     it('should handle http POST error', async () => {
          httpMock.post.and.returnValue(throwError(() => ({ error: { error: 'POST failure' } })));

          await expectAsync(service.generateWallet('familySeed', 'testnet', 'ed25519')).toBeRejectedWithError('POST failure');
     });

     it('should build wallet entry correctly', async () => {
          httpMock.post.and.returnValue(of(mockWallet));

          await service.generateWallet('familySeed', 'testnet', 'ed25519');

          const addedWallet = walletManagerMock.addWallet.calls.mostRecent().args[0];

          expect(addedWallet.name).toBe('Wallet 1');
          expect(addedWallet.address).toBe('r123');
          expect(addedWallet.encryptionAlgorithm).toBe('ed25519');
     });

     it('should parse invalid customDestinations safely', async () => {
          storageMock.get.and.returnValue('invalid-json');
          httpMock.get.and.returnValue(of(mockWallet));

          await service.importWallet('familySeed', 'seed', 'ed25519');

          expect(walletManagerMock.addWallet).toHaveBeenCalled();
     });

     it('should throw on unsupported import type', async () => {
          await expectAsync((service as any).deriveViaApi('invalid', 'x', 'algo')).toBeRejectedWithError('Unsupported import type');
     });
});
