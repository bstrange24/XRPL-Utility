import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MptLockUnlockComponent } from './mpt-lock-unlock.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('MptLockUnlockComponent', () => {
     let component: MptLockUnlockComponent;
     let fixture: ComponentFixture<MptLockUnlockComponent>;

     // Services
     let mptStoreService: any;

     // Mock data
     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     const mockSelectedDestinationItem = { id: 'rDest1', display: 'Destination 1' };

     beforeEach(async () => {
          mptStoreService = {
               lockAction: signal('unlock'),
               mptIssuanceId: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          await TestBed.configureTestingModule({
               imports: [MptLockUnlockComponent],
               providers: [{ provide: MptStoreService, useValue: mptStoreService }],
          })
               .overrideComponent(MptLockUnlockComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(MptLockUnlockComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('destinationItems', mockDestinationItems);
          fixture.componentRef.setInput('selectedDestinationItem', mockSelectedDestinationItem);

          fixture.detectChanges();
     });

     afterEach(() => {
          mptStoreService.setField.calls.reset();
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

          it('should update destinationItems when changed', () => {
               const newItems = [{ id: 'rNew', display: 'New' }];
               fixture.componentRef.setInput('destinationItems', newItems);
               fixture.detectChanges();
               expect(component.destinationItems()).toEqual(newItems);
          });

          it('should update selectedDestinationItem when changed', () => {
               const newSelected = { id: 'rNew', display: 'New Selected' };
               fixture.componentRef.setInput('selectedDestinationItem', newSelected);
               fixture.detectChanges();
               expect(component.selectedDestinationItem()).toEqual(newSelected);
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

          it('should have onMptSelected output', () => {
               expect(component.onMptSelected).toBeDefined();
               expect(component.onMptSelected.emit).toBeDefined();
          });
     });

     describe('lockAction getter', () => {
          it('should return lockAction from store', () => {
               mptStoreService.lockAction.set('lock');
               expect(component.lockAction).toBe('lock');
          });
     });

     describe('setLockAction', () => {
          it('should set lock action to lock', () => {
               component.setLockAction('lock');
               expect(mptStoreService.setField).toHaveBeenCalledWith('lockAction', 'lock');
          });

          it('should set lock action to unlock', () => {
               component.setLockAction('unlock');
               expect(mptStoreService.setField).toHaveBeenCalledWith('lockAction', 'unlock');
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

          it('should handle item without id', () => {
               spyOn(component.selectedDestinationAddress, 'emit');
               const item = { display: 'Destination' } as SelectItem;

               component.onDestinationChange(item);

               expect(component.selectedDestinationAddress.emit).toHaveBeenCalledWith('');
          });
     });

     describe('mptIssuanceId getter', () => {
          it('should return mptIssuanceId from store', () => {
               mptStoreService.mptIssuanceId.set('test123');
               expect(component.mptIssuanceId).toBe('test123');
          });
     });

     describe('setMptIssuanceId', () => {
          it('should set mptIssuanceId in store', () => {
               component.setMptIssuanceId('newId123');
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'newId123');
          });

          it('should handle empty string', () => {
               component.setMptIssuanceId('');
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', '');
          });
     });

     describe('Service injections', () => {
          it('should have mptStoreService injected', () => {
               expect(component.mptStoreService).toBe(mptStoreService);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have destinationItems available for template', () => {
               expect(component.destinationItems()).toEqual(mockDestinationItems);
          });

          it('should have selectedDestinationItem available for template', () => {
               expect(component.selectedDestinationItem()).toEqual(mockSelectedDestinationItem);
          });

          it('should have lockAction available for template', () => {
               expect(component.lockAction).toBe('unlock');
          });

          it('should have mptIssuanceId available for template', () => {
               expect(component.mptIssuanceId).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty destinationItems', () => {
               fixture.componentRef.setInput('destinationItems', []);
               fixture.detectChanges();
               expect(component.destinationItems()).toEqual([]);
          });

          it('should handle null selectedDestinationItem', () => {
               fixture.componentRef.setInput('selectedDestinationItem', null);
               fixture.detectChanges();
               expect(component.selectedDestinationItem()).toBeNull();
          });

          it('should handle rapid lock action changes', () => {
               component.setLockAction('lock');
               component.setLockAction('unlock');
               component.setLockAction('lock');

               expect(mptStoreService.setField).toHaveBeenCalledTimes(3);
               expect(mptStoreService.setField).toHaveBeenCalledWith('lockAction', 'lock');
               expect(mptStoreService.setField).toHaveBeenCalledWith('lockAction', 'unlock');
          });

          it('should handle rapid issuance ID changes', () => {
               component.setMptIssuanceId('id1');
               component.setMptIssuanceId('id2');
               component.setMptIssuanceId('id3');

               expect(mptStoreService.setField).toHaveBeenCalledTimes(3);
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id1');
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id2');
               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'id3');
          });

          it('should handle lockAction default value', () => {
               expect(component.lockAction).toBe('unlock');
          });
     });
});
