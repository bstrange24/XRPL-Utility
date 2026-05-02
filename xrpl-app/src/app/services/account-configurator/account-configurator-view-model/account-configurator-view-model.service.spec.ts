import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountConfiguratorViewModelService } from './account-configurator-view-model.service';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { ACCOUNT_CONFIG_ACTIONS } from '../../../components/account-configurator/constants/account-configurator.types';
import { FLAG_LABELS } from '../../../components/account-configurator/constants/account-configurator.flags';

describe('AccountConfiguratorViewModelService', () => {
     let service: AccountConfiguratorViewModelService;
     let accountConfiguratorStoreServiceMock: any;
     let walletManagerMock: any;
     let storageServiceMock: any;

     const mockWallet = {
          address: 'rTestWallet',
          classicAddress: 'rTestWallet',
          name: 'Test Wallet',
     };

     const mockAccountInfo = {
          result: {
               account_data: {
                    Sequence: 100,
                    RegularKey: 'rRegularKey',
                    TickSize: 10,
                    TransferRate: 1000000000,
                    Domain: 'example.com',
                    nfTokenMinterAddress: 'rNFTMinter',
               },
               account_flags: {
                    requireDest: true,
                    requireAuth: false,
                    disallowXRP: true,
                    disableMasterKey: false,
                    noFreeze: true,
                    globalFreeze: false,
                    defaultRipple: true,
                    depositAuth: false,
                    authorizedNFTokenMinter: false,
                    disallowIncomingNFTokenOffer: false,
                    disallowIncomingCheck: false,
                    disallowIncomingPayChan: false,
                    disallowIncomingTrustline: false,
                    allowTrustLineClawback: true,
                    allowTrustLineLocking: false,
               },
          },
     };

     beforeEach(() => {
          accountConfiguratorStoreServiceMock = {
               depositAuthEnabled: signal(false),
               depositAuthAddresses: signal([]),
               isMessageKey: signal(false),
          };

          walletManagerMock = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          };

          storageServiceMock = {
               get: jasmine.createSpy('get').and.returnValue([]),
               set: jasmine.createSpy('set'),
               removeValue: jasmine.createSpy('removeValue'),
          };

          TestBed.configureTestingModule({
               providers: [AccountConfiguratorViewModelService, { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreServiceMock }, { provide: WalletManagerService, useValue: walletManagerMock }, { provide: StorageService, useValue: storageServiceMock }],
          });

          service = TestBed.inject(AccountConfiguratorViewModelService);
     });

     afterEach(() => {
          if (walletManagerMock.getSelectedWallet) {
               walletManagerMock.getSelectedWallet.calls.reset();
          }
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('activeTab', () => {
          it('should default to MODIFY_ACCOUNT_FLAGS', () => {
               expect(service.activeTab()).toBe(ACCOUNT_CONFIG_ACTIONS.MODIFY_ACCOUNT_FLAGS);
          });

          it('should be settable', () => {
               service.activeTab.set(ACCOUNT_CONFIG_ACTIONS.MODIFY_DEPOSIT_AUTH);
               expect(service.activeTab()).toBe(ACCOUNT_CONFIG_ACTIONS.MODIFY_DEPOSIT_AUTH);
          });
     });

     describe('accountInfo', () => {
          it('should be settable', () => {
               service.accountInfo.set(mockAccountInfo);
               expect(service.accountInfo()).toEqual(mockAccountInfo);
          });
     });

     describe('enabledFlagLabels', () => {
          it('should return empty array when no accountInfo', () => {
               service.accountInfo.set(null);
               expect(service.enabledFlagLabels()).toEqual([]);
          });

          it('should return labels for enabled flags', () => {
               service.accountInfo.set(mockAccountInfo);
               const labels = service.enabledFlagLabels();
               // Check for flags that should have labels
               expect(labels.length).toBeGreaterThan(0);
               // The labels array should contain strings, not undefined
               expect(labels.every(label => label !== undefined)).toBeTrue();
          });
     });

     describe('infoData', () => {
          beforeEach(() => {
               service.accountInfo.set(mockAccountInfo);
          });

          it('should return null when no wallet selected', () => {
               walletManagerMock.getSelectedWallet.and.returnValue(null);
               expect(service.infoData()).toBeNull();
          });

          it('should return null when no accountInfo', () => {
               service.accountInfo.set(null);
               expect(service.infoData()).toBeNull();
          });

          it('should return config items when account has special config', () => {
               const result = service.infoData();
               expect(result).toBeDefined();
               expect(result?.walletName).toBe('Test Wallet');
               expect(result?.hasSpecialConfig).toBeTrue();
          });

          it('should include multi-signing info when master key disabled', () => {
               const accountInfoWithMasterDisabled = {
                    ...mockAccountInfo,
                    result: {
                         ...mockAccountInfo.result,
                         account_flags: {
                              ...mockAccountInfo.result.account_flags,
                              disableMasterKey: true,
                         },
                    },
               };
               service.accountInfo.set(accountInfoWithMasterDisabled);
               storageServiceMock.get.and.returnValue([{ Account: 'rSigner' }]);

               const result = service.infoData();
               expect(result?.configItems?.some(item => item.text.includes('Multi-signing enabled'))).toBeTrue();
          });

          it('should include regular key info when master key disabled', () => {
               const accountInfoWithRegularKey = {
                    ...mockAccountInfo,
                    result: {
                         ...mockAccountInfo.result,
                         account_data: {
                              ...mockAccountInfo.result.account_data,
                              RegularKey: 'rRegularKey',
                         },
                         account_flags: {
                              ...mockAccountInfo.result.account_flags,
                              disableMasterKey: true,
                         },
                    },
               };
               service.accountInfo.set(accountInfoWithRegularKey);

               const result = service.infoData();
               expect(result?.configItems?.some(item => item.text.includes('Regular Key configured'))).toBeTrue();
          });

          it('should include deposit auth info when enabled', () => {
               accountConfiguratorStoreServiceMock.depositAuthEnabled.set(true);
               accountConfiguratorStoreServiceMock.depositAuthAddresses.set([{ account: 'rAddr1' }]);

               const result = service.infoData();
               expect(result?.configItems?.some(item => item.text.includes('Deposit Authorization enabled'))).toBeTrue();
          });

          it('should include account settings features', () => {
               const result = service.infoData();
               expect(result?.configItems?.some(item => item.text.includes('Tick Size'))).toBeTrue();
               expect(result?.configItems?.some(item => item.text.includes('Transfer Rate'))).toBeTrue();
               expect(result?.configItems?.some(item => item.text.includes('Domain'))).toBeTrue();
          });

          it('should include message key when enabled', () => {
               accountConfiguratorStoreServiceMock.isMessageKey.set(true);
               const result = service.infoData();
               expect(result?.configItems?.some(item => item.text.includes('Message Key'))).toBeTrue();
          });

          it('should include irreversible flags', () => {
               const result = service.infoData();
               expect(result?.irreversibleMessage).toContain('No Freeze');
               expect(result?.irreversibleMessage).toContain('Clawback');
          });

          it('should return summary message with no special config', () => {
               const emptyAccountInfo = {
                    result: {
                         account_data: {},
                         account_flags: {},
                    },
               };
               service.accountInfo.set(emptyAccountInfo);
               accountConfiguratorStoreServiceMock.depositAuthEnabled.set(false);
               accountConfiguratorStoreServiceMock.isMessageKey.set(false);

               const result = service.infoData();
               expect(result?.summaryMessage).toContain('no special account configuration');
          });
     });

     describe('getEnabledFlagsCount', () => {
          it('should return 0 when no accountInfo', () => {
               service.accountInfo.set(null);
               expect(service.getEnabledFlagsCount()).toBe(0);
          });

          it('should return count of enabled flags', () => {
               service.accountInfo.set(mockAccountInfo);
               expect(service.getEnabledFlagsCount()).toBeGreaterThan(0);
          });
     });

     describe('getEnabledFlags', () => {
          it('should return empty array when no accountInfo', () => {
               service.accountInfo.set(null);
               expect(service.getEnabledFlags()).toEqual([]);
          });

          it('should return labels for enabled flags', () => {
               service.accountInfo.set(mockAccountInfo);
               const flags = service.getEnabledFlags();
               expect(flags.length).toBeGreaterThan(0);
          });
     });
});
