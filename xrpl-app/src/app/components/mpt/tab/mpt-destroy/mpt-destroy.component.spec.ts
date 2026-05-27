import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MptDestroyComponent } from './mpt-destroy.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('MptDestroyComponent', () => {
     let component: MptDestroyComponent;
     let fixture: ComponentFixture<MptDestroyComponent>;

     // Services
     let mptStoreService: any;
     let viewModel: any;

     // Mock data
     const mockMptItems = [
          { id: 'mpt123', display: 'MPT • 1000 issued' },
          { id: 'mpt456', display: 'MPT • 500 held' },
          { id: 'mpt789', display: 'MPT • 0 issued' },
     ];

     beforeEach(async () => {
          mptStoreService = {
               mptIssuanceId: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          viewModel = {
               mptItems: jasmine.createSpy('mptItems').and.returnValue(mockMptItems),
               selectedMptItem: jasmine.createSpy('selectedMptItem').and.returnValue(mockMptItems[0]),
          };

          await TestBed.configureTestingModule({
               imports: [MptDestroyComponent],
               providers: [
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: MptTransactionViewModelService, useValue: viewModel },
               ],
          })
               .overrideComponent(MptDestroyComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(MptDestroyComponent);
          component = fixture.componentInstance;

          // Set required input
          fixture.componentRef.setInput('mptItems', mockMptItems);

          fixture.detectChanges();
     });

     afterEach(() => {
          mptStoreService.setField.calls.reset();
          viewModel.mptItems.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept mptItems input', () => {
               expect(component.mptItems()).toEqual(mockMptItems);
          });

          it('should update mptItems when changed', () => {
               const newItems = [{ id: 'new1', display: 'New MPT' }];
               fixture.componentRef.setInput('mptItems', newItems);
               fixture.detectChanges();
               expect(component.mptItems()).toEqual(newItems);
          });

          it('should handle empty mptItems array', () => {
               fixture.componentRef.setInput('mptItems', []);
               fixture.detectChanges();
               expect(component.mptItems()).toEqual([]);
          });
     });

     describe('Output signals', () => {
          it('should have selectedMPT output', () => {
               expect(component.selectedMPT).toBeDefined();
               expect(component.selectedMPT.emit).toBeDefined();
          });

          it('should emit selectedMPT when called', () => {
               spyOn(component.selectedMPT, 'emit');
               const item = { id: 'mpt123', display: 'MPT 1' } as SelectItem;
               component.selectedMPT.emit(item);
               expect(component.selectedMPT.emit).toHaveBeenCalledWith(item);
          });

          it('should emit null when called with null', () => {
               spyOn(component.selectedMPT, 'emit');
               component.selectedMPT.emit(null);
               expect(component.selectedMPT.emit).toHaveBeenCalledWith(null);
          });
     });

     describe('mptIssuanceId getter/setter', () => {
          it('should return mptIssuanceId from store', () => {
               mptStoreService.mptIssuanceId.set('test123');
               expect(component.mptIssuanceId).toBe('test123');
          });

          it('should set mptIssuanceId in store', () => {
               component.mptIssuanceId = 'newId123';
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'newId123');
          });

          it('should handle empty string', () => {
               component.mptIssuanceId = '';
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', '');
          });
     });

     describe('onMptSelection', () => {
          it('should emit selectedMPT with the item', () => {
               spyOn(component.selectedMPT, 'emit');
               const item = { id: 'mpt123', display: 'MPT 1' } as SelectItem;

               component.onMptSelection(item);

               expect(component.selectedMPT.emit).toHaveBeenCalledWith(item);
          });

          it('should emit null when item is null', () => {
               spyOn(component.selectedMPT, 'emit');

               component.onMptSelection(null);

               expect(component.selectedMPT.emit).toHaveBeenCalledWith(null);
          });

          it('should handle item without id', () => {
               spyOn(component.selectedMPT, 'emit');
               const item = { display: 'MPT' } as SelectItem;

               component.onMptSelection(item);

               expect(component.selectedMPT.emit).toHaveBeenCalledWith(item);
          });
     });

     // describe('ViewModel bindings', () => {
     //      it('should have mptItems available from viewModel', () => {
     //           const items = component.viewModel.mptItems();
     //           expect(items).toEqual(mockMptItems);
     //           expect(viewModel.mptItems).toHaveBeenCalled();
     //      });

     //      it('should have selectedMptItem available from viewModel', () => {
     //           const selected = component.viewModel.selectedMptItem();
     //           expect(selected).toEqual(mockMptItems[0]);
     //           expect(viewModel.selectedMptItem).toHaveBeenCalled();
     //      });
     // });

     describe('Service injections', () => {
          it('should have mptStoreService injected', () => {
               expect(component.mptStoreService).toBe(mptStoreService);
          });

          it('should have viewModel injected', () => {
               expect(component.viewModel).toBe(viewModel);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          // it('should have mptItems available for template via viewModel', () => {
          //      expect(component.viewModel.mptItems()).toEqual(mockMptItems);
          // });

          it('should have mptIssuanceId available for template', () => {
               expect(component.mptIssuanceId).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle rapid issuance ID changes', () => {
               component.mptIssuanceId = 'id1';
               component.mptIssuanceId = 'id2';
               component.mptIssuanceId = 'id3';

               expect(mptStoreService.setField).toHaveBeenCalledTimes(3);
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id1');
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id2');
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id3');
          });

          it('should handle rapid MPT selection changes', () => {
               spyOn(component.selectedMPT, 'emit');

               const item1 = { id: 'mpt1', display: 'MPT 1' } as SelectItem;
               const item2 = { id: 'mpt2', display: 'MPT 2' } as SelectItem;

               component.onMptSelection(item1);
               component.onMptSelection(item2);
               component.onMptSelection(null);

               expect(component.selectedMPT.emit).toHaveBeenCalledTimes(3);
               expect(component.selectedMPT.emit).toHaveBeenCalledWith(item1);
               expect(component.selectedMPT.emit).toHaveBeenCalledWith(item2);
               expect(component.selectedMPT.emit).toHaveBeenCalledWith(null);
          });

          it('should handle viewModel returning empty mptItems', () => {
               viewModel.mptItems.and.returnValue([]);
               const items = component.viewModel.mptItems();
               expect(items).toEqual([]);
          });

          it('should handle viewModel selectedMptItem returning null', () => {
               viewModel.selectedMptItem.and.returnValue(null);
               const selected = component.viewModel.selectedMptItem();
               expect(selected).toBeNull();
          });
     });
});
