import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CredentialViewModelService } from './credential-view-model.service';
import { CredentialStore } from '../credential-store/credential-store.service';
import { CredentialUtilService } from '../credential-util/credential-util.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { CredentialActionTypes, CredentialItem } from '../../../components/credentials/constants/credential.types';

describe('CredentialViewModelService', () => {
     let service: CredentialViewModelService;
     let credentialStoreMock: any;
     let credentialUtilServiceMock: any;
     let walletManagerMock: any;
     let txUiServiceMock: any;

     const mockWallet = {
          address: 'rTestWallet',
          name: 'Test Wallet',
     };

     const mockIssuedCredentials: CredentialItem[] = [
          {
               index: 'cred1',
               CredentialType: 'KYC-LEVEL-1',
               Expiration: 'N/A',
               Issuer: 'rIssuer',
               Subject: 'rSubject1',
               URI: '',
               Flags: 0,
          },
          {
               index: 'cred2',
               CredentialType: 'AML',
               Expiration: 'N/A',
               Issuer: 'rIssuer',
               Subject: 'rSubject2',
               URI: '',
               Flags: 65536, // accepted
          },
     ];

     const mockReceivedCredentials: CredentialItem[] = [
          {
               index: 'cred3',
               CredentialType: 'KYC-LEVEL-2',
               Expiration: 'N/A',
               Issuer: 'rOtherIssuer',
               Subject: 'rTestWallet',
               URI: '',
               Flags: 0, // not accepted
          },
          {
               index: 'cred4',
               CredentialType: 'Security Clearance',
               Expiration: 'N/A',
               Issuer: 'rOtherIssuer',
               Subject: 'rTestWallet',
               URI: '',
               Flags: 65536, // accepted
          },
     ];

     beforeEach(() => {
          credentialStoreMock = {
               existingCredentials: signal([...mockIssuedCredentials]),
               subjectCredentials: signal([...mockReceivedCredentials]),
               credentialID: signal(''),
          };

          credentialUtilServiceMock = {
               isCredentialAccepted: jasmine.createSpy('isCredentialAccepted').and.callFake((cred: CredentialItem) => {
                    return cred.Flags === 65536;
               }),
          };

          walletManagerMock = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          };

          txUiServiceMock = {
               currentStep: signal('idle'),
               stepMessage: signal(''),
          };

          TestBed.configureTestingModule({
               providers: [CredentialViewModelService, { provide: CredentialStore, useValue: credentialStoreMock }, { provide: CredentialUtilService, useValue: credentialUtilServiceMock }, { provide: WalletManagerService, useValue: walletManagerMock }, { provide: TransactionUiService, useValue: txUiServiceMock }],
          });

          service = TestBed.inject(CredentialViewModelService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('activeTab', () => {
          it('should default to createCredential', () => {
               expect(service.activeTab()).toBe('createCredential');
          });

          it('should be settable', () => {
               service.activeTab.set('acceptCredential');
               expect(service.activeTab()).toBe('acceptCredential');
          });
     });

     describe('issuedByMe', () => {
          it('should return existing credentials', () => {
               expect(service.issuedByMe().length).toBe(2);
          });
     });

     describe('issuedToMe', () => {
          it('should return subject credentials', () => {
               expect(service.issuedToMe().length).toBe(2);
          });
     });

     describe('pendingIssued', () => {
          it('should return non-accepted issued credentials', () => {
               const pending = service.pendingIssued();
               expect(pending.length).toBe(1);
               expect(pending[0].index).toBe('cred1');
          });
     });

     describe('acceptedIssued', () => {
          it('should return accepted issued credentials', () => {
               const accepted = service.acceptedIssued();
               expect(accepted.length).toBe(1);
               expect(accepted[0].index).toBe('cred2');
          });
     });

     describe('pendingToAccept', () => {
          it('should return non-accepted received credentials', () => {
               const pending = service.pendingToAccept();
               expect(pending.length).toBe(1);
               expect(pending[0].index).toBe('cred3');
          });
     });

     describe('acceptedByMe', () => {
          it('should return accepted received credentials', () => {
               const accepted = service.acceptedByMe();
               expect(accepted.length).toBe(1);
               expect(accepted[0].index).toBe('cred4');
          });
     });

     describe('credentialVm', () => {
          it('should return empty when no wallet selected', () => {
               walletManagerMock.getSelectedWallet.and.returnValue(null);
               const vm = service.credentialVm();
               expect(vm.hasCredentials).toBeFalse();
               expect(vm.list).toEqual([]);
          });

          it('should return credentials for createCredential tab', () => {
               service.activeTab.set('createCredential');
               const vm = service.credentialVm();
               expect(vm.list.length).toBe(2);
               expect(vm.dropdown.length).toBe(2);
          });

          it('should return credentials for acceptCredential tab', () => {
               service.activeTab.set('acceptCredential');
               const vm = service.credentialVm();
               expect(vm.list.length).toBe(1);
          });

          it('should return credentials for deleteCredential tab', () => {
               service.activeTab.set('deleteCredential');
               const vm = service.credentialVm();
               expect(vm.list.length).toBe(2);
          });

          it('should return all credentials for verifyCredential tab', () => {
               service.activeTab.set('verifyCredential');
               const vm = service.credentialVm();
               expect(vm.list.length).toBe(4);
          });
     });

     describe('selectedCredentialIsExpired', () => {
          it('should return false when no credential selected', () => {
               credentialStoreMock.credentialID.set('');
               expect(service.selectedCredentialIsExpired()).toBeFalse();
          });

          it('should return false for non-expired credential', () => {
               credentialStoreMock.credentialID.set('cred1');
               expect(service.selectedCredentialIsExpired()).toBeFalse();
          });
     });

     describe('vm', () => {
          it('should return VM data', () => {
               service.activeTab.set('createCredential');
               const vm = service.vm();
               expect(vm.tab).toBe('createCredential');
               expect(vm.walletName).toBe('Test Wallet');
               expect(vm.address).toBe('rTestWallet');
          });
     });

     describe('credentialStats', () => {
          it('should return credential statistics', () => {
               const stats = service.credentialStats();
               expect(stats.counts.issued).toBe(2);
               expect(stats.counts.received).toBe(2);
               expect(stats.counts.pendingIssued).toBe(1);
               expect(stats.counts.acceptedIssued).toBe(1);
               expect(stats.counts.pendingToAccept).toBe(1);
               expect(stats.counts.acceptedByMe).toBe(1);
          });
     });

     describe('actionButtonLabel', () => {
          it('should return "Create Credential" for createCredential tab', () => {
               const label = service.actionButtonLabel('createCredential');
               expect(label).toBe('Create Credential');
          });

          it('should return "Accept Credential" for acceptCredential tab', () => {
               const label = service.actionButtonLabel('acceptCredential');
               expect(label).toBe('Accept Credential');
          });

          it('should return "Delete Credential" for deleteCredential tab', () => {
               const label = service.actionButtonLabel('deleteCredential');
               expect(label).toBe('Delete Credential');
          });

          it('should return "Verify Credential" for verifyCredential tab', () => {
               const label = service.actionButtonLabel('verifyCredential');
               expect(label).toBe('Verify Credential');
          });
     });

     describe('actionButtonClass', () => {
          it('should return "btn-primary" for createCredential', () => {
               expect(service.actionButtonClass('createCredential')).toBe('btn-primary');
          });

          it('should return "btn-purple" for acceptCredential', () => {
               expect(service.actionButtonClass('acceptCredential')).toBe('btn-purple');
          });

          it('should return "btn-primary-red" for deleteCredential', () => {
               expect(service.actionButtonClass('deleteCredential')).toBe('btn-primary-red');
          });

          it('should return "btn-amber" for verifyCredential', () => {
               expect(service.actionButtonClass('verifyCredential')).toBe('btn-amber');
          });
     });

     describe('summaryMessage', () => {
          it('should return message for createCredential', () => {
               const msg = service.summaryMessage('createCredential');
               expect(msg).toContain('has issued <strong>2</strong> credentials');
          });

          it('should return message for acceptCredential', () => {
               const msg = service.summaryMessage('acceptCredential');
               expect(msg).toContain('has <strong>1</strong> credential pending acceptance');
          });

          it('should return message for deleteCredential', () => {
               const msg = service.summaryMessage('deleteCredential');
               expect(msg).toContain('has <strong>2</strong> issued credentials');
          });

          it('should return message for verifyCredential', () => {
               const msg = service.summaryMessage('verifyCredential');
               expect(msg).toContain('is involved in <strong>4</strong> credentials');
          });
     });
});
