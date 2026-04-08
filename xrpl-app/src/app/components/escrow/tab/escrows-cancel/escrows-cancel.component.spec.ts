import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowsCancelComponent } from './escrows-cancel.component';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

describe('EscrowsCancelComponent', () => {
     let component: EscrowsCancelComponent;
     let fixture: ComponentFixture<EscrowsCancelComponent>;
     let escrowStore: InstanceType<typeof EscrowStoreService>;

     const mockWallet = { address: 'rTEST', classicAddress: 'rTEST', name: 'Test' };

     const mockEscrowUtil = {
          escrowItems: jasmine.createSpy('escrowItems').and.returnValue([
               { id: '5', display: '2 XRP → rDEST', secondary: 'Seq: 5' },
          ]),
          selectedEscrowItem: jasmine.createSpy('selectedEscrowItem').and.returnValue(null),
     };

     const mockVm = {
          activeTab: signal('cancelEscrow'),
          selectedEscrowIsExpired: signal(false),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [EscrowsCancelComponent],
               providers: [
                    EscrowStoreService,
                    { provide: EscrowUtilService, useValue: mockEscrowUtil },
                    { provide: EscrowTransactionViewModelService, useValue: mockVm },
                    { provide: WalletManagerService, useValue: { getSelectedWallet: jasmine.createSpy().and.returnValue(mockWallet), wallets: signal([mockWallet]) } },
               ],
          })
               .overrideComponent(EscrowsCancelComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowsCancelComponent);
          component = fixture.componentInstance;
          escrowStore = TestBed.inject(EscrowStoreService);
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('onEscrowSelected', () => {
          it('should clear both escrowSequenceNumber and escrowOwner when item is null', () => {
               escrowStore.setField('escrowSequenceNumber', 'SEQ5');
               escrowStore.setField('escrowOwner', 'rOWNER');
               component.onEscrowSelected(null);
               expect(escrowStore.escrowSequenceNumber()).toBe('');
               expect(escrowStore.escrowOwner()).toBe('');
          });

          it('should set escrowSequenceNumber = item.id', () => {
               escrowStore.setField('allEscrowsRaw', [{ EscrowSequence: 5, Sender: 'rTEST', Destination: 'rDEST' }]);
               component.onEscrowSelected({ id: '5', display: '2 XRP → rDEST', secondary: 'Seq: 5' });
               expect(escrowStore.escrowSequenceNumber()).toBe('5');
          });

          it('should set escrowOwner from matching escrow.Sender', () => {
               escrowStore.setField('allEscrowsRaw', [{ EscrowSequence: 5, Sender: 'rTEST', Destination: 'rDEST' }]);
               component.onEscrowSelected({ id: '5', display: '2 XRP → rDEST', secondary: 'Seq: 5' });
               expect(escrowStore.escrowOwner()).toBe('rTEST');
          });
     });

     describe('escrowItems', () => {
          it('should delegate to escrowUtilService.escrowItems with isCancel=true', () => {
               const items = component.escrowItems();
               expect(mockEscrowUtil.escrowItems).toHaveBeenCalledWith(jasmine.any(Array), 'rTEST', true);
               expect(items.length).toBeGreaterThan(0);
          });
     });

     describe('selectedEscrowIsExpired', () => {
          it('should delegate to viewModel.selectedEscrowIsExpired', () => {
               expect(component.selectedEscrowIsExpired()).toBeFalse();
               (mockVm.selectedEscrowIsExpired as any).set(true);
               expect(component.selectedEscrowIsExpired()).toBeTrue();
          });
     });
});
