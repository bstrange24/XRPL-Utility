import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowsFinishComponent } from './escrows-finish.component';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

describe('EscrowsFinishComponent', () => {
     let component: EscrowsFinishComponent;
     let fixture: ComponentFixture<EscrowsFinishComponent>;
     let escrowStore: InstanceType<typeof EscrowStoreService>;

     const mockWallet = { address: 'rTEST', classicAddress: 'rTEST', name: 'Test' };

     const mockEscrowUtil = {
          escrowItems: jasmine.createSpy('escrowItems').and.returnValue([
               { id: '10', display: '1 XRP ← rSENDER', secondary: 'Seq: 10' },
          ]),
          selectedEscrowItem: jasmine.createSpy('selectedEscrowItem').and.returnValue(null),
     };

     const mockVm = {
          activeTab: signal('finishEscrow'),
          selectedEscrowIsExpired: signal(false),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [EscrowsFinishComponent],
               providers: [
                    EscrowStoreService,
                    { provide: EscrowUtilService, useValue: mockEscrowUtil },
                    { provide: EscrowTransactionViewModelService, useValue: mockVm },
                    { provide: WalletManagerService, useValue: { getSelectedWallet: jasmine.createSpy().and.returnValue(mockWallet), wallets: signal([mockWallet]) } },
               ],
          })
               .overrideComponent(EscrowsFinishComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowsFinishComponent);
          component = fixture.componentInstance;
          escrowStore = TestBed.inject(EscrowStoreService);
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('onEscrowSelected', () => {
          it('should clear escrowSequenceNumber and escrowOwner when item is null', () => {
               escrowStore.setField('escrowSequenceNumber', 'SEQ10');
               escrowStore.setField('escrowOwner', 'rOWNER');
               component.onEscrowSelected(null);
               expect(escrowStore.escrowSequenceNumber()).toBe('');
               expect(escrowStore.escrowOwner()).toBe('');
          });

          it('should set escrowSequenceNumber from matching allEscrowsRaw entry', () => {
               escrowStore.setField('allEscrowsRaw', [{ EscrowSequence: 10, Sender: 'rSENDER', Destination: 'rTEST' }]);
               component.onEscrowSelected({ id: '10', display: '1 XRP ← rSENDER', secondary: 'Seq: 10' });
               expect(escrowStore.escrowSequenceNumber()).toBe(10 as any);
          });

          it('should set escrowOwner from escrow.Sender', () => {
               escrowStore.setField('allEscrowsRaw', [{ EscrowSequence: 10, Sender: 'rSENDER', Destination: 'rTEST' }]);
               component.onEscrowSelected({ id: '10', display: '1 XRP ← rSENDER', secondary: 'Seq: 10' });
               expect(escrowStore.escrowOwner()).toBe('rSENDER');
          });

          it('should not update store when no matching escrow found', () => {
               escrowStore.setField('allEscrowsRaw', [{ EscrowSequence: 5, Sender: 'rOTHER', Destination: 'rTEST' }]);
               escrowStore.setField('escrowSequenceNumber', 'OLD');
               component.onEscrowSelected({ id: '99', display: 'x', secondary: 'x' });
               expect(escrowStore.escrowSequenceNumber()).toBe('OLD');
          });
     });

     describe('escrowItems', () => {
          it('should delegate to escrowUtilService.escrowItems with isCancel=false', () => {
               const items = component.escrowItems();
               expect(mockEscrowUtil.escrowItems).toHaveBeenCalledWith(jasmine.any(Array), 'rTEST', false);
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
