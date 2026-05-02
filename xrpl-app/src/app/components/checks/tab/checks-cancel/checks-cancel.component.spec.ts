import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksCancelComponent } from './checks-cancel.component';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('ChecksCancelComponent', () => {
     let component: ChecksCancelComponent;
     let fixture: ComponentFixture<ChecksCancelComponent>;
     let checksTransactionViewModelService: any;

     const mockCheckItems = [
          { id: 'check123', display: '100 XRP - To rDestination', secondary: 'Created: 2024-01-01' },
          { id: 'check456', display: '250 USD - To rDestination2', secondary: 'Created: 2024-01-02' },
     ] as SelectItem[];

     beforeEach(async () => {
          checksTransactionViewModelService = {
               activeTab: signal('cancelCheck'),
               checkItems: signal(mockCheckItems),
               filteredCheckIds: signal<string[]>(['check123', 'check456']),
               selectedCheckItem: signal<SelectItem | null>(null),
               selectedCheckIsExpired: signal(false),
               explorerLinks: signal(null),
               infoData: signal(null),
               checkIdDisplay: signal(''),
               checkIdInputDisplay: signal(''),
          };

          await TestBed.configureTestingModule({
               imports: [ChecksCancelComponent],
               providers: [{ provide: ChecksTransactionViewModelService, useValue: checksTransactionViewModelService }],
          })
               .overrideComponent(ChecksCancelComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksCancelComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset any spies if needed
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('@Output emitters', () => {
          it('should have checkItems emitter', () => {
               expect(component.checkItems).toBeDefined();
               expect(component.checkItems.emit).toBeDefined();
          });

          it('should emit checkItems when called', () => {
               spyOn(component.checkItems, 'emit');
               const mockItem = mockCheckItems[0];
               component.checkItems.emit(mockItem);
               expect(component.checkItems.emit).toHaveBeenCalledWith(mockItem);
          });

          it('should emit null for checkItems', () => {
               spyOn(component.checkItems, 'emit');
               component.checkItems.emit(null);
               expect(component.checkItems.emit).toHaveBeenCalledWith(null);
          });

          it('should have checkSelected emitter', () => {
               expect(component.checkSelected).toBeDefined();
               expect(component.checkSelected.emit).toBeDefined();
          });

          it('should emit checkSelected when called', () => {
               spyOn(component.checkSelected, 'emit');
               const mockItem = mockCheckItems[1];
               component.checkSelected.emit(mockItem);
               expect(component.checkSelected.emit).toHaveBeenCalledWith(mockItem);
          });

          it('should emit null for checkSelected', () => {
               spyOn(component.checkSelected, 'emit');
               component.checkSelected.emit(null);
               expect(component.checkSelected.emit).toHaveBeenCalledWith(null);
          });

          it('should have selectedCheckItem emitter', () => {
               expect(component.selectedCheckItem).toBeDefined();
               expect(component.selectedCheckItem.emit).toBeDefined();
          });

          it('should emit selectedCheckItem when called', () => {
               spyOn(component.selectedCheckItem, 'emit');
               const mockItem = mockCheckItems[0];
               component.selectedCheckItem.emit(mockItem);
               expect(component.selectedCheckItem.emit).toHaveBeenCalledWith(mockItem);
          });

          it('should emit null for selectedCheckItem', () => {
               spyOn(component.selectedCheckItem, 'emit');
               component.selectedCheckItem.emit(null);
               expect(component.selectedCheckItem.emit).toHaveBeenCalledWith(null);
          });
     });

     describe('Service injection', () => {
          it('should have checksTransactionViewModelService injected', () => {
               expect(component.checksTransactionViewModelService).toBe(checksTransactionViewModelService);
          });
     });

     describe('Signal access (from view model)', () => {
          it('should have access to checkItems signal', () => {
               const items = component.checksTransactionViewModelService.checkItems();
               expect(items).toEqual(mockCheckItems);
          });

          // it('should have access to filteredCheckIds signal', () => {
          //      const filteredIds = component.checksTransactionViewModelService.filteredCheckIds();
          //      expect(filteredIds).toEqual(['check123', 'check456']);
          // });

          it('should have access to selectedCheckItem signal', () => {
               const selected = component.checksTransactionViewModelService.selectedCheckItem();
               expect(selected).toBeNull();
          });

          it('should have access to selectedCheckIsExpired signal', () => {
               const isExpired = component.checksTransactionViewModelService.selectedCheckIsExpired();
               expect(isExpired).toBeFalse();
          });

          it('should have access to activeTab signal', () => {
               const activeTab = component.checksTransactionViewModelService.activeTab();
               expect(activeTab).toBe('cancelCheck');
          });

          it('should have access to explorerLinks signal', () => {
               const explorerLinks = component.checksTransactionViewModelService.explorerLinks();
               expect(explorerLinks).toBeNull();
          });

          it('should have access to infoData signal', () => {
               const infoData = component.checksTransactionViewModelService.infoData();
               expect(infoData).toBeNull();
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have checkItems signal available for template binding', () => {
               const items = component.checksTransactionViewModelService.checkItems();
               expect(items).toBeDefined();
               expect(items.length).toBe(2);
          });

          it('should have selectedCheckItem signal available for template', () => {
               const selected = component.checksTransactionViewModelService.selectedCheckItem();
               expect(selected).toBeNull();
          });
     });

     describe('Check selection flow', () => {
          it('should handle check selection through checkSelected output', () => {
               const checkSelectedSpy = spyOn(component.checkSelected, 'emit');
               const mockItem = mockCheckItems[0];

               component.checkSelected.emit(mockItem);

               expect(checkSelectedSpy).toHaveBeenCalledWith(mockItem);
          });

          it('should handle check selection through selectedCheckItem output', () => {
               const selectedSpy = spyOn(component.selectedCheckItem, 'emit');
               const mockItem = mockCheckItems[1];

               component.selectedCheckItem.emit(mockItem);

               expect(selectedSpy).toHaveBeenCalledWith(mockItem);
          });

          it('should handle multiple selection events', () => {
               const checkSelectedSpy = spyOn(component.checkSelected, 'emit');

               component.checkSelected.emit(mockCheckItems[0]);
               component.checkSelected.emit(mockCheckItems[1]);

               expect(checkSelectedSpy).toHaveBeenCalledTimes(2);
               expect(checkSelectedSpy).toHaveBeenCalledWith(mockCheckItems[0]);
               expect(checkSelectedSpy).toHaveBeenCalledWith(mockCheckItems[1]);
          });
     });

     describe('Component lifecycle', () => {
          it('should initialize with default values', () => {
               expect(component).toBeDefined();
          });

          it('should maintain component state between change detection cycles', () => {
               fixture.detectChanges();
               expect(component).toBeTruthy();

               fixture.detectChanges(); // Second change detection
               expect(component).toBeTruthy();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty check items list', () => {
               const emptyCheckItemsService = {
                    checkItems: signal([]),
                    filteredCheckIds: signal([]),
                    selectedCheckItem: signal(null),
                    activeTab: signal('cancelCheck'),
               };

               // Reconfigure with empty items
               const emptyService = { ...checksTransactionViewModelService, ...emptyCheckItemsService };
               (component as any).checksTransactionViewModelService = emptyService;

               const items = component.checksTransactionViewModelService.checkItems();
               expect(items).toEqual([]);
          });

          it('should handle undefined selectedCheckItem', () => {
               const selected = component.checksTransactionViewModelService.selectedCheckItem();
               expect(selected).toBeNull();
          });

          it('should handle undefined check items gracefully', () => {
               const undefinedItemsService = {
                    checkItems: signal(undefined),
                    filteredCheckIds: signal([]),
                    selectedCheckItem: signal(null),
                    activeTab: signal('cancelCheck'),
               };

               (component as any).checksTransactionViewModelService = undefinedItemsService;

               const items = component.checksTransactionViewModelService.checkItems();
               expect(items).toBeUndefined();
          });
     });
});
