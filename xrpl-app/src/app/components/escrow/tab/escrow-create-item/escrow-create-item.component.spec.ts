import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowCreateItemComponent } from './escrow-create-item.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';

describe('EscrowCreateItemComponent', () => {
     let component: EscrowCreateItemComponent;
     let fixture: ComponentFixture<EscrowCreateItemComponent>;

     const mockEscrow: any = {
          tab: 'createEscrow',
          id: 'SEQ001',
          EscrowSequence: 'SEQ001',
          amount: '10 XRP',
          destination: 'rDEST',
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
               imports: [EscrowCreateItemComponent],
               providers: [
                    { provide: TransactionUiService, useValue: { explorerUrl: signal('https://testnet.xrpl.org/'), currentStep: signal('idle'), stepMessage: jasmine.createSpy().and.returnValue('') } },
                    { provide: UtilsService, useValue: { encodeIfNeeded: (v: string) => v } },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: EscrowUtilService, useValue: mockEscrowUtil },
                    { provide: EscrowTransactionViewModelService, useValue: { activeTab: signal('createEscrow') } },
               ],
          })
               .overrideComponent(EscrowCreateItemComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowCreateItemComponent);
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
