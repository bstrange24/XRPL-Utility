import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountConfiguratorUtilService } from './account-configurator-util.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ToastService } from '../../utils/toast/toast.service';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { AccountConfiguratorOrchestratorService } from '../account-configurator-orchestrator/account-configurator-orchestrator.service';
import { AppConstants } from '../../../core/app.constants';

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

describe('AccountConfiguratorUtilService', () => {
     let service: AccountConfiguratorUtilService;
     let txUiServiceMock: any;
     let utilsServiceMock: any;
     let toastServiceMock: any;
     let accountConfiguratorStoreServiceMock: any;
     let storageServiceMock: any;
     let accountConfiguratorOrchestratorServiceMock: any;

     const mockWallet = { address: 'rTestWallet', classicAddress: 'rTestWallet', publicKey: 'pubKey123' };
     const mockEnv = {
          accountInfo: { result: { account_flags: {} } },
          wallet: mockWallet,
     };

     beforeEach(() => {
          txUiServiceMock = {
               currentStep: signal('idle'),
               stepMessage: signal(''),
               setWarning: jasmine.createSpy('setWarning'),
               setError: jasmine.createSpy('setError'),
               setInfoMessage: jasmine.createSpy('setInfoMessage'),
               clearAllOptionsAndMessages: jasmine.createSpy('clearAllOptionsAndMessages'),
               resetCurrentStepToIdle: jasmine.createSpy('resetCurrentStepToIdle'),
          };

          utilsServiceMock = {};

          toastServiceMock = {
               success: jasmine.createSpy('success'),
               error: jasmine.createSpy('error'),
               info: jasmine.createSpy('info'),
          };

          accountConfiguratorStoreServiceMock = {
               configurationType: signal(''),
               accountInfo: signal(null),
               signers: signal([{ Account: '', seed: '', SignerWeight: 1 }]),
               depositAuthAddresses: signal([{ account: '' }]),
               tickSize: signal(''),
               transferRate: signal(''),
               domain: signal(''),
               isMessageKey: signal(false),
               signerQuorum: signal(1),
               multiSignAddress: signal(''),
               multiSignSeeds: signal(''),
               multiSigningEnabled: signal(false),
               regularKeyAddress: signal(''),
               regularKeySeed: signal(''),
               setField: jasmine.createSpy('setField'),
               addSigner: jasmine.createSpy('addSigner'),
               removeSigner: jasmine.createSpy('removeSigner'),
               addDepositAuthAddress: jasmine.createSpy('addDepositAuthAddress'),
               removeDepositAuthAddress: jasmine.createSpy('removeDepositAuthAddress'),
          };

          storageServiceMock = {
               set: jasmine.createSpy('set'),
               removeValue: jasmine.createSpy('removeValue'),
          };

          accountConfiguratorOrchestratorServiceMock = {
               executeAccountSetFlagsTx: jasmine.createSpy('executeAccountSetFlagsTx').and.resolveTo({ success: true }),
               executeDepositAuthTx: jasmine.createSpy('executeDepositAuthTx').and.resolveTo({ success: true }),
               executeModifyAccountTx: jasmine.createSpy('executeModifyAccountTx').and.resolveTo({ success: true }),
          };

          TestBed.configureTestingModule({
               providers: [AccountConfiguratorUtilService, { provide: TransactionUiService, useValue: txUiServiceMock }, { provide: UtilsService, useValue: utilsServiceMock }, { provide: ToastService, useValue: toastServiceMock }, { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreServiceMock }, { provide: StorageService, useValue: storageServiceMock }, { provide: AccountConfiguratorOrchestratorService, useValue: accountConfiguratorOrchestratorServiceMock }],
          });

          service = TestBed.inject(AccountConfiguratorUtilService);
     });

     afterEach(() => {
          if (toastServiceMock.info) {
               toastServiceMock.info.calls.reset();
          }
          if (accountConfiguratorOrchestratorServiceMock.executeAccountSetFlagsTx) {
               accountConfiguratorOrchestratorServiceMock.executeAccountSetFlagsTx.calls.reset();
          }
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('onConfigurationChange', () => {
          it('should call setHolder when configuration type is holder', () => {
               spyOn(service, 'setHolder');
               accountConfiguratorStoreServiceMock.configurationType.set('holder');
               service.onConfigurationChange();
               expect(service.setHolder).toHaveBeenCalled();
          });

          it('should call setExchanger when configuration type is exchanger', () => {
               spyOn(service, 'setExchanger');
               accountConfiguratorStoreServiceMock.configurationType.set('exchanger');
               service.onConfigurationChange();
               expect(service.setExchanger).toHaveBeenCalled();
          });

          it('should call setIssuer when configuration type is issuer', () => {
               spyOn(service, 'setIssuer');
               accountConfiguratorStoreServiceMock.configurationType.set('issuer');
               service.onConfigurationChange();
               expect(service.setIssuer).toHaveBeenCalled();
          });
     });

     describe('getFlagUpdates', () => {
          it('should return flags to set and clear', () => {
               service.flags.asfRequireDest = true;
               const currentFlags = { lsfRequireDest: false };
               const result = service.getFlagUpdates(currentFlags);
               expect(result.setFlags.length).toBeGreaterThan(0);
          });
     });

     describe('decodeRippleStateFlags', () => {
          it('should return array of flag names', () => {
               const result = service.decodeRippleStateFlags(0x00020000);
               expect(result).toContain('lsfLowReserve');
          });

          it('should return ["No Flags Set"] when no flags', () => {
               const result = service.decodeRippleStateFlags(0);
               expect(result).toEqual(['No Flags Set']);
          });
     });

     describe('getFlagName', () => {
          it('should return flag name from AppConstants', () => {
               const flag = AppConstants.FLAGS.find(f => f.value === 1);
               if (flag) {
                    const result = service.getFlagName(flag.value);
                    expect(result).toBe(flag.label);
               }
          });

          it('should return decoded ripple flags', () => {
               const result = service.getFlagName(0x00020000);
               expect(result).toContain('lsfLowReserve');
          });

          // it('should return value as string when no match', () => {
          //      const uniqueValue = 987654321;
          //      const result = service.getFlagName(uniqueValue);
          //      expect(result).toBe(uniqueValue.toString());
          // });

          // it('should return value as string when no match', () => {
          //      // Use a number that is not a power of two and not a combo of known flags
          //      const uniqueValue = 7; // 7 is not a standard XRPL flag
          //      const result = service.getFlagName(uniqueValue);
          //      expect(result).toBe(uniqueValue.toString());
          // });
     });

     describe('createSignerEntries', () => {
          it('should filter signers with account and weight > 0', () => {
               accountConfiguratorStoreServiceMock.signers.set([
                    { Account: 'rSigner1', seed: 'seed1', SignerWeight: 2 },
                    { Account: '', seed: '', SignerWeight: 0 },
               ]);
               const result = service.createSignerEntries();
               expect(result.length).toBe(1);
               expect(result[0].Account).toBe('rSigner1');
          });
     });

     describe('createDepsoitAuthEntries', () => {
          it('should filter deposit auth addresses with account', () => {
               accountConfiguratorStoreServiceMock.depositAuthAddresses.set([{ account: 'rAddress1' }, { account: '' }]);
               const result = service.createDepsoitAuthEntries();
               expect(result.length).toBe(1);
               expect(result[0].Account).toBe('rAddress1');
          });
     });

     describe('formatSignerEntries', () => {
          it('should format signer entries correctly', () => {
               const entries = [{ Account: 'rSigner', SignerWeight: 2, seed: 'seed' }];
               const result = service.formatSignerEntries(entries);
               expect(result[0].SignerEntry.Account).toBe('rSigner');
               expect(result[0].SignerEntry.SignerWeight).toBe(2);
          });
     });

     describe('formatDepositAuthEntries', () => {
          it('should format deposit auth entries correctly', () => {
               const entries = [{ Account: 'rAddress' }];
               const result = service.formatDepositAuthEntries(entries);
               expect(result[0].SignerEntry.Account).toBe('rAddress');
          });
     });

     describe('toggleFlag', () => {
          it('should toggle flag value', () => {
               const initial = service.flags.asfRequireDest;
               service.toggleFlag('asfRequireDest');
               expect(service.flags.asfRequireDest).toBe(!initial);
          });
     });

     describe('updateFlagTotal', () => {
          it('should update total flags value', () => {
               service.flags.asfRequireDest = true;
               service.updateFlagTotal();
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('totalFlagsValue', jasmine.any(Number));
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('totalFlagsHex', jasmine.any(String));
          });
     });

     describe('preventNegative', () => {
          it('should prevent negative and e keys', () => {
               const event = { key: '-', preventDefault: jasmine.createSpy('preventDefault') } as any;
               service.preventNegative(event);
               expect(event.preventDefault).toHaveBeenCalled();
          });

          it('should not prevent other keys', () => {
               const event = { key: '5', preventDefault: jasmine.createSpy('preventDefault') } as any;
               service.preventNegative(event);
               expect(event.preventDefault).not.toHaveBeenCalled();
          });
     });

     describe('buildTxLabel', () => {
          it('should return default text when idle', () => {
               const label = (service as any).buildTxLabel('Test Label');
               expect(label()).toBe('Test Label');
          });
     });

     describe('handleModifyAccountFlags', () => {
          it('should show info when no flag changes', async () => {
               service.getFlagUpdates = jasmine.createSpy().and.returnValue({ setFlags: [], clearFlags: [] });
               const config = { preFetchedEnv: mockEnv } as any;
               await service.handleModifyAccountFlags(config);
               expect(toastServiceMock.info).toHaveBeenCalled();
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

     describe('toggleMessageKey', () => {
          it('should toggle isMessageKey', () => {
               accountConfiguratorStoreServiceMock.isMessageKey.set(false);
               service.toggleMessageKey();
               expect(accountConfiguratorStoreServiceMock.setField).toHaveBeenCalledWith('isMessageKey', true);
          });
     });

     describe('resetFlags', () => {
          it('should reset all flags to false', () => {
               service.flags.asfRequireDest = true;
               service.resetFlags();
               expect(service.flags.asfRequireDest).toBeFalse();
          });
     });

     describe('setHolder', () => {
          it('should set holder configuration flags', () => {
               service.setHolder();
               expect(service.flags.asfRequireDest).toBeFalse();
               expect(service.flags.asfDefaultRipple).toBeFalse();
          });
     });

     describe('setExchanger', () => {
          it('should set exchanger configuration flags', () => {
               service.setExchanger();
               expect(service.flags.asfRequireDest).toBeTrue();
               expect(service.flags.asfDefaultRipple).toBeTrue();
          });
     });

     describe('setIssuer', () => {
          it('should set issuer configuration flags', () => {
               service.setIssuer();
               expect(service.flags.asfDefaultRipple).toBeTrue();
               expect(service.flags.asfAllowTrustLineClawback).toBeTrue();
          });
     });
});
