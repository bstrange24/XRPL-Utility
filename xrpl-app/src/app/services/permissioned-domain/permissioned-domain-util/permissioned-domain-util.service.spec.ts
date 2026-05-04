import { TestBed } from '@angular/core/testing';
import { PermissionedDomainUtilService } from './permissioned-domain-util.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { PermissionedDomainStoreService } from '../permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainViewModelService } from '../permissioned-domain-view-model/permissioned-domain-view-model.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { signal, WritableSignal } from '@angular/core';

describe('PermissionedDomainUtilService', () => {
     let service: PermissionedDomainUtilService;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;
     let mockWalletManagerService: jasmine.SpyObj<WalletManagerService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockDownloadUtilService: jasmine.SpyObj<DownloadUtilService>;
     let mockCopyUtilService: jasmine.SpyObj<CopyUtilService>;
     let mockToastService: jasmine.SpyObj<ToastService>;
     let mockPermissionedDomainStoreService: any;
     let mockPermissionedDomainViewModelService: jasmine.SpyObj<PermissionedDomainViewModelService>;
     let mockXrplTxOptionsStore: any;

     let isSimulateEnabledSignal: WritableSignal<boolean>;

     beforeEach(() => {
          isSimulateEnabledSignal = signal<boolean>(false);

          mockUtilsService = jasmine.createSpyObj('UtilsService', ['someMethod']);
          mockWalletManagerService = jasmine.createSpyObj('WalletManagerService', ['someMethod']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['clearAllOptionsAndMessages', 'clearAllFields']);
          mockDownloadUtilService = jasmine.createSpyObj('DownloadUtilService', ['someMethod']);
          mockCopyUtilService = jasmine.createSpyObj('CopyUtilService', ['someMethod']);
          mockToastService = jasmine.createSpyObj('ToastService', ['someMethod']);

          // Create proper mock for PermissionedDomainStoreService with methods
          mockPermissionedDomainStoreService = {
               setField: jasmine.createSpy('setField'),
               resetDomainFields: jasmine.createSpy('resetDomainFields'),
               updateField: jasmine.createSpy('updateField'),
               resetAll: jasmine.createSpy('resetAll'),
               getAll: jasmine.createSpy('getAll'),
          };

          mockPermissionedDomainViewModelService = jasmine.createSpyObj('PermissionedDomainViewModelService', ['someMethod']);

          // Create proper mock for XrplTxOptionsStore with readonly signal
          mockXrplTxOptionsStore = {
               isSimulateEnabled: isSimulateEnabledSignal.asReadonly(),
          };

          TestBed.configureTestingModule({
               providers: [
                    PermissionedDomainUtilService,
                    { provide: UtilsService, useValue: mockUtilsService },
                    { provide: WalletManagerService, useValue: mockWalletManagerService },
                    { provide: TransactionUiService, useValue: mockTxUiService },
                    { provide: DownloadUtilService, useValue: mockDownloadUtilService },
                    { provide: CopyUtilService, useValue: mockCopyUtilService },
                    { provide: ToastService, useValue: mockToastService },
                    { provide: PermissionedDomainStoreService, useValue: mockPermissionedDomainStoreService },
                    { provide: PermissionedDomainViewModelService, useValue: mockPermissionedDomainViewModelService },
                    { provide: XrplTxOptionsStore, useValue: mockXrplTxOptionsStore },
               ],
          });

          service = TestBed.inject(PermissionedDomainUtilService);
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should initialize acceptedCredentials as empty array', () => {
               expect(service.acceptedCredentials()).toEqual([]);
          });
     });

     describe('addCredential', () => {
          it('should add credential to the list', () => {
               service.addCredential('rIssuer1', 'credentialType1');

               expect(service.acceptedCredentials().length).toBe(1);
               expect(service.acceptedCredentials()[0]).toEqual({
                    issuer: 'rIssuer1',
                    credentialType: 'credentialType1',
               });
          });

          it('should add multiple credentials', () => {
               service.addCredential('rIssuer1', 'type1');
               service.addCredential('rIssuer2', 'type2');
               service.addCredential('rIssuer3', 'type3');

               expect(service.acceptedCredentials().length).toBe(3);
          });

          it('should preserve existing credentials when adding new one', () => {
               service.addCredential('rIssuer1', 'type1');
               service.addCredential('rIssuer2', 'type2');

               const credentials = service.acceptedCredentials();
               expect(credentials[0].issuer).toBe('rIssuer1');
               expect(credentials[1].issuer).toBe('rIssuer2');
          });
     });

     describe('removeCredential', () => {
          beforeEach(() => {
               service.addCredential('rIssuer1', 'type1');
               service.addCredential('rIssuer2', 'type2');
               service.addCredential('rIssuer3', 'type3');
          });

          it('should remove credential at specified index', () => {
               service.removeCredential(1);

               const credentials = service.acceptedCredentials();
               expect(credentials.length).toBe(2);
               expect(credentials[0].issuer).toBe('rIssuer1');
               expect(credentials[1].issuer).toBe('rIssuer3');
          });

          it('should remove first credential', () => {
               service.removeCredential(0);

               const credentials = service.acceptedCredentials();
               expect(credentials.length).toBe(2);
               expect(credentials[0].issuer).toBe('rIssuer2');
          });

          it('should remove last credential', () => {
               service.removeCredential(2);

               const credentials = service.acceptedCredentials();
               expect(credentials.length).toBe(2);
               expect(credentials[0].issuer).toBe('rIssuer1');
               expect(credentials[1].issuer).toBe('rIssuer2');
          });

          it('should handle invalid index gracefully', () => {
               service.removeCredential(99);

               expect(service.acceptedCredentials().length).toBe(3);
          });
     });

     describe('resetCredentials', () => {
          it('should clear all credentials', () => {
               service.addCredential('rIssuer1', 'type1');
               service.addCredential('rIssuer2', 'type2');

               expect(service.acceptedCredentials().length).toBe(2);

               service.resetCredentials();

               expect(service.acceptedCredentials()).toEqual([]);
          });

          it('should handle reset when already empty', () => {
               service.resetCredentials();
               expect(service.acceptedCredentials()).toEqual([]);
          });
     });

     describe('onDomainSelected', () => {
          it('should set selectedDomainId when item is provided', () => {
               const item: SelectItem = { id: 'domain123', display: 'Domain 123' };

               service.onDomainSelected(item);

               expect(mockPermissionedDomainStoreService.setField).toHaveBeenCalledWith('selectedDomainId', 'domain123');
          });

          it('should set empty string when item is null', () => {
               service.onDomainSelected(null);

               expect(mockPermissionedDomainStoreService.setField).toHaveBeenCalledWith('selectedDomainId', '');
          });

          it('should handle item with undefined id', () => {
               const item: SelectItem = { id: undefined as any, display: 'No ID' };

               service.onDomainSelected(item);

               expect(mockPermissionedDomainStoreService.setField).toHaveBeenCalledWith('selectedDomainId', '');
          });
     });

     describe('onCredentialIdInput', () => {
          it('should set credentialIdSearchQuery from input event', () => {
               const mockEvent = {
                    target: { value: 'test-credential-id' },
               } as any;

               service.onCredentialIdInput(mockEvent);

               expect(mockPermissionedDomainStoreService.setField).toHaveBeenCalledWith('credentialIdSearchQuery', 'test-credential-id');
          });

          it('should handle empty value', () => {
               const mockEvent = {
                    target: { value: '' },
               } as any;

               service.onCredentialIdInput(mockEvent);

               expect(mockPermissionedDomainStoreService.setField).toHaveBeenCalledWith('credentialIdSearchQuery', '');
          });
     });

     describe('setCredentialType', () => {
          it('should set credential type in store', () => {
               service.setCredentialType('test-credential-type');

               expect(mockPermissionedDomainStoreService.setField).toHaveBeenCalledWith('credentialType', 'test-credential-type');
          });

          it('should handle empty string', () => {
               service.setCredentialType('');

               expect(mockPermissionedDomainStoreService.setField).toHaveBeenCalledWith('credentialType', '');
          });
     });

     describe('clearFields', () => {
          it('should clear all options and messages and reset domain fields', () => {
               service.clearFields();

               expect(mockTxUiService.clearAllOptionsAndMessages).toHaveBeenCalled();
               expect(mockPermissionedDomainStoreService.resetDomainFields).toHaveBeenCalled();
          });
     });

     describe('clearInputFields', () => {
          it('should clear fields when simulation is not enabled', () => {
               isSimulateEnabledSignal.set(false);

               service.clearInputFields();

               expect(mockTxUiService.clearAllFields).toHaveBeenCalled();
               expect(mockPermissionedDomainStoreService.resetDomainFields).toHaveBeenCalled();
          });

          it('should not clear fields when simulation is enabled', () => {
               isSimulateEnabledSignal.set(true);

               service.clearInputFields();

               expect(mockTxUiService.clearAllFields).not.toHaveBeenCalled();
               expect(mockPermissionedDomainStoreService.resetDomainFields).not.toHaveBeenCalled();
          });
     });
});
