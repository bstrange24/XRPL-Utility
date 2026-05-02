import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AcccountDataService } from './acccount-data.service';
import { XrplTransactionService } from '../xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { StorageService } from '../shared/local-storage/storage.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../utils/download-util/download-util.service';
import { CopyUtilService } from '../utils/copy-util/copy-util.service';
import { WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { ToastService } from '../utils/toast/toast.service';
import { TrustlineCurrencyService } from '../trustlines/trustline-currency/trustline-currency.service';
import { AccountConfiguratorStoreService } from '../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { CreateNftStoreService } from '../nft/nft-store/nft-store.service';
import * as xrpl from 'xrpl';

// Mock Performance API
beforeAll(() => {
     const mockPerformance = {
          mark: jasmine.createSpy('mark'),
          measure: jasmine.createSpy('measure'),
          clearMarks: jasmine.createSpy('clearMarks'),
          clearMeasures: jasmine.createSpy('clearMeasures'),
          getEntriesByName: jasmine.createSpy('getEntriesByName').and.returnValue([{ duration: 123.45 } as PerformanceEntry]),
     };
     Object.defineProperty(window, 'performance', {
          value: mockPerformance,
          configurable: true,
          writable: true,
     });
});

describe('AcccountDataService', () => {
     let service: AcccountDataService;
     let utilsServiceMock: any;
     let storageServiceMock: any;
     let walletManagerServiceMock: any;
     let txUiServiceMock: any;
     let downloadUtilServiceMock: any;
     let copyUtilServiceMock: any;
     let toastServiceMock: any;
     let trustlineCurrencyMock: any;
     let xrplTransactionsMock: any;
     let accountConfiguratorStoreServiceMock: any;
     let createNftStoreServiceMock: any;
     let xrplTxOptionsStoreMock: any;

     const mockWallet = { classicAddress: 'rTestWallet', address: 'rTestWallet' } as xrpl.Wallet;
     const mockAccountInfo = {
          result: {
               account_data: {
                    RegularKey: 'rRegularKey',
                    Account: 'rTestWallet',
                    TickSize: 10,
                    TransferRate: 1000000000,
                    Domain: '6578616D706C652E636F6D',
                    MessageKey: 'messageKey123',
                    NFTokenMinter: 'rNFTMinter',
               },
               account_flags: {},
          },
     };

     const mockAccountObjects = {
          result: {
               account_objects: [
                    { LedgerEntryType: 'DepositPreauth', Authorize: 'rPreauth1', index: 'idx1', LedgerIndex: '1' },
                    { LedgerEntryType: 'DepositPreauth', Authorize: 'rPreauth2', index: 'idx2', LedgerIndex: '2' },
                    { LedgerEntryType: 'SignerList', index: 'idx3', LedgerIndex: '3' },
               ],
          },
          id: 1,
          type: 'response',
     } as any;

     beforeEach(() => {
          utilsServiceMock = {
               getAccountTickets: jasmine.createSpy('getAccountTickets').and.returnValue([1, 2, 3]),
               checkForSignerAccounts: jasmine.createSpy('checkForSignerAccounts').and.returnValue({ signerAccounts: ['rSigner1', 'rSigner2'], signerQuorum: 2 }),
               setRegularKeyProperties: jasmine.createSpy('setRegularKeyProperties').and.returnValue({ regularKeyAddress: 'rRegularKey', regularKeySeed: 'seed123' }),
               decodeHex: jasmine.createSpy('decodeHex').and.returnValue('example.com'),
          };

          storageServiceMock = {
               get: jasmine.createSpy('get').and.returnValue([{ Account: 'rSigner1', seed: 'seed1', SignerWeight: 1 }]),
               set: jasmine.createSpy('set'),
               removeValue: jasmine.createSpy('removeValue'),
          };

          walletManagerServiceMock = {};

          txUiServiceMock = {};

          downloadUtilServiceMock = {};

          copyUtilServiceMock = {};

          toastServiceMock = {};

          trustlineCurrencyMock = {};

          xrplTransactionsMock = {};

          accountConfiguratorStoreServiceMock = {
               setField: jasmine.createSpy('setField'),
               multiSignAddress: signal(''),
               multiSignSeeds: signal(''),
          };

          createNftStoreServiceMock = {
               setField: jasmine.createSpy('setField'),
          };

          xrplTxOptionsStoreMock = {
               setField: jasmine.createSpy('setField'),
          };

          TestBed.configureTestingModule({
               providers: [
                    AcccountDataService,
                    { provide: UtilsService, useValue: utilsServiceMock },
                    { provide: StorageService, useValue: storageServiceMock },
                    { provide: WalletManagerService, useValue: walletManagerServiceMock },
                    { provide: TransactionUiService, useValue: txUiServiceMock },
                    { provide: DownloadUtilService, useValue: downloadUtilServiceMock },
                    { provide: CopyUtilService, useValue: copyUtilServiceMock },
                    { provide: ToastService, useValue: toastServiceMock },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyMock },
                    { provide: XrplTransactionService, useValue: xrplTransactionsMock },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreServiceMock },
                    { provide: CreateNftStoreService, useValue: createNftStoreServiceMock },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStoreMock },
               ],
          });

          service = TestBed.inject(AcccountDataService);
     });

     afterEach(() => {
          if (accountConfiguratorStoreServiceMock.setField) {
               accountConfiguratorStoreServiceMock.setField.calls.reset();
          }
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('refreshUiState', () => {
          it('should set ticket array', () => {
               service.refreshUiState(mockWallet, mockAccountInfo, mockAccountObjects);
               expect(xrplTxOptionsStoreMock.setField).toHaveBeenCalledWith('ticketArray', [1, 2, 3]);
          });

          it('should set signer quorum', () => {
               service.refreshUiState(mockWallet, mockAccountInfo, mockAccountObjects);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('signerQuorum', 2);
          });

          it('should set multiSigningEnabled when signer accounts exist', () => {
               service.refreshUiState(mockWallet, mockAccountInfo, mockAccountObjects);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('multiSigningEnabled', true);
          });

          it('should set signers from storage when has signer list', () => {
               service.refreshUiState(mockWallet, mockAccountInfo, mockAccountObjects);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('signers', [{ Account: 'rSigner1', seed: 'seed1', SignerWeight: 1 }]);
          });

          it('should set regular key properties', () => {
               service.refreshUiState(mockWallet, mockAccountInfo, mockAccountObjects);
               expect(utilsServiceMock.setRegularKeyProperties).toHaveBeenCalled();
          });
     });

     describe('refreshUiStateAccountConfigure', () => {
          const mockEnv = {
               accountInfo: mockAccountInfo,
               accountObjects: mockAccountObjects,
          };

          it('should set regular key properties', () => {
               service.refreshUiStateAccountConfigure(mockWallet, mockEnv);
               expect(utilsServiceMock.setRegularKeyProperties).toHaveBeenCalled();
          });

          it('should set deposit auth', () => {
               service.refreshUiStateAccountConfigure(mockWallet, mockEnv);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('depositAuthEnabled', true);
          });

          it('should set NFT minter', () => {
               service.refreshUiStateAccountConfigure(mockWallet, mockEnv);
               expect(createNftStoreServiceMock.setField).toHaveBeenCalledWith('nfTokenMinterAddress', 'rNFTMinter');
          });
     });

     describe('setRegularKeyProperties', () => {
          it('should set regular key properties when regular key exists', () => {
               service.setRegularKeyProperties(mockAccountInfo);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('regularKeySigningEnabled', true);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('regularKeyAddress', 'rRegularKey');
          });

          it('should set empty regular key when none exists', () => {
               const accountInfoWithoutKey = {
                    result: {
                         account_data: {},
                    },
               };
               service.setRegularKeyProperties(accountInfoWithoutKey);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('regularKeySigningEnabled', false);
          });
     });

     describe('setupMultiSignersConfiguration', () => {
          it('should setup multi-signers configuration from storage', () => {
               service.setupMultiSignersConfiguration(mockWallet);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('signers', [{ Account: 'rSigner1', seed: 'seed1', SignerWeight: 1 }]);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('multiSignAddress', 'rSigner1');
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('multiSignSeeds', 'seed1');
          });
     });

     describe('clearMultiSignersConfiguration', () => {
          it('should clear multi-signers configuration', () => {
               service.clearMultiSignersConfiguration();
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('signerQuorum', 1);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('signers', [{ Account: '', seed: '', SignerWeight: 1 }]);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('multiSignAddress', 'No Multi-Sign address configured for account');
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('multiSignSeeds', '');
          });
     });

     describe('findDepositPreauthObjects', () => {
          it('should find deposit preauth objects', () => {
               const result = service.findDepositPreauthObjects(mockAccountObjects);
               expect(result).toEqual(['rPreauth1', 'rPreauth2']);
          });

          it('should return empty array when no account objects', () => {
               const result = service.findDepositPreauthObjects({ result: { account_objects: null } } as any);
               expect(result).toEqual([]);
          });
     });

     describe('setDepositAuthProperties', () => {
          it('should set deposit auth properties when has preauth accounts', () => {
               service.setDepositAuthProperties(true, ['rPreauth1', 'rPreauth2']);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('depositAuthAddresses', [{ account: 'rPreauth1' }, { account: 'rPreauth2' }]);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isdepositAuthAddress', true);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('depositAuthEnabled', true);
          });

          it('should clear deposit auth properties when no preauth accounts', () => {
               service.setDepositAuthProperties(false, []);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('depositAuthAddresses', [{ account: '' }]);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isdepositAuthAddress', false);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('depositAuthEnabled', false);
               expect(storageServiceMock.removeValue).toHaveBeenCalledWith('depositAuthEntries');
          });
     });

     describe('setNfTokenMinterProperties', () => {
          it('should set NFT minter properties when token minter exists', () => {
               service.setNfTokenMinterProperties('rNFTMinter');
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isNFTokenMinterEnabled', true);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('nfTokenMinterAddress', 'rNFTMinter');
               expect(createNftStoreServiceMock.setField).toHaveBeenCalledWith('nfTokenMinterAddress', 'rNFTMinter');
          });

          it('should clear NFT minter properties when token minter undefined', () => {
               service.setNfTokenMinterProperties(undefined);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isNFTokenMinterEnabled', false);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('nfTokenMinterAddress', '');
          });
     });

     describe('refreshUiAccountMetaData', () => {
          it('should set isUpdateMetaData true when metadata exists', () => {
               service.refreshUiAccountMetaData(mockAccountInfo.result.account_data);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isUpdateMetaData', true);
          });

          it('should set isUpdateMetaData false when no metadata', () => {
               service.refreshUiAccountMetaData({});
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isUpdateMetaData', false);
          });
     });

     describe('refreshUiIAccountMetaData', () => {
          it('should set metadata fields', async () => {
               await service.refreshUiIAccountMetaData(mockAccountInfo.result.account_data);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('tickSize', 10);
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('transferRate', '0.000');
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('domain', 'example.com');
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isMessageKey', true);
          });
     });

     describe('clearUiIAccountMetaData', () => {
          it('should clear metadata fields', () => {
               service.clearUiIAccountMetaData();
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('tickSize', '');
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('transferRate', '');
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('domain', '');
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isMessageKey', false);
          });
     });
});
