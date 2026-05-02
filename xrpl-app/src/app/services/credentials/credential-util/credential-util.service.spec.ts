import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CredentialUtilService } from './credential-util.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ToastService } from '../../utils/toast/toast.service';
import { CredentialStore } from '../credential-store/credential-store.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { LogServiceService } from '../../shared/log-service/log-service.service';
import { AppConstants } from '../../../core/app.constants';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';

// Mock Buffer globally
beforeAll(() => {
     (window as any).Buffer = {
          from: (str: string, encoding: string) => ({
               toString: (format: string) => {
                    if (format === 'hex') {
                         let hex = '';
                         for (let i = 0; i < str.length; i++) {
                              const charCode = str.charCodeAt(i);
                              hex += charCode.toString(16).padStart(2, '0');
                         }
                         return hex;
                    }
                    return str;
               },
          }),
     };
});

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

describe('CredentialUtilService', () => {
     let service: CredentialUtilService;
     let txUiServiceMock: any;
     let utilsServiceMock: any;
     let toastServiceMock: any;
     let credentialStoreMock: any;
     let xrplDateServiceMock: any;
     let xrplTxOptionsStoreMock: any;
     let logServiceMock: any;

     const mockCredentialItem = {
          index: 'cred123',
          CredentialType: 'KYC-LEVEL-1',
          Expiration: '2024-12-31',
          Issuer: 'rIssuer',
          Subject: 'rSubject',
          URI: 'https://example.com',
          Flags: 0,
     };

     const mockAccountObjects = {
          result: {
               account_objects: [
                    {
                         index: 'cred1',
                         LedgerEntryType: 'Credential',
                         Issuer: 'rIssuer',
                         Subject: 'rSubject',
                         CredentialType: '4b59432d4c4556454c2d31', // "KYC-LEVEL-1" in hex
                         Expiration: 1704067199,
                         Flags: 65536,
                         URI: '68747470733a2f2f6578616d706c652e636f6d', // "https://example.com" in hex
                    },
                    {
                         index: 'cred2',
                         LedgerEntryType: 'Credential',
                         Issuer: 'rOtherIssuer',
                         Subject: 'rOtherSubject',
                         CredentialType: '4f54484552',
                         Expiration: undefined,
                         Flags: 0,
                    },
               ],
          },
     } as any; // Add 'as any' here

     beforeEach(() => {
          txUiServiceMock = {
               clearAllFields: jasmine.createSpy('clearAllFields'),
          };

          utilsServiceMock = {
               fromRippleTime: jasmine.createSpy('fromRippleTime').and.returnValue({ est: '2024-12-31' }),
               formatTokenBalance: jasmine.createSpy('formatTokenBalance'),
          };

          toastServiceMock = {
               success: jasmine.createSpy('success'),
               error: jasmine.createSpy('error'),
               info: jasmine.createSpy('info'),
          };

          credentialStoreMock = {
               existingCredentials: signal([]),
               subjectCredentials: signal([]),
               credentialIdSearchTerm: signal(''),
               credentialID: signal(''),
               credentialType: signal(''),
               credentialIssuer: signal(''),
               subject: signal(''),
               selectedCredentials: signal(null),
               setField: jasmine.createSpy('setField'),
               resetCredentialIdDropDown: jasmine.createSpy('resetCredentialIdDropDown'),
               resetCredentailFields: jasmine.createSpy('resetCredentailFields'),
          };

          xrplDateServiceMock = {};

          xrplTxOptionsStoreMock = {
               isSimulateEnabled: jasmine.createSpy('isSimulateEnabled').and.returnValue(false),
          };

          logServiceMock = {
               logObjects: jasmine.createSpy('logObjects'),
          };

          TestBed.configureTestingModule({
               providers: [CredentialUtilService, { provide: TransactionUiService, useValue: txUiServiceMock }, { provide: UtilsService, useValue: utilsServiceMock }, { provide: ToastService, useValue: toastServiceMock }, { provide: CredentialStore, useValue: credentialStoreMock }, { provide: XrplDateService, useValue: xrplDateServiceMock }, { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStoreMock }, { provide: LogServiceService, useValue: logServiceMock }],
          });

          service = TestBed.inject(CredentialUtilService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('filteredExisting', () => {
          it('should return filtered credentials', () => {
               const creds = [mockCredentialItem];
               credentialStoreMock.existingCredentials.set(creds);
               const result = service.filteredExisting();
               expect(result).toEqual(creds);
          });
     });

     describe('filteredSubject', () => {
          it('should return filtered subject credentials', () => {
               const creds = [mockCredentialItem];
               credentialStoreMock.subjectCredentials.set(creds);
               const result = service.filteredSubject();
               expect(result).toEqual(creds);
          });
     });

     describe('selectCredentialFromList', () => {
          it('should set credential fields for non-verify tab', () => {
               service.selectCredentialFromList(mockCredentialItem, 'createCredential', 'rWallet');
               expect(credentialStoreMock.setField).toHaveBeenCalledWith('selectedCredentials', mockCredentialItem);
               expect(credentialStoreMock.setField).toHaveBeenCalledWith('credentialID', mockCredentialItem.index);
          });

          it('should reset dropdown when subject tries to verify own credential', () => {
               const credWithSelfSubject = { ...mockCredentialItem, Subject: 'rWallet' };
               service.selectCredentialFromList(credWithSelfSubject, 'verifyCredential', 'rWallet');
               expect(credentialStoreMock.resetCredentialIdDropDown).toHaveBeenCalled();
          });
     });

     describe('parseIssuedCredentials', () => {
          it('should parse issued credentials', () => {
               const result = service.parseIssuedCredentials(mockAccountObjects, 'rIssuer');
               expect(result.length).toBe(1);
               expect(result[0].Issuer).toBe('rIssuer');
               expect(logServiceMock.logObjects).toHaveBeenCalled();
          });
     });

     describe('parseSubjectCredentials', () => {
          it('should parse subject credentials', () => {
               const result = service.parseSubjectCredentials(mockAccountObjects, 'rSubject');
               expect(result.length).toBe(1);
               expect(result[0].Subject).toBe('rSubject');
          });
     });

     describe('filterCredentials', () => {
          const credentials = [
               { CredentialType: 'KYC', Issuer: 'rIssuer1', Subject: 'rSubject1', index: 'cred1' },
               { CredentialType: 'AML', Issuer: 'rIssuer2', Subject: 'rSubject2', index: 'cred2' },
          ] as any[];

          it('should return all when no search term', () => {
               const result = service.filterCredentials(credentials, '');
               expect(result.length).toBe(2);
          });

          it('should filter by credential type', () => {
               const result = service.filterCredentials(credentials, 'KYC');
               expect(result.length).toBe(1);
               expect(result[0].CredentialType).toBe('KYC');
          });

          it('should filter by issuer', () => {
               const result = service.filterCredentials(credentials, 'rIssuer2');
               expect(result.length).toBe(1);
               expect(result[0].Issuer).toBe('rIssuer2');
          });

          it('should filter by subject', () => {
               const result = service.filterCredentials(credentials, 'rSubject2');
               expect(result.length).toBe(1);
               expect(result[0].Subject).toBe('rSubject2');
          });

          it('should filter by index', () => {
               const result = service.filterCredentials(credentials, 'cred2');
               expect(result.length).toBe(1);
               expect(result[0].index).toBe('cred2');
          });
     });

     describe('isCredentialAccepted', () => {
          it('should return true for accepted credential (number flag)', () => {
               const cred = { Flags: 65536 } as any;
               expect(service.isCredentialAccepted(cred)).toBeTrue();
          });

          it('should return false for non-accepted credential (number flag)', () => {
               const cred = { Flags: 0 } as any;
               expect(service.isCredentialAccepted(cred)).toBeFalse();
          });
     });

     describe('selectCredential', () => {
          const walletAddress = 'rWallet';
          const mockSelectItem: SelectItem = { id: 'cred123', display: 'KYC-LEVEL-1' };

          beforeEach(() => {
               credentialStoreMock.existingCredentials.set([mockCredentialItem]);
          });

          it('should apply null when no item', () => {
               service.selectCredential(null, 'createCredential', walletAddress, 'dropdown');
               expect(credentialStoreMock.resetCredentialIdDropDown).toHaveBeenCalled();
          });

          it('should select credential from dropdown', () => {
               service.selectCredential(mockSelectItem, 'createCredential', walletAddress, 'dropdown');
               expect(credentialStoreMock.setField).toHaveBeenCalledWith('credentialID', mockCredentialItem.index);
          });
     });

     describe('getCredentialStatus', () => {
          it('should return "Credential accepted" for 65536', () => {
               expect(service.getCredentialStatus(65536)).toBe('Credential accepted');
          });

          it('should return "Credential not accepted" for other values', () => {
               expect(service.getCredentialStatus(0)).toBe('Credential not accepted');
               expect(service.getCredentialStatus(123)).toBe('Credential not accepted');
          });
     });

     describe('onCredentialIdInput', () => {
          it('should set search query', () => {
               const event = { target: { value: 'test' } } as any;
               service.onCredentialIdInput(event);
               expect(credentialStoreMock.setField).toHaveBeenCalledWith('credentialIdSearchQuery', 'test');
          });
     });

     describe('setCredentialType', () => {
          it('should set credential type', () => {
               service.setCredentialType('KYC');
               expect(credentialStoreMock.setField).toHaveBeenCalledWith('credentialType', 'KYC');
          });
     });

     describe('setCredentialUri', () => {
          it('should set URI', () => {
               service.setCredentialUri('https://example.com');
               expect(credentialStoreMock.setField).toHaveBeenCalledWith('uri', 'https://example.com');
          });
     });

     describe('clearInputFields', () => {
          it('should clear fields when not simulating', () => {
               xrplTxOptionsStoreMock.isSimulateEnabled.and.returnValue(false);
               service.clearInputFields();
               expect(txUiServiceMock.clearAllFields).toHaveBeenCalled();
               expect(credentialStoreMock.resetCredentailFields).toHaveBeenCalled();
          });

          it('should not clear fields when simulating', () => {
               xrplTxOptionsStoreMock.isSimulateEnabled.and.returnValue(true);
               service.clearInputFields();
               expect(txUiServiceMock.clearAllFields).not.toHaveBeenCalled();
          });
     });
});
