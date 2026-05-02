import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { DidViewModelService } from './did-view-model.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { DidStoreService } from '../did-store/did-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { DidUtilService } from '../did-util/did-util.service';
import { JsonEditorComponent } from '../../../components/shared/json-editor/json-editor.component';
import * as xrpl from 'xrpl';

describe('DidViewModelService', () => {
     let service: DidViewModelService;
     let walletManagerMock: any;
     let didStoreMock: any;
     let utilsServiceMock: any;
     let didUtilServiceMock: any;

     const mockWallet = {
          address: 'rTestWallet',
          name: 'Test Wallet',
     };

     const mockExistingDid = [
          { id: 'did1', data: 'test' },
          { id: 'did2', data: 'test2' },
     ];

     beforeEach(() => {
          walletManagerMock = {
               walletVm: computed(() => mockWallet),
          };

          didStoreMock = {
               existingDid: signal(mockExistingDid),
               didData: signal(''),
               uriData: signal(''),
               didDocumentData: signal(''),
          };

          utilsServiceMock = {};

          didUtilServiceMock = {
               validateAndConvertDidJson: jasmine.createSpy('validateAndConvertDidJson').and.returnValue({ success: true }),
          };

          TestBed.configureTestingModule({
               providers: [DidViewModelService, { provide: WalletManagerService, useValue: walletManagerMock }, { provide: DidStoreService, useValue: didStoreMock }, { provide: UtilsService, useValue: utilsServiceMock }, { provide: DidUtilService, useValue: didUtilServiceMock }],
          });

          service = TestBed.inject(DidViewModelService);
     });

     it('should create', () => {
          expect(service).toBeTruthy();
     });

     describe('activeTab', () => {
          it('should default to setDid', () => {
               expect(service.activeTab()).toBe('setDid');
          });

          it('should be settable', () => {
               service.activeTab.set('deleteDid');
               expect(service.activeTab()).toBe('deleteDid');
          });
     });

     // describe('currentWallet', () => {
     //      it('should return current wallet', () => {
     //           expect(service.currentWallet()).toEqual(mockWallet);
     //      });
     // });

     describe('infoData', () => {
          it('should return null when no wallet address', () => {
               walletManagerMock.walletVm = computed(() => ({ address: null }));
               expect(service.infoData()).toBeNull();
          });

          it('should return info data', () => {
               const info = service.infoData();
               expect(info?.walletName).toBe('Test Wallet');
               expect(info?.mode).toBe('setDid');
               expect(info?.didCount).toBe(2);
               expect(info?.existingDid).toEqual(mockExistingDid);
          });
     });

     describe('actionButtonLabel', () => {
          it('should return "Set DID" for setDid tab', () => {
               service.activeTab.set('setDid');
               expect(service.actionButtonLabel()).toBe('Set DID');
          });

          it('should return "Delete DID" for deleteDid tab', () => {
               service.activeTab.set('deleteDid');
               expect(service.actionButtonLabel()).toBe('Delete DID');
          });
     });

     describe('actionButtonClass', () => {
          it('should return "btn-primary-blue" for setDid tab', () => {
               service.activeTab.set('setDid');
               expect(service.actionButtonClass()).toBe('btn-primary-blue');
          });

          it('should return "btn-primary-red" for deleteDid tab', () => {
               service.activeTab.set('deleteDid');
               expect(service.actionButtonClass()).toBe('btn-primary-red');
          });
     });

     describe('didDataByteLength', () => {
          it('should return 0 for empty string', () => {
               didStoreMock.didData.set('');
               expect(service.didDataByteLength()).toBe(0);
          });

          it('should calculate byte length from hex conversion', () => {
               didStoreMock.didData.set('test');
               // 'test' in hex is '74657374' (8 chars) -> 4 bytes
               expect(service.didDataByteLength()).toBe(4);
          });

          // it('should handle invalid JSON conversion', () => {
          //      spyOn(xrpl, 'convertStringToHex').and.throwError('Invalid');
          //      didStoreMock.didData.set('test');
          //      expect(service.didDataByteLength()).toBe(0);
          // });
     });

     describe('uriDataByteLength', () => {
          it('should return 0 for empty string', () => {
               didStoreMock.uriData.set('');
               expect(service.uriDataByteLength()).toBe(0);
          });

          it('should calculate byte length from hex conversion', () => {
               didStoreMock.uriData.set('test');
               expect(service.uriDataByteLength()).toBe(4);
          });
     });

     describe('didDocumentDataByteLength', () => {
          it('should return 0 for empty string', () => {
               didStoreMock.didDocumentData.set('');
               expect(service.didDocumentDataByteLength()).toBe(0);
          });

          it('should calculate byte length from hex conversion', () => {
               didStoreMock.didDocumentData.set('test');
               expect(service.didDocumentDataByteLength()).toBe(4);
          });
     });

     describe('Validation flags', () => {
          it('didDataIsValid should return true when byte length <= 256', () => {
               didStoreMock.didData.set('test');
               expect(service.didDataIsValid()).toBeTrue();
          });

          it('didDataIsValid should return false when byte length > 256', () => {
               const longString = 'a'.repeat(300);
               didStoreMock.didData.set(longString);
               expect(service.didDataIsValid()).toBeFalse();
          });

          it('uriDataIsValid should return true when byte length <= 256', () => {
               didStoreMock.uriData.set('test');
               expect(service.uriDataIsValid()).toBeTrue();
          });

          it('didDocumentDataIsValid should return true when byte length <= 256', () => {
               didStoreMock.didDocumentData.set('test');
               expect(service.didDocumentDataIsValid()).toBeTrue();
          });
     });

     describe('hasJsonSyntaxError', () => {
          it('should return false when no editor', () => {
               expect(service.hasJsonSyntaxError()).toBeFalse();
          });

          it('should return false when editor has no error', () => {
               const mockEditor = {
                    jsonError: jasmine.createSpy('jsonError').and.returnValue(''),
               } as any;
               service.setDidDataEditor(mockEditor);
               expect(service.hasJsonSyntaxError()).toBeFalse();
          });

          it('should return true when editor has error', () => {
               const mockEditor = {
                    jsonError: jasmine.createSpy('jsonError').and.returnValue('Invalid JSON'),
               } as any;
               service.setDidDataEditor(mockEditor);
               expect(service.hasJsonSyntaxError()).toBeTrue();
          });
     });

     describe('validDidSchema', () => {
          it('should return false when didData is empty', () => {
               didStoreMock.didData.set('');
               expect(service.validDidSchema()).toBeFalse();
          });

          it('should return false when has syntax error', () => {
               const mockEditor = {
                    jsonError: jasmine.createSpy('jsonError').and.returnValue('Invalid JSON'),
               } as any;
               service.setDidDataEditor(mockEditor);
               didStoreMock.didData.set('{"test":"value"}');
               expect(service.validDidSchema()).toBeFalse();
          });

          it('should return true when didData is valid', () => {
               didStoreMock.didData.set('{"did":"did:example:123"}');
               didUtilServiceMock.validateAndConvertDidJson.and.returnValue({ success: true });
               expect(service.validDidSchema()).toBeTrue();
          });
     });

     describe('allFieldsValid', () => {
          it('should return true when all fields are valid', () => {
               didStoreMock.didData.set('test');
               didStoreMock.uriData.set('test');
               didStoreMock.didDocumentData.set('test');
               expect(service.allFieldsValid()).toBeTrue();
          });

          it('should return false when didDocumentData is invalid', () => {
               const longString = 'a'.repeat(300);
               didStoreMock.didData.set('test');
               didStoreMock.uriData.set('test');
               didStoreMock.didDocumentData.set(longString);
               expect(service.allFieldsValid()).toBeFalse();
          });
     });

     describe('setDidDataEditor', () => {
          it('should set the editor', () => {
               const mockEditor = {} as JsonEditorComponent;
               service.setDidDataEditor(mockEditor);
               expect((service as any).didDataEditor()).toBe(mockEditor);
          });
     });
});
