import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowsFinishComponent } from './escrows-finish.component';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('EscrowsFinishComponent', () => {
     let component: EscrowsFinishComponent;
     let fixture: ComponentFixture<EscrowsFinishComponent>;

     // Services
     let escrowStoreService: any;
     let escrowUtilService: jasmine.SpyObj<EscrowUtilService>;
     let viewModel: any;
     let walletManager: any;

     // Mock data
     const mockWallet = { address: 'rTestAddress', classicAddress: 'rTestAddress', name: 'Test Wallet' };
     const mockAllEscrows = [
          { EscrowSequence: '123', amount: '100', Sender: 'rSender1', Destination: 'rTestAddress', isExpired: false },
          { EscrowSequence: '456', amount: '250', Sender: 'rSender2', Destination: 'rOtherAddress', isExpired: true },
          { EscrowSequence: '789', amount: '50', Sender: 'rSender3', Destination: 'rTestAddress', isExpired: false },
     ];

     const mockEscrowItems = [
          { id: '123', display: '100 XRP from rSender1', secondary: 'Destination: rTestAddress' },
          { id: '789', display: '50 XRP from rSender3', secondary: 'Destination: rTestAddress' },
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
               activeTab: signal('finishEscrow'),
               selectedEscrowIsExpired: jasmine.createSpy('selectedEscrowIsExpired').and.returnValue(false),
          };

          walletManager = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue(mockWallet),
          };

          await TestBed.configureTestingModule({
               imports: [EscrowsFinishComponent],
               providers: [
                    { provide: EscrowStoreService, useValue: escrowStoreService },
                    { provide: EscrowUtilService, useValue: escrowUtilService },
                    { provide: EscrowTransactionViewModelService, useValue: viewModel },
                    { provide: WalletManagerService, useValue: walletManager },
               ],
          })
               .overrideComponent(EscrowsFinishComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowsFinishComponent);
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
     });

     describe('activeTab', () => {
          it('should return active tab from viewModel', () => {
               expect(component.activeTab).toBe('finishEscrow');
          });
     });

     describe('escrowItems', () => {
          it('should call escrowUtilService.escrowItems with correct parameters', () => {
               const items = component.escrowItems();

               expect(escrowUtilService.escrowItems).toHaveBeenCalledWith(mockAllEscrows, mockWallet.address, false);
               expect(items).toEqual(mockEscrowItems);
          });

          it('should handle no selected wallet', () => {
               walletManager.getSelectedWallet.and.returnValue(null);
               escrowUtilService.escrowItems.calls.reset();

               const items = component.escrowItems();

               expect(escrowUtilService.escrowItems).toHaveBeenCalledWith(mockAllEscrows, '', false);
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
          beforeEach(() => {
               escrowStoreService.setField.calls.reset();
          });

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

          it('should set escrowSequenceNumber and find escrow sender', () => {
               const item = { id: '123', display: 'Test Escrow' } as SelectItem;

               component.onEscrowSelected(item);

               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', '123');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowOwner', 'rSender1');
          });

          it('should handle escrow not found - does nothing', () => {
               const item = { id: '999', display: 'Non-existent Escrow' } as SelectItem;

               component.onEscrowSelected(item);

               // When escrow not found, the component does NOT set any fields
               expect(escrowStoreService.setField).not.toHaveBeenCalled();
          });

          it('should handle EscrowSequence as number vs string comparison', () => {
               const escrowWithNumberSequence = [{ EscrowSequence: 123, amount: '100', Sender: 'rSender1', Destination: 'rTestAddress' }];
               escrowStoreService.allEscrowsRaw.set(escrowWithNumberSequence as any);
               escrowStoreService.setField.calls.reset();

               const item = { id: '123', display: 'Test Escrow' } as SelectItem;

               component.onEscrowSelected(item);

               // The component sets the value as-is from the escrow object (number)
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowSequenceNumber', 123);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('escrowOwner', 'rSender1');
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
     });

     describe('Edge cases', () => {
          it('should handle allEscrowsRaw being undefined', () => {
               escrowStoreService.allEscrowsRaw.set(undefined);
               escrowUtilService.escrowItems.and.returnValue([]);

               const items = component.escrowItems();
               expect(items).toEqual([]);
          });

          it('should handle rapid selection changes', () => {
               const item1 = { id: '123', display: 'Escrow 1' } as SelectItem;
               const item2 = { id: '456', display: 'Escrow 2' } as SelectItem;
               const item3 = { id: '999', display: 'Escrow 3' } as SelectItem;

               component.onEscrowSelected(item1); // Found: sets sequence + owner (2 calls)
               component.onEscrowSelected(item2); // Found: sets sequence + owner (2 calls)
               component.onEscrowSelected(item3); // Not found: does nothing (0 calls)
               component.onEscrowSelected(null); // Null: sets sequence + owner to empty (2 calls)

               // Total: 2 + 2 + 0 + 2 = 6 calls
               expect(escrowStoreService.setField).toHaveBeenCalledTimes(6);
          });
     });
});
