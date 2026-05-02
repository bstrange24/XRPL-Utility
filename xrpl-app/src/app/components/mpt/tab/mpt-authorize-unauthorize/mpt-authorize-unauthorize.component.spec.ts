import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed, WritableSignal } from '@angular/core';
import { MptAuthorizeUnauthorizeComponent } from './mpt-authorize-unauthorize.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('MptAuthorizeUnauthorizeComponent', () => {
     let component: MptAuthorizeUnauthorizeComponent;
     let fixture: ComponentFixture<MptAuthorizeUnauthorizeComponent>;

     // Services
     let mptStoreService: any;
     let mptUtilService: any;
     let mptTransactionViewModelService: any;

     // Writable signal for infoData
     let infoDataSignal: WritableSignal<any>;

     // Mock data
     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     const mockSelectedDestinationItem = { id: 'rDest1', display: 'Destination 1' };

     const mockMptsToShow = [
          { mpt_issuance_id: 'mpt123', flags: ['isRequireAuth'] },
          { mpt_issuance_id: 'mpt456', flags: [] },
          { mpt_issuance_id: 'mpt789', flags: ['canLock', 'canTrade'] },
     ];

     beforeEach(async () => {
          // Initialize writable signal
          infoDataSignal = signal({
               mptsToShow: mockMptsToShow,
          });

          mptStoreService = {
               mptIssuanceId: signal(''),
               authAction: signal('authorize'),
               setField: jasmine.createSpy('setField'),
          };

          mptUtilService = {
               decodeMptFlagsForUi: jasmine.createSpy('decodeMptFlagsForUi').and.returnValue([]),
          };

          mptTransactionViewModelService = {
               infoData: infoDataSignal.asReadonly(),
          };

          await TestBed.configureTestingModule({
               imports: [MptAuthorizeUnauthorizeComponent],
               providers: [
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: MptUtilService, useValue: mptUtilService },
                    { provide: MptTransactionViewModelService, useValue: mptTransactionViewModelService },
               ],
          })
               .overrideComponent(MptAuthorizeUnauthorizeComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(MptAuthorizeUnauthorizeComponent);
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

          it('should emit onMptSelected when called', () => {
               spyOn(component.onMptSelected, 'emit');
               const item = { id: 'mpt123', display: 'MPT 1' } as SelectItem;
               component.onMptSelected.emit(item);
               expect(component.onMptSelected.emit).toHaveBeenCalledWith(item);
          });
     });

     describe('selectedMpt', () => {
          it('should return null when no issuance ID', () => {
               mptStoreService.mptIssuanceId.set('');
               const result = component.selectedMpt();
               expect(result).toBeNull();
          });

          // it('should return matching MPT when issuance ID exists', () => {
          //      mptStoreService.mptIssuanceId.set('mpt123');
          //      const result = component.selectedMpt();
          //      expect(result).toEqual(mockMptsToShow[0]);
          // });

          it('should return null when issuance ID not found', () => {
               mptStoreService.mptIssuanceId.set('nonexistent');
               const result = component.selectedMpt();
               expect(result).toBeNull();
          });
     });

     describe('requiresIssuerAuth', () => {
          it('should return false when no MPT selected', () => {
               mptStoreService.mptIssuanceId.set('');
               const result = component.requiresIssuerAuth();
               expect(result).toBeFalse();
          });

          it('should return true when MPT has isRequireAuth flag', () => {
               mptStoreService.mptIssuanceId.set('mpt123');
               const result = component.requiresIssuerAuth();
               expect(result).toBeTrue();
          });

          it('should return false when MPT does not have isRequireAuth flag', () => {
               mptStoreService.mptIssuanceId.set('mpt456');
               const result = component.requiresIssuerAuth();
               expect(result).toBeFalse();
          });
     });

     describe('authAction', () => {
          it('should return authAction from store', () => {
               expect(component.authAction).toBe('authorize');
          });
     });

     describe('setAuthAction', () => {
          it('should set authorize action', () => {
               component.setAuthAction('authorize');
               expect(mptStoreService.setField).toHaveBeenCalledWith('authAction', 'authorize');
          });

          it('should set unauthorize action', () => {
               component.setAuthAction('unauthorize');
               expect(mptStoreService.setField).toHaveBeenCalledWith('authAction', 'unauthorize');
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

     describe('mptIssuanceId', () => {
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
               expect(component['mptStoreService']).toBe(mptStoreService);
          });

          it('should have mptUtilService injected', () => {
               expect(component.mptUtilService).toBe(mptUtilService);
          });

          it('should have mptTransactionViewModelService injected', () => {
               expect(component.mptTransactionViewModelService).toBe(mptTransactionViewModelService);
          });
     });

     describe('Edge cases', () => {
          it('should handle empty mptsToShow', () => {
               infoDataSignal.set({ mptsToShow: [] });
               mptStoreService.mptIssuanceId.set('mpt123');

               const result = component.selectedMpt();
               expect(result).toBeNull();
          });

          it('should handle missing infoData', () => {
               infoDataSignal.set(null);
               mptStoreService.mptIssuanceId.set('mpt123');

               const result = component.selectedMpt();
               expect(result).toBeNull();
          });

          // it('should handle MPT with numeric flags', () => {
          //      const mptsWithNumericFlags = [
          //           { mpt_issuance_id: 'mpt123', flags: 4 }, // 4 = isRequireAuth flag value
          //      ];
          //      infoDataSignal.set({ mptsToShow: mptsWithNumericFlags });
          //      mptStoreService.mptIssuanceId.set('mpt123');

          //      const result = component.selectedMpt();
          //      expect(result).toEqual(mptsWithNumericFlags[0]);
          // });

          it('should handle rapid auth action changes', () => {
               component.setAuthAction('authorize');
               component.setAuthAction('unauthorize');
               component.setAuthAction('authorize');

               expect(mptStoreService.setField).toHaveBeenCalledTimes(3);
               expect(mptStoreService.setField).toHaveBeenCalledWith('authAction', 'authorize');
               expect(mptStoreService.setField).toHaveBeenCalledWith('authAction', 'unauthorize');
          });
     });
});
