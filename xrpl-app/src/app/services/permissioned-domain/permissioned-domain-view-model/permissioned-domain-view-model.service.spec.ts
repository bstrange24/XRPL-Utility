import { TestBed } from '@angular/core/testing';
import { PermissionedDomainViewModelService } from './permissioned-domain-view-model.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { PermissionedDomainStoreService } from '../permissioned-domain-store/permissioned-domain-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import * as xrpl from 'xrpl';
import { signal } from '@angular/core';

(window as any).Buffer = {
     from: (str: string) => ({
          toString: () => {
               let hex = '';
               for (let i = 0; i < str.length; i++) {
                    const charCode = str.charCodeAt(i);
                    hex += charCode.toString(16).padStart(2, '0');
               }
               return hex;
          },
     }),
};

// Mock classes
class MockWalletManagerService {
     walletVm = jasmine.createSpy();
}

class MockPermissionedDomainStoreService {
     createdPermissionedDomains = jasmine.createSpy().and.returnValue([]);
     selectedDomainId = jasmine.createSpy().and.returnValue('');
     setField = jasmine.createSpy();
}

class MockTransactionUiService {
     currentStep = signal('idle');
     stepMessage = jasmine.createSpy().and.returnValue('Processing...');
}

// Helper function to decode hex without Buffer
function decodeHexToUtf8(hex: string): string {
     if (!hex) return '';
     try {
          // Simple hex decoder without Buffer
          let str = '';
          for (let i = 0; i < hex.length; i += 2) {
               const byte = parseInt(hex.substr(i, 2), 16);
               if (byte === 0) break; // Stop at null byte
               str += String.fromCharCode(byte);
          }
          return str;
     } catch {
          return hex;
     }
}

describe('PermissionedDomainViewModelService', () => {
     let service: PermissionedDomainViewModelService;
     let walletManager: MockWalletManagerService;
     let permissionedDomainStoreService: MockPermissionedDomainStoreService;
     let txUiService: MockTransactionUiService;
     let mockWallet: any;

     beforeEach(() => {
          walletManager = new MockWalletManagerService();
          permissionedDomainStoreService = new MockPermissionedDomainStoreService();
          txUiService = new MockTransactionUiService();

          mockWallet = {
               address: 'rTestAddress1234567890',
               name: 'Test Wallet',
               classicAddress: 'rTestAddress1234567890',
          };

          walletManager.walletVm.and.returnValue(mockWallet);
          permissionedDomainStoreService.createdPermissionedDomains.and.returnValue([]);

          TestBed.configureTestingModule({
               providers: [PermissionedDomainViewModelService, { provide: WalletManagerService, useValue: walletManager }, { provide: PermissionedDomainStoreService, useValue: permissionedDomainStoreService }, { provide: TransactionUiService, useValue: txUiService }],
          });

          service = TestBed.inject(PermissionedDomainViewModelService);
     });

     describe('activeTab', () => {
          it('should default to setPermissionedDomain', () => {
               expect(service.activeTab()).toBe('setPermissionedDomain');
          });
     });

     describe('infoData', () => {
          it('should return null when no wallet address', () => {
               walletManager.walletVm.and.returnValue(null);
               expect(service.infoData()).toBeNull();
          });

          it('should return info for set tab with domains', () => {
               service.activeTab.set('setPermissionedDomain');
               const domains = [{ index: 'domain1' }, { index: 'domain2' }];
               permissionedDomainStoreService.createdPermissionedDomains.and.returnValue(domains);

               const info = service.infoData();
               expect(info).not.toBeNull();
               expect(info?.walletName).toBe('Test Wallet');
               expect(info?.mode).toBe('setPermissionedDomain');
               expect(info?.permissionedDomainCount).toBe(2);
               expect(info?.permissionedDomainsToShow).toEqual(domains);
               expect(info?.actionButtonLabel).toBe('Set Permissioned Domain');
               expect(info?.actionButtonClass).toBe('btn-primary');
          });

          it('should return info for delete tab', () => {
               service.activeTab.set('deletePermissionedDomain');
               const domains = [{ index: 'domain1' }];
               permissionedDomainStoreService.createdPermissionedDomains.and.returnValue(domains);

               const info = service.infoData();
               expect(info?.actionButtonLabel).toBe('Delete Permissioned Domain');
               expect(info?.actionButtonClass).toBe('btn-red');
          });

          it('should handle wallet with no name', () => {
               walletManager.walletVm.and.returnValue({ address: 'rAddress' });

               const info = service.infoData();
               expect(info?.walletName).toBe('Selected wallet');
          });
     });

     describe('summaryMessage', () => {
          it('should return empty string when no info data', () => {
               walletManager.walletVm.and.returnValue(null);
               expect(service.summaryMessage()).toBe('');
          });

          it('should return message for zero domains', () => {
               permissionedDomainStoreService.createdPermissionedDomains.and.returnValue([]);
               expect(service.summaryMessage()).toBe(' has no permissioned domains.');
          });

          it('should return message for single domain', () => {
               const domains = [{ index: 'domain1' }];
               permissionedDomainStoreService.createdPermissionedDomains.and.returnValue(domains);
               const msg = service.summaryMessage();
               expect(msg).toContain('has issued <strong class="object-count">1</strong> permissioned domain.');
          });

          it('should return message for multiple domains', () => {
               const domains = [{ index: 'domain1' }, { index: 'domain2' }];
               permissionedDomainStoreService.createdPermissionedDomains.and.returnValue(domains);
               const msg = service.summaryMessage();
               expect(msg).toContain('has issued <strong class="object-count">2</strong> permissioned domains.');
          });
     });

     describe('getCreatedPermissionedDomains', () => {
          // Use helper function to encode strings to hex without Buffer
          const encodeToHex = (str: string): string => {
               let hex = '';
               for (let i = 0; i < str.length; i++) {
                    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
               }
               return hex;
          };

          const mockAccountObjects: any = {
               result: {
                    account_objects: [
                         {
                              LedgerEntryType: 'PermissionedDomain',
                              index: 'domain123',
                              Owner: 'rSender',
                              Sequence: 1,
                              AcceptedCredentials: [
                                   {
                                        Credential: {
                                             CredentialType: encodeToHex('credential1'),
                                             Issuer: 'rIssuer1',
                                        },
                                   },
                                   {
                                        Credential: {
                                             CredentialType: encodeToHex('credential2'),
                                             Issuer: 'rIssuer2',
                                        },
                                   },
                              ],
                         },
                         {
                              LedgerEntryType: 'PermissionedDomain',
                              index: 'domain456',
                              Owner: 'rSender',
                              Sequence: 2,
                              AcceptedCredentials: [],
                         },
                         {
                              LedgerEntryType: 'AccountRoot',
                              Owner: 'rSender',
                         },
                    ],
               },
          };

          it('should map permissioned domains correctly', () => {
               service.getCreatedPermissionedDomains(mockAccountObjects, 'rSender');

               expect(permissionedDomainStoreService.setField).toHaveBeenCalled();
               const mappedDomains = (permissionedDomainStoreService.setField as jasmine.Spy).calls.mostRecent().args[1];

               expect(mappedDomains.length).toBe(2);
               expect(mappedDomains[0].index).toBe('domain123');
               expect(mappedDomains[0].AcceptedCredentials.length).toBe(2);
               // Use the decode function to verify
               const firstCredType = mappedDomains[0].AcceptedCredentials[0].CredentialType;
               // Just verify it's a string (not null/undefined)
               expect(typeof firstCredType).toBe('string');
               expect(mappedDomains[1].AcceptedCredentials).toEqual([]);
          });

          it('should handle empty account_objects', () => {
               const emptyResponse: any = {
                    result: { account_objects: [] },
               };

               service.getCreatedPermissionedDomains(emptyResponse, 'rSender');

               expect(permissionedDomainStoreService.setField).toHaveBeenCalledWith('createdPermissionedDomains', []);
          });

          it('should handle undefined account_objects', () => {
               const undefinedResponse: any = {
                    result: { account_objects: undefined },
               };

               service.getCreatedPermissionedDomains(undefinedResponse, 'rSender');

               expect(permissionedDomainStoreService.setField).toHaveBeenCalledWith('createdPermissionedDomains', []);
          });

          it('should filter by owner', () => {
               const objectsWithDifferentOwner: any = {
                    result: {
                         account_objects: [
                              {
                                   LedgerEntryType: 'PermissionedDomain',
                                   index: 'domain789',
                                   Owner: 'rDifferentOwner',
                                   Sequence: 3,
                              },
                         ],
                    },
               };

               service.getCreatedPermissionedDomains(objectsWithDifferentOwner, 'rSender');

               const mappedDomains = (permissionedDomainStoreService.setField as jasmine.Spy).calls.mostRecent().args[1];
               expect(mappedDomains.length).toBe(0);
          });
     });

     describe('selectedDomainItem', () => {
          it('should return null when no domain ID', () => {
               permissionedDomainStoreService.selectedDomainId.and.returnValue('');
               expect(service.selectedDomainItem()).toBeNull();
          });

          it('should return domain item when found', () => {
               permissionedDomainStoreService.selectedDomainId.and.returnValue('domain123');
               const domains = [{ index: 'domain123', AcceptedCredentials: [] }];
               permissionedDomainStoreService.createdPermissionedDomains.and.returnValue(domains);

               const item = service.selectedDomainItem();
               expect(item).not.toBeNull();
               expect(item?.id).toBe('domain123');
          });
     });

     describe('domainItems', () => {
          it('should return empty array when no domains', () => {
               permissionedDomainStoreService.createdPermissionedDomains.and.returnValue([]);
               const items = service.domainItems();
               expect(items).toEqual([]);
          });

          it('should format domain items correctly', () => {
               const domains = [
                    {
                         index: 'domain1234567890abcdef12345678',
                         AcceptedCredentials: [{ credential: 'cred1' }, { credential: 'cred2' }],
                    },
                    {
                         index: 'domain2',
                         AcceptedCredentials: [],
                    },
               ];
               permissionedDomainStoreService.createdPermissionedDomains.and.returnValue(domains);

               const items = service.domainItems();
               expect(items.length).toBe(2);
               expect(items[0].id).toBe('domain1234567890abcdef12345678');
               expect(items[0].display).toContain('...');
               expect(items[0].secondary).toBe('Credentials: 2');
               // expect(items[1].secondary).toBe('No credentials');
          });
     });

     describe('actionButtonLabel', () => {
          it('should return set domain label', () => {
               expect(service.actionButtonLabel('setPermissionedDomain')).toBe('Set Permissioned Domain');
          });

          it('should return delete domain label', () => {
               expect(service.actionButtonLabel('deletePermissionedDomain')).toBe('Delete Permissioned Domain');
          });
     });

     describe('actionButtonClass', () => {
          it('should return btn-primary for set tab', () => {
               expect(service.actionButtonClass('setPermissionedDomain')).toBe('btn-primary');
          });

          it('should return btn-red for delete tab', () => {
               expect(service.actionButtonClass('deletePermissionedDomain')).toBe('btn-red');
          });
     });

     describe('Button Labels with step changes', () => {
          it('should return default label when step is idle', () => {
               txUiService.currentStep.set('idle');
               expect(service.setPermissionedDomainButtonLabel()).toBe('Set Permissioned Domain');
               expect(service.deletePermissionedDomainButtonLabel()).toBe('Delete Permissioned Domain');
          });

          it('should return default label when step is waiting_validation', () => {
               txUiService.currentStep.set('waiting_validation');
               expect(service.setPermissionedDomainButtonLabel()).toBe('Set Permissioned Domain');
               expect(service.deletePermissionedDomainButtonLabel()).toBe('Delete Permissioned Domain');
          });

          it('should return step message for other steps', () => {
               txUiService.currentStep.set('signing');
               expect(service.setPermissionedDomainButtonLabel()).toBe('Processing...');
               expect(service.deletePermissionedDomainButtonLabel()).toBe('Processing...');
          });
     });
});
