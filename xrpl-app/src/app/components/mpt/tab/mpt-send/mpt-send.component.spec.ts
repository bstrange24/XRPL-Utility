import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MptSendComponent } from './mpt-send.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('MptSendComponent', () => {
     let component: MptSendComponent;
     let fixture: ComponentFixture<MptSendComponent>;

     // Services
     let mptStoreService: any;
     let viewModel: any;

     // Mock data
     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     const mockMptItems = [
          { id: 'mpt123', display: 'MPT • 1000 issued' },
          { id: 'mpt456', display: 'MPT • 500 held' },
     ];

     const mockSelectedDestinationItem = { id: 'rDest1', display: 'Destination 1' };

     beforeEach(async () => {
          mptStoreService = {
               mptIssuanceId: signal(''),
               amount: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          viewModel = {
               mptItems: jasmine.createSpy('mptItems').and.returnValue(mockMptItems),
               selectedMptItem: jasmine.createSpy('selectedMptItem').and.returnValue(mockMptItems[0]),
          };

          await TestBed.configureTestingModule({
               imports: [MptSendComponent],
               providers: [
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: MptTransactionViewModelService, useValue: viewModel },
               ],
          })
               .overrideComponent(MptSendComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(MptSendComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('destinationItems', mockDestinationItems);
          fixture.componentRef.setInput('selectedDestinationItem', mockSelectedDestinationItem);
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
          it('should accept destinationItems input', () => {
               expect(component.destinationItems()).toEqual(mockDestinationItems);
          });

          it('should accept selectedDestinationItem input', () => {
               expect(component.selectedDestinationItem()).toEqual(mockSelectedDestinationItem);
          });

          it('should accept mptItems input', () => {
               expect(component.mptItems()).toEqual(mockMptItems);
          });

          it('should update destinationItems when changed', () => {
               const newItems = [{ id: 'rNew', display: 'New' }];
               fixture.componentRef.setInput('destinationItems', newItems);
               fixture.detectChanges();
               expect(component.destinationItems()).toEqual(newItems);
          });

          it('should update mptItems when changed', () => {
               const newItems = [{ id: 'new', display: 'New MPT' }];
               fixture.componentRef.setInput('mptItems', newItems);
               fixture.detectChanges();
               expect(component.mptItems()).toEqual(newItems);
          });
     });

     describe('Output signals', () => {
          it('should have selectedDestinationAddress output', () => {
               expect(component.selectedDestinationAddress).toBeDefined();
               expect(component.selectedDestinationAddress.emit).toBeDefined();
          });

          it('should emit selectedDestinationAddress when called', () => {
               spyOn(component.selectedDestinationAddress, 'emit');
               const address = 'rTestAddress';
               component.selectedDestinationAddress.emit(address);
               expect(component.selectedDestinationAddress.emit).toHaveBeenCalledWith(address);
          });

          it('should have selectedMPT output', () => {
               expect(component.selectedMPT).toBeDefined();
               expect(component.selectedMPT.emit).toBeDefined();
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
     });

     describe('amount getter/setter', () => {
          it('should return amount from store', () => {
               mptStoreService.amount.set('1000');
               expect(component.amount).toBe('1000');
          });

          it('should set amount in store', () => {
               component.amount = '500';
               expect(mptStoreService.setField).toHaveBeenCalledWith('amount', '500');
          });
     });

     describe('onDestinationChange', () => {
          it('should emit selectedDestinationAddress with item id', () => {
               spyOn(component.selectedDestinationAddress, 'emit');
               const item = { id: 'rDest123', display: 'Destination' } as SelectItem;

               component.onDestinationChange(item);

               expect(component.selectedDestinationAddress.emit).toHaveBeenCalledWith('rDest123');
          });

          it('should emit empty string when item is null', () => {
               spyOn(component.selectedDestinationAddress, 'emit');

               component.onDestinationChange(null);

               expect(component.selectedDestinationAddress.emit).toHaveBeenCalledWith('');
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
     });

     // describe('ViewModel bindings', () => {
     //      it('should have mptItems available from viewModel', () => {
     //           const items = component.viewModel.mptItems();
     //           expect(items).toEqual(mockMptItems);
     //      });

     //      it('should have selectedMptItem available from viewModel', () => {
     //           const selected = component.viewModel.selectedMptItem();
     //           expect(selected).toEqual(mockMptItems[0]);
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
          it('should have destinationItems available for template', () => {
               expect(component.destinationItems()).toEqual(mockDestinationItems);
          });

          it('should have selectedDestinationItem available for template', () => {
               expect(component.selectedDestinationItem()).toEqual(mockSelectedDestinationItem);
          });

          // it('should have mptItems available for template via viewModel', () => {
          //      expect(component.viewModel.mptItems()).toEqual(mockMptItems);
          // });

          it('should have mptIssuanceId available for template', () => {
               expect(component.mptIssuanceId).toBeDefined();
          });

          it('should have amount available for template', () => {
               expect(component.amount).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty destinationItems', () => {
               fixture.componentRef.setInput('destinationItems', []);
               fixture.detectChanges();
               expect(component.destinationItems()).toEqual([]);
          });

          it('should handle empty mptItems', () => {
               fixture.componentRef.setInput('mptItems', []);
               fixture.detectChanges();
               expect(component.mptItems()).toEqual([]);
          });

          it('should handle null selectedDestinationItem', () => {
               fixture.componentRef.setInput('selectedDestinationItem', null);
               fixture.detectChanges();
               expect(component.selectedDestinationItem()).toBeNull();
          });

          it('should handle rapid amount changes', () => {
               component.amount = '100';
               component.amount = '200';
               component.amount = '300';

               expect(mptStoreService.setField).toHaveBeenCalledTimes(3);
               expect(mptStoreService.setField).toHaveBeenCalledWith('amount', '100');
               expect(mptStoreService.setField).toHaveBeenCalledWith('amount', '200');
               expect(mptStoreService.setField).toHaveBeenCalledWith('amount', '300');
          });

          it('should handle rapid issuance ID changes', () => {
               component.mptIssuanceId = 'id1';
               component.mptIssuanceId = 'id2';
               component.mptIssuanceId = 'id3';

               expect(mptStoreService.setField).toHaveBeenCalledTimes(3);
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id1');
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id2');
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id3');
          });

          it('should handle viewModel returning empty mptItems', () => {
               viewModel.mptItems.and.returnValue([]);
               const items = component.viewModel.mptItems();
               expect(items).toEqual([]);
          });
     });
});
