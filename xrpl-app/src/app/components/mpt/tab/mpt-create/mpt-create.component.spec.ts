import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MptCreateComponent } from './mpt-create.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { JsonEditorComponent } from '../../../shared/json-editor/json-editor.component';

describe('MptCreateComponent', () => {
     let component: MptCreateComponent;
     let fixture: ComponentFixture<MptCreateComponent>;

     // Services
     let mptStoreService: any;
     let viewModel: any;
     let mptUtil: any;

     // Mock JsonEditor
     let mockJsonEditor: jasmine.SpyObj<JsonEditorComponent>;

     beforeEach(async () => {
          mockJsonEditor = jasmine.createSpyObj('JsonEditorComponent', ['format']);

          mptStoreService = {
               assetScale: signal(0),
               tokenCount: signal(0),
               transferFee: signal(0),
               metaData: signal('{}'),
               setField: jasmine.createSpy('setField'),
          };

          viewModel = {
               metadataByteLength: jasmine.createSpy('metadataByteLength').and.returnValue(0),
          };

          mptUtil = {};

          await TestBed.configureTestingModule({
               imports: [MptCreateComponent],
               providers: [
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: MptTransactionViewModelService, useValue: viewModel },
                    { provide: MptUtilService, useValue: mptUtil },
               ],
          })
               .overrideComponent(MptCreateComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(MptCreateComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('metadataByteLength', 0);
          fixture.componentRef.setInput('metadataIsValid', true);

          fixture.detectChanges();
     });

     afterEach(() => {
          mptStoreService.setField.calls.reset();
          viewModel.metadataByteLength.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept metadataByteLength input', () => {
               expect(component.metadataByteLength()).toBe(0);
          });

          it('should accept metadataIsValid input', () => {
               expect(component.metadataIsValid()).toBeTrue();
          });

          it('should update metadataByteLength when changed', () => {
               fixture.componentRef.setInput('metadataByteLength', 512);
               fixture.detectChanges();
               expect(component.metadataByteLength()).toBe(512);
          });

          it('should update metadataIsValid when changed', () => {
               fixture.componentRef.setInput('metadataIsValid', false);
               fixture.detectChanges();
               expect(component.metadataIsValid()).toBeFalse();
          });
     });

     describe('assetScale getter/setter', () => {
          it('should return assetScale from store', () => {
               mptStoreService.assetScale.set(5);
               expect(component.assetScale).toBe(5);
          });

          it('should set assetScale in store', () => {
               component.assetScale = 10;
               expect(mptStoreService.setField).toHaveBeenCalledWith('assetScale', 10);
          });
     });

     describe('tokenCount getter/setter', () => {
          it('should return tokenCount from store', () => {
               mptStoreService.tokenCount.set(1000);
               expect(component.tokenCount).toBe(1000);
          });

          it('should set tokenCount in store', () => {
               component.tokenCount = 5000;
               expect(mptStoreService.setField).toHaveBeenCalledWith('tokenCount', 5000);
          });
     });

     describe('transferFee getter/setter', () => {
          it('should return transferFee from store', () => {
               mptStoreService.transferFee.set(500);
               expect(component.transferFee).toBe(500);
          });

          it('should set transferFee in store', () => {
               component.transferFee = 1000;
               expect(mptStoreService.setField).toHaveBeenCalledWith('transferFee', 1000);
          });
     });

     describe('metaData getter/setter', () => {
          it('should return metaData from store', () => {
               const testMeta = '{"test": "value"}';
               mptStoreService.metaData.set(testMeta);
               expect(component.metaData).toBe(testMeta);
          });

          it('should set metaData in store', () => {
               const newMeta = '{"new": "data"}';
               component.metaData = newMeta;
               expect(mptStoreService.setField).toHaveBeenCalledWith('metaData', newMeta);
          });
     });

     describe('formatJson', () => {
          it('should call format on jsonEditor when jsonEditor exists', () => {
               (component as any).jsonEditor = mockJsonEditor;

               component.formatJson();

               expect(mockJsonEditor.format).toHaveBeenCalled();
          });

          it('should not throw error when jsonEditor is undefined', () => {
               (component as any).jsonEditor = undefined;

               expect(() => component.formatJson()).not.toThrow();
          });
     });

     describe('onMetadataChanged', () => {
          it('should set trimmed metadata in store', () => {
               const newMetadata = '  {"test": "value"}  ';
               component.onMetadataChanged(newMetadata);

               expect(mptStoreService.setField).toHaveBeenCalledWith('metaData', '{"test": "value"}');
          });

          it('should handle empty string', () => {
               component.onMetadataChanged('');

               expect(mptStoreService.setField).toHaveBeenCalledWith('metaData', '');
          });

          it('should handle string with only spaces', () => {
               component.onMetadataChanged('   ');

               expect(mptStoreService.setField).toHaveBeenCalledWith('metaData', '');
          });
     });

     describe('Service injections', () => {
          it('should have mptStoreService injected', () => {
               expect(component.mptStoreService).toBe(mptStoreService);
          });

          it('should have viewModel injected', () => {
               expect(component.viewModel).toBe(viewModel);
          });

          it('should have mptUtil injected', () => {
               expect(component.mptUtil).toBe(mptUtil);
          });
     });

     describe('ViewModel bindings', () => {
          it('should have metadataByteLength available from viewModel', () => {
               viewModel.metadataByteLength.and.returnValue(256);
               const length = component.viewModel.metadataByteLength();
               expect(length).toBe(256);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have assetScale available for template', () => {
               expect(component.assetScale).toBeDefined();
          });

          it('should have tokenCount available for template', () => {
               expect(component.tokenCount).toBeDefined();
          });

          it('should have transferFee available for template', () => {
               expect(component.transferFee).toBeDefined();
          });

          it('should have metaData available for template', () => {
               expect(component.metaData).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle assetScale at min value (0)', () => {
               component.assetScale = 0;
               expect(mptStoreService.setField).toHaveBeenCalledWith('assetScale', 0);
          });

          it('should handle assetScale at max value (15)', () => {
               component.assetScale = 15;
               expect(mptStoreService.setField).toHaveBeenCalledWith('assetScale', 15);
          });

          it('should handle tokenCount at minimum (1)', () => {
               component.tokenCount = 1;
               expect(mptStoreService.setField).toHaveBeenCalledWith('tokenCount', 1);
          });

          it('should handle tokenCount as zero', () => {
               component.tokenCount = 0;
               expect(mptStoreService.setField).toHaveBeenCalledWith('tokenCount', 0);
          });

          it('should handle transferFee at min (0)', () => {
               component.transferFee = 0;
               expect(mptStoreService.setField).toHaveBeenCalledWith('transferFee', 0);
          });

          it('should handle transferFee at max (50000)', () => {
               component.transferFee = 50000;
               expect(mptStoreService.setField).toHaveBeenCalledWith('transferFee', 50000);
          });

          it('should handle rapid sequential property changes', () => {
               component.assetScale = 2;
               component.tokenCount = 100;
               component.transferFee = 250;
               component.metaData = '{"test":1}';

               expect(mptStoreService.setField).toHaveBeenCalledTimes(4);
          });

          it('should handle ViewChild reference after view init', () => {
               // Simulate ViewChild being set after view init
               (component as any).jsonEditor = mockJsonEditor;

               component.formatJson();

               expect(mockJsonEditor.format).toHaveBeenCalled();
          });
     });
});
