import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowsCancelComponent } from './escrows-cancel.component';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('EscrowsCancelComponent', () => {
     let component: EscrowsCancelComponent;
     let fixture: ComponentFixture<EscrowsCancelComponent>;

     // Services
     let escrowStoreService: any;
     let escrowUtilService: jasmine.SpyObj<EscrowUtilService>;
     let viewModel: any;
     let walletManager: any;

     // Mock data
     const mockWallet = { address: 'rTestAddress', classicAddress: 'rTestAddress', name: 'Test Wallet' };
     const mockAllEscrows = [
          { EscrowSequence: '123', amount: '100', Sender: 'rTestAddress', Destination: 'rDest1', isExpired: false },
          { EscrowSequence: '456', amount: '250', Sender: 'rOtherAddress', Destination: 'rDest2', isExpired: true },
          { EscrowSequence: '789', amount: '50', Sender: 'rTestAddress', Destination: 'rDest3', isExpired: false },
     ];

     const mockEscrowItems = [
          { id: '123', display: '100 XRP to rDest1', secondary: 'Sender: rTestAddress' },
          { id: '789', display: '50 XRP to rDest3', secondary: 'Sender: rTestAddress' },
     ];

     beforeEach(async () => {
          escrowStoreService = {
               allEscrowsRaw: signal(mockAllEscrows),
               escrowSequenceNumber: signal(''),
               escrowOwner: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          escrowUtilService = jasmine.createSpyObj('EscrowUtilService', ['escrowItems', 'selectedEscrowItem']);
          escrowUtilService.escrowItems.and.returnValue(mockEscrowItems);
          escrowUtilService.selectedEscrowItem.and.returnValue(mockEscrowItems[0]);

          viewModel = {
               activeTab: signal('cancelEscrow'),
               selectedEscrowIsExpired: jasmine.createSpy('selectedEscrowIsExpired').and.returnValue(false),
          };

          walletManager = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          };

          await TestBed.configureTestingModule({
               imports: [EscrowsCancelComponent],
               providers: [
                    { provide: EscrowStoreService, useValue: escrowStoreService },
                    { provide: EscrowUtilService, useValue: escrowUtilService },
                    { provide: EscrowTransactionViewModelService, useValue: viewModel },
                    { provide: WalletManagerService, useValue: walletManager },
               ],
          })
               .overrideComponent(EscrowsCancelComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowsCancelComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          escrowStoreService.setField.calls.reset();
          escrowUtilService.escrowItems.calls.reset();
          escrowUtilService.selectedEscrowItem.calls.reset();
          viewModel.selectedEscrowIsExpired.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should have isConditional input defaulting to false', () => {
               expect(component.isConditional).toBeFalse();
          });

          it('should accept isConditional input as true', () => {
               fixture.componentRef.setInput('isConditional', true);
               fixture.detectChanges();
               expect(component.isConditional).toBeTrue();
          });

          it('should accept isConditional input as false', () => {
               fixture.componentRef.setInput('isConditional', false);
               fixture.detectChanges();
               expect(component.isConditional).toBeFalse();
          });
     });

     describe('activeTab', () => {
          it('should return active tab from viewModel', () => {
               expect(component.activeTab).toBe('cancelEscrow');
          });
     });

     describe('escrowItems', () => {
          it('should call escrowUtilService.escrowItems with correct parameters', () => {
               const items = component.escrowItems();

               expect(escrowUtilService.escrowItems).toHaveBeenCalledWith(
                    mockAllEscrows,
                    mockWallet.address,
                    true // cancelEscrow mode
               );
               expect(items).toEqual(mockEscrowItems);
          });

          it('should handle no selected wallet', () => {
               walletManager.getSelectedWallet.and.returnValue(null);
               escrowUtilService.escrowItems.calls.reset();

               const items = component.escrowItems();

               expect(escrowUtilService.escrowItems).toHaveBeenCalledWith(mockAllEscrows, '', true);
               expect(items).toEqual(mockEscrowItems);
          });

          it('should handle empty escrows list', () => {
               escrowStoreService.allEscrowsRaw.set([]);
               escrowUtilService.escrowItems.and.returnValue([]);

               const items = component.escrowItems();

               expect(items).toEqual([]);
          });
     });

     describe('selectedEscrowItem', () => {
          it('should call escrowUtilService.selectedEscrowItem with correct parameters', () => {
               const selectedItem = component.selectedEscrowItem();

               expect(escrowUtilService.selectedEscrowItem).toHaveBeenCalledWith(mockEscrowItems, escrowStoreService.escrowSequenceNumber());
               expect(selectedItem).toEqual(mockEscrowItems[0]);
          });

          it('should handle empty escrow items', () => {
               escrowUtilService.selectedEscrowItem.and.returnValue(null);

               const selectedItem = component.selectedEscrowItem();

               expect(selectedItem).toBeNull();
          });
     });

     describe('selectedEscrowIsExpired', () => {
          it('should return selectedEscrowIsExpired from viewModel', () => {
               viewModel.selectedEscrowIsExpired.and.returnValue(true);

               const result = component.selectedEscrowIsExpired();

               expect(viewModel.selectedEscrowIsExpired).toHaveBeenCalled();
               expect(result).toBeTrue();
          });

          it('should return false when not expired', () => {
               viewModel.selectedEscrowIsExpired.and.returnValue(false);

               const result = component.selectedEscrowIsExpired();

               expect(result).toBeFalse();
          });
     });

     describe('onEscrowSelected', () => {
          it('should handle null item', () => {
               component.onEscrowSelected(null);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowOwner', '');
          });

          it('should handle item without id', () => {
               component.onEscrowSelected({ display: 'Test' } as SelectItem);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowOwner', '');
          });

          it('should set escrowSequenceNumber and find escrow owner', () => {
               const item = { id: '123', display: 'Test Escrow' } as SelectItem;

               component.onEscrowSelected(item);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '123');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowOwner', 'rTestAddress');
          });

          it('should handle escrow not found in allEscrowsRaw', () => {
               const item = { id: '999', display: 'Non-existent Escrow' } as SelectItem;

               component.onEscrowSelected(item);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '999');
               // escrowOwner should NOT be set when escrow not found
               const escrowOwnerCalls = escrowStoreService.setField.calls.allArgs().filter((args: string[]) => args[0] === 'escrowOwner');
               expect(escrowOwnerCalls.length).toBe(0); // ✅ Changed from 1 to 0
          });

          it('should handle EscrowSequence as number vs string comparison', () => {
               const escrowWithNumberSequence = [{ EscrowSequence: 123, amount: '100', Sender: 'rTestAddress' }];
               escrowStoreService.allEscrowsRaw.set(escrowWithNumberSequence as any);

               const item = { id: '123', display: 'Test Escrow' } as SelectItem;

               component.onEscrowSelected(item);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '123');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowOwner', 'rTestAddress');
          });
     });

     describe('Service injections', () => {
          it('should have escrowStoreService injected', () => {
               expect(component.escrowStoreService).toBe(escrowStoreService);
          });

          it('should have escrowUtilService injected', () => {
               expect(component.escrowUtilService).toBe(escrowUtilService);
          });

          it('should have viewModel injected', () => {
               expect(component.viewModel).toBe(viewModel);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have escrowItems available for template', () => {
               const items = component.escrowItems();
               expect(items).toBeDefined();
               expect(items.length).toBe(2);
          });

          it('should have selectedEscrowItem available for template', () => {
               const selected = component.selectedEscrowItem();
               expect(selected).toBeDefined();
          });

          it('should have isConditional available for template', () => {
               expect(component.isConditional).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle allEscrowsRaw being undefined', () => {
               escrowStoreService.allEscrowsRaw.set(undefined);
               escrowUtilService.escrowItems.and.returnValue([]);

               const items = component.escrowItems();
               expect(items).toEqual([]);
          });

          it('should handle escrow with missing Sender property', () => {
               const escrowWithoutSender = [{ EscrowSequence: '123', amount: '100' }];
               escrowStoreService.allEscrowsRaw.set(escrowWithoutSender as any);

               const item = { id: '123', display: 'Test Escrow' } as SelectItem;

               component.onEscrowSelected(item);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '123');
          });

          it('should handle rapid selection changes', () => {
               const item1 = { id: '123', display: 'Escrow 1' } as SelectItem;
               const item2 = { id: '456', display: 'Escrow 2' } as SelectItem;

               component.onEscrowSelected(item1);
               component.onEscrowSelected(item2);
               component.onEscrowSelected(null);

               expect(escrowStoreService.setField).toHaveBeenCalledTimes(6); // 3 calls * 2 fields
          });
     });
});
