import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { WalletConfiguratorOrchestratorService } from './wallet-configurator-orchestrator.service';
import { WalletGeneratorService } from '../generator/wallet-generator.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletsStoreService } from '../wallets-store/wallets-store.service';
import { WalletsUtilService } from '../wallets-util/wallets-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionDropdownService } from '../../transaction-dropdown/transaction-dropdown.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { XrplService } from '../../xrpl-services/xrpl.service';

import { AppConstants } from '../../../core/app.constants';
import { WalletFlowConfig } from '../../../components/wallet-configurator/constants/wallet-generator.types';

describe('WalletConfiguratorOrchestratorService', () => {
     let service: WalletConfiguratorOrchestratorService;

     let walletGeneratorMock: jasmine.SpyObj<WalletGeneratorService>;
     let txUiMock: jasmine.SpyObj<TransactionUiService>;
     let walletsStoreMock: jasmine.SpyObj<InstanceType<typeof WalletsStoreService>>;
     let walletsUtilMock: jasmine.SpyObj<WalletsUtilService>;
     let toastMock: jasmine.SpyObj<ToastService>;
     let transactionDropdownMock: jasmine.SpyObj<TransactionDropdownService>;
     let storageMock: jasmine.SpyObj<StorageService>;
     let xrplMock: jasmine.SpyObj<XrplService>;

     const mockWallet = {
          address: 'rTestAddress123',
          classicAddress: 'rTestAddress123',
          seed: 'sEdTestSeed',
     };

     beforeEach(async () => {
          walletGeneratorMock = jasmine.createSpyObj<WalletGeneratorService>('WalletGeneratorService', ['generateWallet', 'importWallet']);
          txUiMock = jasmine.createSpyObj<TransactionUiService>('TransactionUiService', ['clearTxResultsHash', 'resetCurrentStepToIdle', 'setTxResultSignal'], { currentStep: signal('idle') });

          walletsStoreMock = jasmine.createSpyObj<InstanceType<typeof WalletsStoreService>>('WalletsStoreService', ['updateField']);
          walletsUtilMock = jasmine.createSpyObj<WalletsUtilService>('WalletsUtilService', ['getEncryptionType']);
          toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);

          storageMock = jasmine.createSpyObj<StorageService>('StorageService', ['set']);
          xrplMock = jasmine.createSpyObj<XrplService>('XrplService', ['getNet']);
          xrplMock.getNet.and.returnValue({ net: 'mainnet', environment: 'mainnet' });

          // Better signal mock for removeCustomWallet
          const customDestinationsSignal = signal([{ address: 'r123' }, { address: 'r456' }]);
          transactionDropdownMock = jasmine.createSpyObj<TransactionDropdownService>('TransactionDropdownService', [], {
               customDestinations: customDestinationsSignal,
          });

          TestBed.configureTestingModule({
               providers: [
                    WalletConfiguratorOrchestratorService,
                    { provide: WalletGeneratorService, useValue: walletGeneratorMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: WalletsStoreService, useValue: walletsStoreMock },
                    { provide: WalletsUtilService, useValue: walletsUtilMock },
                    { provide: ToastService, useValue: toastMock },
                    { provide: TransactionDropdownService, useValue: transactionDropdownMock },
                    { provide: StorageService, useValue: storageMock },
                    { provide: XrplService, useValue: xrplMock },
               ],
          });

          service = TestBed.inject(WalletConfiguratorOrchestratorService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('executeWalletFlow', () => {
          const baseConfig: WalletFlowConfig = {
               mode: 'generate',
               walletType: 'familySeed',
               perfLabel: 'generate-wallet',
               loadingKey: 'isGenerating' as any,
               successMessage: (addr: string) => `Wallet ${addr} created successfully`,
          };

          it('should execute generate wallet flow successfully', async () => {
               walletGeneratorMock.generateWallet.and.resolveTo(mockWallet);
               walletsUtilMock.getEncryptionType.and.returnValue('none');

               const result = await service.executeWalletFlow(baseConfig);

               expect(result.success).toBeTrue();
               expect(result.wallet).toEqual(mockWallet);
               expect(txUiMock.setTxResultSignal).toHaveBeenCalledWith(mockWallet);
               expect(toastMock.success).toHaveBeenCalled();
          });

          it('should execute import wallet flow successfully', async () => {
               const importConfig: WalletFlowConfig = {
                    ...baseConfig,
                    mode: 'import',
                    input: () => 'secretXXXX',
               };

               walletGeneratorMock.importWallet.and.resolveTo(mockWallet);
               walletsUtilMock.getEncryptionType.and.returnValue('none');

               const result = await service.executeWalletFlow(importConfig);
               expect(result.success).toBeTrue();
          });

          it('should reject invalid validation', async () => {
               const configWithValidation: WalletFlowConfig = {
                    ...baseConfig,
                    validate: () => 'Invalid input',
               };

               const result = await service.executeWalletFlow(configWithValidation);

               expect(result.success).toBeFalse();
               expect(toastMock.error).toHaveBeenCalledWith('Invalid input', AppConstants.TOAST.ERROR);
          });
     });

     describe('removeCustomWallet', () => {
          it('should remove existing custom wallet', () => {
               const result = service.removeCustomWallet('r123');

               expect(result.success).toBeTrue();
               expect(toastMock.success).toHaveBeenCalledWith(`Custom wallet r123 removed successfully`);
               expect(storageMock.set).toHaveBeenCalledWith('customDestinations', jasmine.any(String));
          });

          // it('should return error if wallet not found', () => {
          //      // Override signal for this test only
          //      const notFoundSignal = signal([{ address: 'r999' }]);
          //      (transactionDropdownMock.customDestinations as any) = notFoundSignal;

          //      const result = service.removeCustomWallet('r123');

          //      expect(result.success).toBeFalse();
          //      expect(result.error).toContain('not found');
          // });
     });
});
