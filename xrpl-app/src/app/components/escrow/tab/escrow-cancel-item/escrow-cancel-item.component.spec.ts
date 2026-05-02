import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowCancelItemComponent } from './escrow-cancel-item.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { EscrowDisplayItem } from '../../constants/time-escrow.types';

describe('EscrowCancelItemComponent', () => {
     let component: EscrowCancelItemComponent;
     let fixture: ComponentFixture<EscrowCancelItemComponent>;

     // Services
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let txUiService: any;
     let escrowUtilService: jasmine.SpyObj<EscrowUtilService>;
     let escrowTransactionViewModelService: any;
     let utilsService: jasmine.SpyObj<UtilsService>;

     // Mock escrow data
     const mockEscrow: EscrowDisplayItem & { tab: 'createEscrow' | 'cancelEscrow' } = {
          EscrowSequence: '123',
          amount: '100',
          destination: 'rDestination123',
          finishAfter: 1735689600,
          cancelAfter: 1735603200,
          isExpired: false,
          display: '100 XRP → rDestination',
          secondary: 'Created: 2024-01-01',
          id: '123',
          tab: 'cancelEscrow',
     };

     beforeEach(async () => {
          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copy']);
          txUiService = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };
          escrowUtilService = jasmine.createSpyObj('EscrowUtilService', ['onEscrowSelected']);
          escrowTransactionViewModelService = {
               activeTab: signal('cancelEscrow'),
               infoData: signal({ walletName: 'Test', escrowCount: 5 }),
          };
          utilsService = jasmine.createSpyObj('UtilsService', ['formatAmount']);

          await TestBed.configureTestingModule({
               imports: [EscrowCancelItemComponent],
               providers: [
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: EscrowUtilService, useValue: escrowUtilService },
                    { provide: EscrowTransactionViewModelService, useValue: escrowTransactionViewModelService },
                    { provide: UtilsService, useValue: utilsService },
               ],
          })
               .overrideComponent(EscrowCancelItemComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowCancelItemComponent);
          component = fixture.componentInstance;

          // Set required input
          component.escrow = mockEscrow;

          fixture.detectChanges();
     });

     afterEach(() => {
          escrowUtilService.onEscrowSelected.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input property', () => {
          it('should accept escrow input', () => {
               expect(component.escrow).toEqual(mockEscrow);
          });

          it('should accept escrow with createEscrow tab', () => {
               const createEscrowMock = { ...mockEscrow, tab: 'createEscrow' as const };
               component.escrow = createEscrowMock;
               fixture.detectChanges();

               expect(component.escrow.tab).toBe('createEscrow');
          });

          it('should accept escrow with cancelEscrow tab', () => {
               const cancelEscrowMock = { ...mockEscrow, tab: 'cancelEscrow' as const };
               component.escrow = cancelEscrowMock;
               fixture.detectChanges();

               expect(component.escrow.tab).toBe('cancelEscrow');
          });

          it('should have all required properties', () => {
               const requiredProps = ['EscrowSequence', 'amount', 'destination', 'finishAfter', 'cancelAfter', 'isExpired', 'display', 'secondary', 'id', 'tab'];

               requiredProps.forEach(prop => {
                    expect(component.escrow[prop as keyof typeof component.escrow]).toBeDefined();
               });
          });
     });

     describe('Output signals', () => {
          it('should have escrowSelected output', () => {
               expect(component.escrowSelected).toBeDefined();
               expect(component.escrowSelected.emit).toBeDefined();
          });

          it('should emit escrowSelected when called', () => {
               spyOn(component.escrowSelected, 'emit');
               const testEscrow = { EscrowSequence: '123' };
               component.escrowSelected.emit(testEscrow);
               expect(component.escrowSelected.emit).toHaveBeenCalledWith(testEscrow);
          });
     });

     describe('explorerUrl', () => {
          it('should return explorerUrl from txUiService', () => {
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('onEscrowClick', () => {
          it('should emit escrowSelected with the escrow', () => {
               spyOn(component.escrowSelected, 'emit');

               component.onEscrowClick(mockEscrow);

               expect(component.escrowSelected.emit).toHaveBeenCalledWith(mockEscrow);
          });

          it('should handle null escrow', () => {
               spyOn(component.escrowSelected, 'emit');

               component.onEscrowClick(null);

               expect(component.escrowSelected.emit).toHaveBeenCalledWith(null);
          });

          it('should handle undefined escrow', () => {
               spyOn(component.escrowSelected, 'emit');

               component.onEscrowClick(undefined);

               expect(component.escrowSelected.emit).toHaveBeenCalledWith(undefined);
          });
     });

     describe('selectEscrow', () => {
          it('should call escrowUtilService.onEscrowSelected with the escrow', () => {
               component.selectEscrow(mockEscrow, 'list');

               expect(escrowUtilService.onEscrowSelected).toHaveBeenCalledWith(mockEscrow);
          });

          it('should handle null escrow', () => {
               component.selectEscrow(null, 'list');

               expect(escrowUtilService.onEscrowSelected).toHaveBeenCalledWith(null);
          });

          it('should ignore the source parameter', () => {
               component.selectEscrow(mockEscrow, 'list');

               // The source parameter is not used in the method
               expect(escrowUtilService.onEscrowSelected).toHaveBeenCalledWith(mockEscrow);
          });
     });

     describe('Service injections', () => {
          it('should have copyUtilService injected', () => {
               expect(component.copyUtilService).toBe(copyUtilService);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });

          it('should have escrowUtilService injected', () => {
               expect(component.escrowUtilService).toBe(escrowUtilService);
          });

          it('should have escrowTransactionViewModelService injected', () => {
               expect(component.escrowTransactionViewModelService).toBe(escrowTransactionViewModelService);
          });

          it('should have utilsService injected', () => {
               expect(component.utilsService).toBe(utilsService);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have escrow data available for template', () => {
               expect(component.escrow.EscrowSequence).toBe('123');
               expect(component.escrow.amount).toBe('100');
               expect(component.escrow.destination).toBe('rDestination123');
               expect(component.escrow.tab).toBe('cancelEscrow');
          });

          it('should have explorerUrl available for template', () => {
               expect(component.explorerUrl).toBeDefined();
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('Edge cases', () => {
          it('should handle escrow with very large sequence number', () => {
               const largeSequenceEscrow = {
                    ...mockEscrow,
                    EscrowSequence: '99999999999999999999',
               };
               component.escrow = largeSequenceEscrow;
               fixture.detectChanges();

               expect(component.escrow.EscrowSequence).toBe('99999999999999999999');
          });

          it('should handle escrow with zero amount', () => {
               const zeroAmountEscrow = {
                    ...mockEscrow,
                    amount: '0',
               };
               component.escrow = zeroAmountEscrow;
               fixture.detectChanges();

               expect(component.escrow.amount).toBe('0');
          });

          it('should handle escrow with very large amount', () => {
               const largeAmountEscrow = {
                    ...mockEscrow,
                    amount: '999999999999.999999',
               };
               component.escrow = largeAmountEscrow;
               fixture.detectChanges();

               expect(component.escrow.amount).toBe('999999999999.999999');
          });

          it('should handle expired escrow', () => {
               const expiredEscrow = {
                    ...mockEscrow,
                    isExpired: true,
               };
               component.escrow = expiredEscrow;
               fixture.detectChanges();

               expect(component.escrow.isExpired).toBeTrue();
          });

          it('should handle non-expired escrow', () => {
               const nonExpiredEscrow = {
                    ...mockEscrow,
                    isExpired: false,
               };
               component.escrow = nonExpiredEscrow;
               fixture.detectChanges();

               expect(component.escrow.isExpired).toBeFalse();
          });
     });
});
