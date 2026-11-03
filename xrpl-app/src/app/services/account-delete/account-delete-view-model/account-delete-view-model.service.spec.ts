import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountDeleteViewModelService } from './account-delete-view-model.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { AccountDeleteStoreService } from '../account-delete-store/account-delete-store.service';

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
                    Sequence: 100,
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
               account_objects: [{ LedgerEntryType: 'RippleState' }, { LedgerEntryType: 'RippleState' }, { LedgerEntryType: 'PayChannel' }, { LedgerEntryType: 'Check' }],
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
               destination: signal(''),
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
               expect(counts['RippleState']).toBe(2);
               expect(counts['PayChannel']).toBe(1);
               expect(counts['Check']).toBe(1);
          });

          it('should return empty object when no blocking objects', () => {
               accountDeleteStoreServiceMock.blockingObjects.set({ result: { account_objects: [] } });
               const counts = service.accountObjectCounts();
               expect(counts).toEqual({});
          });
     });

     describe('blockersFromObjects', () => {
          it('should explain when a payment channel was created by another account', () => {
               accountDeleteStoreServiceMock.blockingObjects.set({
                    result: {
                         account_objects: [
                              {
                                   LedgerEntryType: 'PayChannel',
                                   Account: 'rChannelCreator',
                                   Destination: mockWallet.classicAddress,
                              },
                         ],
                    },
               });

               expect(service.blockersFromObjects()[0].details).toEqual(['created by rChannelCreator; destination is this account']);
          });

          it('should return empty array when no blocking objects', () => {
               accountDeleteStoreServiceMock.blockingObjects.set({ result: { account_objects: [] } });
               const blockers = service.blockersFromObjects();
               expect(blockers).toEqual([]);
          });
     });

     describe('eligibilityIssues', () => {
          it('should calculate the wait using account Sequence and the current validated ledger', () => {
               const issues = service.eligibilityIssues();
               expect(issues.length).toBe(1);
               expect(issues[0].label).toContain('Wait 155 more ledgers');
          });

          it('should not treat RegularKey or SignerList as deletion blockers', () => {
               accountDeleteStoreServiceMock.blockingObjects.set({ result: { account_objects: [] } });
               expect(service.blockersList()).toEqual([]);
          });

          it('should report the NFT remint window when the account has minted NFTs', () => {
               accountDeleteStoreServiceMock.accountInfo.set({
                    result: {
                         account_data: {
                              Sequence: 1,
                              OwnerCount: 0,
                              MintedNFTokens: 5,
                              FirstNFTokenSequence: 10,
                         },
                    },
               });
               const issues = service.eligibilityIssues();
               expect(issues.some(issue => issue.label.includes('NFT remint window'))).toBeTrue();
          });

          it('should report object-count and sponsorship restrictions', () => {
               accountDeleteStoreServiceMock.accountInfo.set({
                    result: {
                         account_data: {
                              Sequence: 1,
                              OwnerCount: 1001,
                              SponsoringOwnerCount: 1,
                         },
                    },
               });
               const labels = service.eligibilityIssues().map(issue => issue.label);
               expect(labels.some(label => label.includes('1,000 or fewer'))).toBeTrue();
               expect(labels.some(label => label.includes('sponsorships'))).toBeTrue();
          });

          it('should require a sponsored account to use its sponsor as the destination', () => {
               accountDeleteStoreServiceMock.accountInfo.set({
                    result: {
                         account_data: {
                              Sequence: 1,
                              OwnerCount: 0,
                              Sponsor: 'rSponsor',
                         },
                    },
               });
               expect(service.eligibilityIssues().some(issue => issue.label.includes('rSponsor'))).toBeTrue();

               accountDeleteStoreServiceMock.destination.set('rSponsor');
               expect(service.eligibilityIssues().some(issue => issue.label.includes('sponsor'))).toBeFalse();
          });

          it('should return no eligibility issues when account data is unavailable', () => {
               accountDeleteStoreServiceMock.accountInfo.set(null);
               expect(service.eligibilityIssues()).toEqual([]);
          });
     });

     describe('blockersList', () => {
          it('should only contain actual ledger object blockers', () => {
               const blockers = service.blockersList();
               expect(blockers.length).toBe(3);
               expect(blockers.some(blocker => blocker.label === 'Regular Key' || blocker.label === 'Signer Lists')).toBeFalse();
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

          it('should not require the account reserve to remain after deletion', () => {
               accountDeleteStoreServiceMock.accountInfo.set({
                    result: {
                         account_data: {
                              Balance: '3000000',
                              OwnerCount: 5,
                         },
                    },
               });
               expect(service.balanceWarning()).toBeNull();
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
                              Sequence: 1,
                         },
                    },
               };
               accountDeleteStoreServiceMock.accountInfo.set(accountInfoNoBlockers);
               accountDeleteStoreServiceMock.serverInfo.set({
                    result: { info: { validated_ledger: { seq: 1000 }, reserve_base_xrp: 10, reserve_inc_xrp: 2 } },
               });
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
               expect(info.eligibilityIssues).toBeDefined();
               expect(info.balanceWarning).toBeDefined();
          });

          it('should use fallback wallet name when no name', () => {
               walletManagerMock.getSelectedWallet.and.returnValue({ address: 'rTestWallet' });
               const info = service.infoData();
               expect(info.walletName).toBe('Selected wallet');
          });
     });

     describe('deleteBlockers', () => {
          it('should include object blockers and account eligibility requirements', () => {
               const blockers = service.deleteBlockers();
               expect(blockers.length).toBe(service.blockersList().length + service.eligibilityIssues().length + Number(!!service.balanceWarning()));
               expect(blockers.some(blocker => blocker.label.includes('Wait'))).toBeTrue();
          });
     });

     describe('deleteWalletButtonLabel', () => {
          it('should return "Delete Account" when idle', () => {
               txUiServiceMock.currentStep.set('idle');
               expect(service.deleteWalletButtonLabel()).toBe('Delete Account');
          });

          it('should keep the action label while waiting for validation', () => {
               txUiServiceMock.currentStep.set('waiting_validation');
               expect(service.deleteWalletButtonLabel()).toBe('Delete Account');
          });

          it('should keep the action label while processing', () => {
               txUiServiceMock.currentStep.set('processing');
               txUiServiceMock.stepMessage.set('Processing transaction...');
               expect(service.deleteWalletButtonLabel()).toBe('Delete Account');
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
                              Sequence: 1,
                         },
                    },
               };
               accountDeleteStoreServiceMock.accountInfo.set(accountInfoNoBlockers);
               accountDeleteStoreServiceMock.serverInfo.set({
                    result: { info: { validated_ledger: { seq: 1000 }, reserve_base_xrp: 10, reserve_inc_xrp: 2 } },
               });
               const message = service.summaryMessage();
               expect(message).toContain('can be deleted');
          });

          it('should return blocker count message when blockers exist', () => {
               const message = service.summaryMessage();
               expect(message).toContain('deletion blockers or requirements');
          });
     });
});
