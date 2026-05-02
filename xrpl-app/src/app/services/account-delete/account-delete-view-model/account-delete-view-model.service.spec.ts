import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountDeleteViewModelService } from './account-delete-view-model.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AccountDeleteStoreService } from '../account-delete-store/account-delete-store.service';
import { BLOCKER_MAP } from '../../../components/account-delete/constants/account-delete.ui';
import * as xrpl from 'xrpl';

describe('AccountDeleteViewModelService', () => {
     let service: AccountDeleteViewModelService;
     let walletManagerMock: any;
     let accountDeleteStoreServiceMock: any;
     let txUiServiceMock: any;

     const mockWallet = {
          address: 'rTestWallet',
          classicAddress: 'rTestWallet',
          name: 'Test Wallet',
     };

     const mockAccountInfo = {
          result: {
               account_data: {
                    Balance: '1000000000', // 1000 XRP
                    OwnerCount: 5,
                    PreviousTxnLgrSeq: 100,
                    RegularKey: 'rRegularKey',
                    SignerList: true,
               },
          },
     };

     const mockServerInfo = {
          result: {
               info: {
                    validated_ledger: { seq: 200 },
                    reserve_base_xrp: 10,
                    reserve_inc_xrp: 2,
               },
          },
     };

     const mockBlockingObjects = {
          result: {
               account_objects: [{ LedgerEntryType: 'Offer' }, { LedgerEntryType: 'Offer' }, { LedgerEntryType: 'TrustLine' }, { LedgerEntryType: 'Check' }],
          },
     };

     beforeEach(() => {
          walletManagerMock = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          };

          accountDeleteStoreServiceMock = {
               blockingObjects: signal(mockBlockingObjects),
               accountInfo: signal(mockAccountInfo),
               serverInfo: signal(mockServerInfo),
          };

          txUiServiceMock = {
               currentStep: signal('idle'),
               stepMessage: signal(''),
          };

          TestBed.configureTestingModule({
               providers: [AccountDeleteViewModelService, { provide: WalletManagerService, useValue: walletManagerMock }, { provide: AccountDeleteStoreService, useValue: accountDeleteStoreServiceMock }, { provide: TransactionUiService, useValue: txUiServiceMock }],
          });

          service = TestBed.inject(AccountDeleteViewModelService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('activeTab', () => {
          it('should default to deleteAccount', () => {
               expect(service.activeTab()).toBe('deleteAccount');
          });

          it('should be settable', () => {
               service.activeTab.set('deleteAccount');
               expect(service.activeTab()).toBe('deleteAccount');
          });
     });

     describe('accountObjectCounts', () => {
          it('should count blocking objects by type', () => {
               const counts = service.accountObjectCounts();
               expect(counts['Offer']).toBe(2);
               expect(counts['TrustLine']).toBe(1);
               expect(counts['Check']).toBe(1);
          });

          it('should return empty object when no blocking objects', () => {
               accountDeleteStoreServiceMock.blockingObjects.set({ result: { account_objects: [] } });
               const counts = service.accountObjectCounts();
               expect(counts).toEqual({});
          });
     });

     describe('blockersFromObjects', () => {
          // it('should map blocking objects to blockers with labels from BLOCKER_MAP', () => {
          //      const blockers = service.blockersFromObjects();
          //      expect(blockers.length).toBe(4);
          //      expect(blockers[0].label).toBeDefined();
          //      expect(blockers[0].count).toBe(2);
          // });

          it('should return empty array when no blocking objects', () => {
               accountDeleteStoreServiceMock.blockingObjects.set({ result: { account_objects: [] } });
               const blockers = service.blockersFromObjects();
               expect(blockers).toEqual([]);
          });
     });

     describe('blockersFromAccountData', () => {
          it('should return blockers for RegularKey and SignerList', () => {
               const blockers = service.blockersFromAccountData();
               expect(blockers.length).toBe(2);
               expect(blockers[0].label).toBe('Regular Key');
               expect(blockers[1].label).toBe('Signer List');
          });

          it('should return empty array when no regular key or signer list', () => {
               const accountInfoWithoutFeatures = {
                    result: {
                         account_data: {},
                    },
               };
               accountDeleteStoreServiceMock.accountInfo.set(accountInfoWithoutFeatures);
               const blockers = service.blockersFromAccountData();
               expect(blockers).toEqual([]);
          });
     });

     describe('ledgerWaitBlocker', () => {
          it('should return ledger wait blocker when less than 256 ledgers passed', () => {
               const blockers = service.ledgerWaitBlocker();
               expect(blockers.length).toBeGreaterThan(0);
               expect(blockers[0].label).toContain('Wait');
          });

          // it('should return empty array when enough ledgers have passed', () => {
          //      const accountInfoWithLargeSeq = {
          //           result: {
          //                account_data: {
          //                     PreviousTxnLgrSeq: 500,
          //                },
          //           },
          //      };
          //      const serverInfoWithLargeSeq = {
          //           result: {
          //                info: {
          //                     validated_ledger: { seq: 550 },
          //                },
          //           },
          //      };
          //      accountDeleteStoreServiceMock.accountInfo.set(accountInfoWithLargeSeq);
          //      accountDeleteStoreServiceMock.serverInfo.set(serverInfoWithLargeSeq);
          //      const blockers = service.ledgerWaitBlocker();
          //      expect(blockers).toEqual([]);
          // });

          it('should return empty array when account info missing', () => {
               accountDeleteStoreServiceMock.accountInfo.set(null);
               const blockers = service.ledgerWaitBlocker();
               expect(blockers).toEqual([]);
          });
     });

     describe('blockersList', () => {
          it('should combine all blockers', () => {
               const blockers = service.blockersList();
               expect(blockers.length).toBeGreaterThan(0);
          });
     });

     describe('balanceWarning', () => {
          it('should return null when balance is sufficient', () => {
               const warning = service.balanceWarning();
               expect(warning).toBeNull();
          });

          it('should return warning when balance is too low', () => {
               const lowBalanceAccount = {
                    result: {
                         account_data: {
                              Balance: '1000000', // 1 XRP
                              OwnerCount: 5,
                         },
                    },
               };
               accountDeleteStoreServiceMock.accountInfo.set(lowBalanceAccount);
               const warning = service.balanceWarning();
               expect(warning).toContain('Balance too low');
          });
     });

     describe('canDelete', () => {
          it('should return true when no blockers and sufficient balance', () => {
               // Need to mock no blockers
               accountDeleteStoreServiceMock.blockingObjects.set({ result: { account_objects: [] } });
               const accountInfoNoBlockers = {
                    result: {
                         account_data: {
                              Balance: '1000000000',
                              OwnerCount: 0,
                         },
                    },
               };
               accountDeleteStoreServiceMock.accountInfo.set(accountInfoNoBlockers);
               const canDelete = service.canDelete();
               expect(canDelete).toBeTrue();
          });

          it('should return false when there are blockers', () => {
               const canDelete = service.canDelete();
               expect(canDelete).toBeFalse();
          });
     });

     describe('infoData', () => {
          it('should return info data object', () => {
               const info = service.infoData();
               expect(info.walletName).toBe('Test Wallet');
               expect(info.canDelete).toBeDefined();
               expect(info.blockers).toBeDefined();
               expect(info.balanceWarning).toBeDefined();
          });

          it('should use fallback wallet name when no name', () => {
               walletManagerMock.getSelectedWallet.and.returnValue({ address: 'rTestWallet' });
               const info = service.infoData();
               expect(info.walletName).toBe('Selected wallet');
          });
     });

     describe('deleteBlockers', () => {
          it('should return the blockers list', () => {
               const blockers = service.deleteBlockers();
               expect(blockers).toEqual(service.blockersList());
          });
     });

     describe('deleteWalletButtonLabel', () => {
          it('should return "Delete Wallet" when idle', () => {
               txUiServiceMock.currentStep.set('idle');
               expect(service.deleteWalletButtonLabel()).toBe('Delete Wallet');
          });

          it('should return waiting message when waiting validation', () => {
               txUiServiceMock.currentStep.set('waiting_validation');
               expect(service.deleteWalletButtonLabel()).toBe('Waiting for ledger validation...');
          });

          it('should return step message when processing', () => {
               txUiServiceMock.currentStep.set('processing');
               txUiServiceMock.stepMessage.set('Processing transaction...');
               expect(service.deleteWalletButtonLabel()).toBe('Processing transaction...');
          });
     });

     describe('summaryMessage', () => {
          it('should return can delete message when canDelete true', () => {
               accountDeleteStoreServiceMock.blockingObjects.set({ result: { account_objects: [] } });
               const accountInfoNoBlockers = {
                    result: {
                         account_data: {
                              Balance: '1000000000',
                              OwnerCount: 0,
                         },
                    },
               };
               accountDeleteStoreServiceMock.accountInfo.set(accountInfoNoBlockers);
               const message = service.summaryMessage();
               expect(message).toContain('can be deleted');
          });

          it('should return blocker count message when blockers exist', () => {
               const message = service.summaryMessage();
               expect(message).toContain('configuration blocker');
          });
     });
});
