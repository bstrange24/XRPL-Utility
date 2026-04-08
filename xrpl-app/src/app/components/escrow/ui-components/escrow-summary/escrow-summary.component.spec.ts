import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowSummaryComponent } from './escrow-summary.component';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';

describe('EscrowSummaryComponent', () => {
     let component: EscrowSummaryComponent;
     let fixture: ComponentFixture<EscrowSummaryComponent>;

     const mockWallet = { address: 'rTEST' };

     const mockEscrowUtil = {
          onEscrowSelected: jasmine.createSpy('onEscrowSelected'),
          onEscrowSelectedInUi: jasmine.createSpy('onEscrowSelectedInUi'),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [EscrowSummaryComponent],
               providers: [
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: TransactionUiService, useValue: { explorerUrl: signal('https://testnet.xrpl.org/'), currentStep: signal('idle'), stepMessage: jasmine.createSpy().and.returnValue('') } },
                    { provide: EscrowUtilService, useValue: mockEscrowUtil },
                    { provide: EscrowTransactionViewModelService, useValue: { activeTab: signal('createEscrow'), escrowsToShow: signal([]) } },
                    { provide: UtilsService, useValue: { encodeIfNeeded: (v: string) => v } },
               ],
          })
               .overrideComponent(EscrowSummaryComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowSummaryComponent);
          component = fixture.componentInstance;
          fixture.componentRef.setInput('wallet', mockWallet);
          fixture.componentRef.setInput('escrowLength', 0);
          fixture.componentRef.setInput('tab', 'createEscrow');
          fixture.componentRef.setInput('infoPanelExpanded', false);
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('onEscrowClick', () => {
          it('should emit escrowSelected event', () => {
               let emitted: any;
               component.escrowSelected.subscribe((e: any) => (emitted = e));
               const mockEscrow = { id: 'SEQ1', tab: 'createEscrow' };
               component.onEscrowClick(mockEscrow);
               expect(emitted).toEqual(mockEscrow);
          });

          it('should call escrowUtilService.onEscrowSelectedInUi', () => {
               const mockEscrow = { id: 'SEQ1', tab: 'createEscrow' };
               component.onEscrowClick(mockEscrow);
               expect(mockEscrowUtil.onEscrowSelectedInUi).toHaveBeenCalledWith(mockEscrow);
          });
     });

     describe('selectEscrow', () => {
          it('should call escrowUtilService.onEscrowSelected', () => {
               const mockEscrow = { id: 'SEQ2', tab: 'createEscrow' };
               component.selectEscrow(mockEscrow, 'list');
               expect(mockEscrowUtil.onEscrowSelected).toHaveBeenCalledWith(mockEscrow);
          });
     });

     describe('toggleInfoPanel', () => {
          it('should have toggleInfoPanel output defined', () => {
               expect(component.toggleInfoPanel).toBeDefined();
          });
     });
});
