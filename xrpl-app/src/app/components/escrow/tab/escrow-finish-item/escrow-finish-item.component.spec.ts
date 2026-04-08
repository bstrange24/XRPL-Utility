import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowFinishItemComponent } from './escrow-finish-item.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';

describe('EscrowFinishItemComponent', () => {
     let component: EscrowFinishItemComponent;
     let fixture: ComponentFixture<EscrowFinishItemComponent>;

     const mockEscrow: any = {
          tab: 'finishEscrow',
          id: 'SEQ002',
          EscrowSequence: 'SEQ002',
          amount: '5 XRP',
          sender: 'rSENDER',
          isExpired: false,
          display: '',
          secondary: '',
     };

     const mockEscrowUtil = {
          onEscrowSelected: jasmine.createSpy('onEscrowSelected'),
          onEscrowSelectedInUi: jasmine.createSpy('onEscrowSelectedInUi'),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [EscrowFinishItemComponent],
               providers: [
                    { provide: TransactionUiService, useValue: { explorerUrl: signal('https://testnet.xrpl.org/'), currentStep: signal('idle'), stepMessage: jasmine.createSpy().and.returnValue('') } },
                    { provide: UtilsService, useValue: { encodeIfNeeded: (v: string) => v } },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: EscrowUtilService, useValue: mockEscrowUtil },
                    { provide: EscrowTransactionViewModelService, useValue: { activeTab: signal('finishEscrow') } },
               ],
          })
               .overrideComponent(EscrowFinishItemComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowFinishItemComponent);
          component = fixture.componentInstance;
          component.escrow = mockEscrow;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should have escrow input set', () => {
          expect(component.escrow).toEqual(mockEscrow);
     });

     describe('onEscrowClick', () => {
          it('should emit escrowSelected event with correct escrow', () => {
               let emittedEscrow: any;
               component.escrowSelected.subscribe((e: any) => (emittedEscrow = e));
               component.onEscrowClick(mockEscrow);
               expect(emittedEscrow).toEqual(mockEscrow);
          });
     });

     describe('selectEscrow', () => {
          it('should call escrowUtilService.onEscrowSelected', () => {
               component.selectEscrow(mockEscrow, 'list');
               expect(mockEscrowUtil.onEscrowSelected).toHaveBeenCalledWith(mockEscrow);
          });
     });

     it('isExpired should be false initially', () => {
          expect(component.escrow.isExpired).toBeFalse();
     });
});
