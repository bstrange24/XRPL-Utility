import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AmmUtilsService } from './amm-utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { AmmStoreService } from '../amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../amm-transaction-view-model/amm-transaction-view-model.service';
import { LogServiceService } from '../../shared/log-service/log-service.service';
import * as xrpl from 'xrpl';

describe('AmmUtilsService', () => {
     let service: AmmUtilsService;
     let ammStoreServiceMock: any;
     let txUiServiceMock: any;
     let xrplServiceMock: any;
     let utilsServiceMock: any;
     let logServiceMock: any;
     let ammTransactionViewModelServiceMock: any;

     const mockAmmResponse = {
          result: {
               amm: {
                    account: 'rAMMAccount',
                    lp_token: { currency: 'LP_TOKEN', value: '1000' },
                    amount: '1000000', // 1 XRP in drops
                    amount2: { value: '500', currency: 'USD', issuer: 'rIssuer' },
               },
          },
     };

     beforeEach(() => {
          ammStoreServiceMock = {
               setField: jasmine.createSpy('setField'),
          };

          txUiServiceMock = {};

          xrplServiceMock = {};

          utilsServiceMock = {
               formatTokenBalance: jasmine.createSpy('formatTokenBalance').and.callFake((value: number, decimals: number) => value.toFixed(decimals)),
          };

          logServiceMock = {
               logObjects: jasmine.createSpy('logObjects'),
          };

          ammTransactionViewModelServiceMock = {
               activeTab: signal('createAMM'),
          };

          TestBed.configureTestingModule({
               providers: [AmmUtilsService, { provide: AmmStoreService, useValue: ammStoreServiceMock }, { provide: TransactionUiService, useValue: txUiServiceMock }, { provide: XrplService, useValue: xrplServiceMock }, { provide: UtilsService, useValue: utilsServiceMock }, { provide: LogServiceService, useValue: logServiceMock }, { provide: AmmTransactionViewModelService, useValue: ammTransactionViewModelServiceMock }],
          });

          service = TestBed.inject(AmmUtilsService);
     });

     afterEach(() => {
          if (ammStoreServiceMock.setField) {
               ammStoreServiceMock.setField.calls.reset();
          }
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('depositOptions', () => {
          it('should default to both pools', () => {
               expect(service.depositOptions().bothPools).toBeTrue();
               expect(service.depositOptions().firstPoolOnly).toBeFalse();
               expect(service.depositOptions().secondPoolOnly).toBeFalse();
          });
     });

     describe('withdrawOptions', () => {
          it('should default to both pools', () => {
               expect(service.withdrawOptions().bothPools).toBeTrue();
               expect(service.withdrawOptions().firstPoolOnly).toBeFalse();
               expect(service.withdrawOptions().secondPoolOnly).toBeFalse();
          });
     });

     describe('actionButtonLabel', () => {
          it('should return "Create AMM" for createAMM tab', () => {
               ammTransactionViewModelServiceMock.activeTab.set('createAMM');
               expect(service.actionButtonLabel()).toBe('Create AMM');
          });

          it('should return "Deposit Tokens to AMM" for depositToAMM tab', () => {
               ammTransactionViewModelServiceMock.activeTab.set('depositToAMM');
               expect(service.actionButtonLabel()).toBe('Deposit Tokens to AMM');
          });

          it('should return "Withdraw Token from AMM" for withdrawalFromAMM tab', () => {
               ammTransactionViewModelServiceMock.activeTab.set('withdrawalFromAMM');
               expect(service.actionButtonLabel()).toBe('Withdraw Token from AMM');
          });

          it('should return "Clawback Token from AMM" for clawbackFromAMM tab', () => {
               ammTransactionViewModelServiceMock.activeTab.set('clawbackFromAMM');
               expect(service.actionButtonLabel()).toBe('Clawback Token from AMM');
          });

          it('should return "Swap Token via AMM" for swapViaAMM tab', () => {
               ammTransactionViewModelServiceMock.activeTab.set('swapViaAMM');
               expect(service.actionButtonLabel()).toBe('Swap Token via AMM');
          });

          it('should return "Delete AMM" for deleteAMM tab', () => {
               ammTransactionViewModelServiceMock.activeTab.set('deleteAMM');
               expect(service.actionButtonLabel()).toBe('Delete AMM');
          });

          it('should return "Submit" for unknown tab', () => {
               ammTransactionViewModelServiceMock.activeTab.set('unknown' as any);
               expect(service.actionButtonLabel()).toBe('Submit');
          });
     });

     describe('actionButtonClass', () => {
          it('should return "btn-primary" for createAMM', () => {
               ammTransactionViewModelServiceMock.activeTab.set('createAMM');
               expect(service.actionButtonClass()).toBe('btn-primary');
          });

          it('should return "btn-primary" for depositToAMM', () => {
               ammTransactionViewModelServiceMock.activeTab.set('depositToAMM');
               expect(service.actionButtonClass()).toBe('btn-primary');
          });

          it('should return "btn-blue" for withdrawalFromAMM', () => {
               ammTransactionViewModelServiceMock.activeTab.set('withdrawalFromAMM');
               expect(service.actionButtonClass()).toBe('btn-blue');
          });

          it('should return "btn-primary" for swapViaAMM', () => {
               ammTransactionViewModelServiceMock.activeTab.set('swapViaAMM');
               expect(service.actionButtonClass()).toBe('btn-primary');
          });

          it('should return "btn-blue" for clawbackFromAMM', () => {
               ammTransactionViewModelServiceMock.activeTab.set('clawbackFromAMM');
               expect(service.actionButtonClass()).toBe('btn-blue');
          });

          it('should return "btn-red" for deleteAMM', () => {
               ammTransactionViewModelServiceMock.activeTab.set('deleteAMM');
               expect(service.actionButtonClass()).toBe('btn-red');
          });
     });

     describe('selectDepositOption', () => {
          it('should select bothPools', () => {
               service.selectDepositOption('bothPools');
               expect(service.depositOptions().bothPools).toBeTrue();
               expect(service.depositOptions().firstPoolOnly).toBeFalse();
               expect(service.depositOptions().secondPoolOnly).toBeFalse();
          });

          it('should select firstPoolOnly', () => {
               service.selectDepositOption('firstPoolOnly');
               expect(service.depositOptions().bothPools).toBeFalse();
               expect(service.depositOptions().firstPoolOnly).toBeTrue();
               expect(service.depositOptions().secondPoolOnly).toBeFalse();
          });

          it('should select secondPoolOnly', () => {
               service.selectDepositOption('secondPoolOnly');
               expect(service.depositOptions().bothPools).toBeFalse();
               expect(service.depositOptions().firstPoolOnly).toBeFalse();
               expect(service.depositOptions().secondPoolOnly).toBeTrue();
          });
     });

     describe('selectWithdrawOption', () => {
          it('should select bothPools', () => {
               service.selectWithdrawOption('bothPools');
               expect(service.withdrawOptions().bothPools).toBeTrue();
               expect(service.withdrawOptions().firstPoolOnly).toBeFalse();
               expect(service.withdrawOptions().secondPoolOnly).toBeFalse();
          });

          it('should select firstPoolOnly', () => {
               service.selectWithdrawOption('firstPoolOnly');
               expect(service.withdrawOptions().bothPools).toBeFalse();
               expect(service.withdrawOptions().firstPoolOnly).toBeTrue();
               expect(service.withdrawOptions().secondPoolOnly).toBeFalse();
          });

          it('should select secondPoolOnly', () => {
               service.selectWithdrawOption('secondPoolOnly');
               expect(service.withdrawOptions().bothPools).toBeFalse();
               expect(service.withdrawOptions().firstPoolOnly).toBeFalse();
               expect(service.withdrawOptions().secondPoolOnly).toBeTrue();
          });
     });

     describe('checkAmmParticipation', () => {
          it('should detect AMM pool and set fields', async () => {
               const result = await service.checkAmmParticipation(false, mockAmmResponse);
               expect(result.isAmmPool).toBeTrue();
               expect(result.lpTokens.length).toBe(1);
               expect(result.lpTokens[0].issuer).toBe('rAMMAccount');
               expect(result.lpTokens[0].currency).toBe('LP_TOKEN');
               expect(logServiceMock.logObjects).toHaveBeenCalled();
          });

          // it('should update store fields when displayChanges is true', async () => {
          //      await service.checkAmmParticipation(true, mockAmmResponse);
          //      expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('lpTokenBalance', '1000');
          //      expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('assetPool1Balance', jasmine.any(String));
          //      expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('assetPool2Balance', jasmine.any(String));
          // });

          it('should reset store fields when no AMM pool and displayChanges is true', async () => {
               const emptyResponse = { result: {} };
               await service.checkAmmParticipation(true, emptyResponse);
               expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('lpTokenBalance', '0');
               expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('assetPool1Balance', '0');
               expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('assetPool2Balance', '0');
          });

          it('should handle missing amm gracefully', async () => {
               const emptyResponse = { result: {} };
               const result = await service.checkAmmParticipation(false, emptyResponse);
               expect(result.isAmmPool).toBeFalse();
          });
     });

     describe('clearInputFields', () => {
          it('should clear all input fields', () => {
               service.clearInputFields();
               expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('weWantAmount', '');
               expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('weSpendAmount', '');
               expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('tradingFeeField', '0.1');
               expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('holderField', '');
               expect(ammStoreServiceMock.setField).toHaveBeenCalledWith('withdrawlLpTokenFromPoolField', '');
          });

          it('should reset depositOptions to both pools', () => {
               service.selectDepositOption('firstPoolOnly');
               expect(service.depositOptions().firstPoolOnly).toBeTrue();
               service.clearInputFields();
               expect(service.depositOptions().bothPools).toBeTrue();
               expect(service.depositOptions().firstPoolOnly).toBeFalse();
               expect(service.depositOptions().secondPoolOnly).toBeFalse();
          });

          it('should reset withdrawOptions to both pools', () => {
               service.selectWithdrawOption('firstPoolOnly');
               expect(service.withdrawOptions().firstPoolOnly).toBeTrue();
               service.clearInputFields();
               expect(service.withdrawOptions().bothPools).toBeTrue();
               expect(service.withdrawOptions().firstPoolOnly).toBeFalse();
               expect(service.withdrawOptions().secondPoolOnly).toBeFalse();
          });
     });
});
