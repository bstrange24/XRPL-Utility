import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowSummaryComponent } from './escrow-summary.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { EscrowUtilService } from '../../../../services/escrow/escrow-util/escrow-util.service';
import { SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { AnyEscrowDisplayItem, EscrowActionTypes } from '../../constants/time-escrow.types';

describe('EscrowSummaryComponent', () => {
     let component: EscrowSummaryComponent;
     let fixture: ComponentFixture<EscrowSummaryComponent>;

     // Services
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let txUiService: any;
     let escrowUtilService: jasmine.SpyObj<EscrowUtilService>;
     let escrowTransactionViewModelService: any;
     let summaryTextConfigService: jasmine.SpyObj<SummaryTextConfigService>;
     let utilsService: jasmine.SpyObj<UtilsService>;

     const mockWallet = { address: 'rTestAddress123' };

     // Mock timestamps (Unix time in seconds)
     const mockFinishAfter = 1735689600; // 2025-01-01
     const mockCancelAfter = 1735603200; // 2024-12-31

     // Create mock escrow with correct types
     const mockEscrowForCasting = {
          EscrowSequence: '123',
          amount: '100',
          destination: 'rDestination',
          sender: 'rSender',
          finishAfter: mockFinishAfter,
          cancelAfter: mockCancelAfter,
          isExpired: false,
          display: '100 XRP → rDestination',
          secondary: 'Created: 2024-01-01',
          id: '123',
     };

     // Create full AnyEscrowDisplayItem for onEscrowClick tests
     const mockEscrow: AnyEscrowDisplayItem = {
          EscrowSequence: '123',
          amount: '100',
          destination: 'rDestination',
          sender: 'rSender',
          finishAfter: mockFinishAfter,
          cancelAfter: mockCancelAfter,
          isExpired: false,
          display: '100 XRP → rDestination',
          secondary: 'Created: 2024-01-01',
          id: '123',
          tab: 'createEscrow',
     };

     const mockInfoData = {
          walletName: 'Test Wallet',
          escrowCount: 5,
     };

     beforeEach(async () => {
          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copy']);
          txUiService = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };
          escrowUtilService = jasmine.createSpyObj('EscrowUtilService', ['onEscrowSelectedInUi', 'onEscrowSelected']);
          escrowTransactionViewModelService = {
               infoData: signal(mockInfoData),
               activeTab: signal('createEscrow'),
          };
          summaryTextConfigService = jasmine.createSpyObj('SummaryTextConfigService', ['buildSummaryText']);
          utilsService = jasmine.createSpyObj('UtilsService', ['formatAmount']);

          summaryTextConfigService.buildSummaryText.and.returnValue('Test summary text');

          await TestBed.configureTestingModule({
               imports: [EscrowSummaryComponent],
               providers: [
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: EscrowUtilService, useValue: escrowUtilService },
                    { provide: EscrowTransactionViewModelService, useValue: escrowTransactionViewModelService },
                    { provide: SummaryTextConfigService, useValue: summaryTextConfigService },
                    { provide: UtilsService, useValue: utilsService },
               ],
          })
               .overrideComponent(EscrowSummaryComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowSummaryComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('wallet', mockWallet);
          fixture.componentRef.setInput('escrowLength', 5);
          fixture.componentRef.setInput('tab', 'createEscrow');
          fixture.componentRef.setInput('infoPanelExpanded', false);

          fixture.detectChanges();
     });

     afterEach(() => {
          summaryTextConfigService.buildSummaryText.calls.reset();
          escrowUtilService.onEscrowSelectedInUi.calls.reset();
          escrowUtilService.onEscrowSelected.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept wallet input', () => {
               expect(component.wallet()).toEqual(mockWallet);
          });

          it('should accept escrowLength input', () => {
               expect(component.escrowLength()).toBe(5);
          });

          it('should accept tab input', () => {
               expect(component.tab()).toBe('createEscrow');
          });

          it('should accept infoPanelExpanded input', () => {
               expect(component.infoPanelExpanded()).toBeFalse();
          });

          it('should update wallet input when changed', () => {
               const newWallet = { address: 'rNewWallet' };
               fixture.componentRef.setInput('wallet', newWallet);
               fixture.detectChanges();
               expect(component.wallet()).toEqual(newWallet);
          });

          it('should update escrowLength when changed', () => {
               fixture.componentRef.setInput('escrowLength', 10);
               fixture.detectChanges();
               expect(component.escrowLength()).toBe(10);
          });
     });

     describe('Output signals', () => {
          it('should have toggleInfoPanel output', () => {
               expect(component.toggleInfoPanel).toBeDefined();
               expect(component.toggleInfoPanel.emit).toBeDefined();
          });

          it('should have escrowSelected output', () => {
               expect(component.escrowSelected).toBeDefined();
               expect(component.escrowSelected.emit).toBeDefined();
          });

          it('should emit toggleInfoPanel when called', () => {
               spyOn(component.toggleInfoPanel, 'emit');
               component.toggleInfoPanel.emit();
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should emit escrowSelected when called', () => {
               spyOn(component.escrowSelected, 'emit');
               const mockEscrowData = { EscrowSequence: '123' };
               component.escrowSelected.emit(mockEscrowData);
               expect(component.escrowSelected.emit).toHaveBeenCalledWith(mockEscrowData);
          });
     });

     describe('explorerUrl', () => {
          it('should return explorerUrl from txUiService', () => {
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('onEscrowClick', () => {
          it('should not emit anything when tab is createEscrow', () => {
               spyOn(component.escrowSelected, 'emit');
               spyOn(component.toggleInfoPanel, 'emit');

               component.onEscrowClick(mockEscrow);

               expect(component.escrowSelected.emit).not.toHaveBeenCalled();
               expect(component.toggleInfoPanel.emit).not.toHaveBeenCalled();
               expect(escrowUtilService.onEscrowSelectedInUi).not.toHaveBeenCalled();
          });

          it('should call onEscrowSelectedInUi and emit events when tab is finishEscrow', () => {
               fixture.componentRef.setInput('tab', 'finishEscrow');
               fixture.detectChanges();

               spyOn(component.escrowSelected, 'emit');
               spyOn(component.toggleInfoPanel, 'emit');

               component.onEscrowClick(mockEscrow);

               expect(escrowUtilService.onEscrowSelectedInUi).toHaveBeenCalledWith(mockEscrow);
               expect(component.escrowSelected.emit).toHaveBeenCalledWith(mockEscrow);
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should call onEscrowSelectedInUi and emit events when tab is cancelEscrow', () => {
               fixture.componentRef.setInput('tab', 'cancelEscrow');
               fixture.detectChanges();

               spyOn(component.escrowSelected, 'emit');
               spyOn(component.toggleInfoPanel, 'emit');

               component.onEscrowClick(mockEscrow);

               expect(escrowUtilService.onEscrowSelectedInUi).toHaveBeenCalledWith(mockEscrow);
               expect(component.escrowSelected.emit).toHaveBeenCalledWith(mockEscrow);
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });
     });

     describe('selectEscrow', () => {
          it('should call escrowUtilService.onEscrowSelected with the escrow', () => {
               component.selectEscrow(mockEscrow, 'list');

               expect(escrowUtilService.onEscrowSelected).toHaveBeenCalledWith(mockEscrow);
          });
     });

     describe('summaryText', () => {
          it('should return empty string when infoData is null', () => {
               (escrowTransactionViewModelService.infoData as any).set(null);
               fixture.detectChanges();

               const result = component.summaryText();
               expect(result).toBe('');
          });

          it('should build summary text when infoData exists', () => {
               const result = component.summaryText();

               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 5, 'createEscrow', jasmine.any(Object));
               expect(result).toBe('Test summary text');
          });

          it('should update summary text when tab changes', () => {
               summaryTextConfigService.buildSummaryText.calls.reset();
               fixture.componentRef.setInput('tab', 'finishEscrow');
               fixture.detectChanges();

               component.summaryText();

               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 5, 'finishEscrow', jasmine.any(Object));
          });

          it('should update summary text when escrowCount changes', () => {
               summaryTextConfigService.buildSummaryText.calls.reset();
               (escrowTransactionViewModelService.infoData as any).set({ walletName: 'Test Wallet', escrowCount: 10 });
               fixture.detectChanges();

               const result = component.summaryText();

               expect(result).toBe('Test summary text');
               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 10, 'createEscrow', jasmine.any(Object));
          });
     });

     describe('getActionText', () => {
          it('should return "created." for createEscrow', () => {
               fixture.componentRef.setInput('tab', 'createEscrow');
               fixture.detectChanges();

               const result = component.getActionText();
               expect(result).toBe('created.');
          });

          it('should return "that can be finished." for finishEscrow', () => {
               fixture.componentRef.setInput('tab', 'finishEscrow');
               fixture.detectChanges();

               const result = component.getActionText();
               expect(result).toBe('that can be finished.');
          });

          it('should return "that can be cancelled." for cancelEscrow', () => {
               fixture.componentRef.setInput('tab', 'cancelEscrow');
               fixture.detectChanges();

               const result = component.getActionText();
               expect(result).toBe('that can be cancelled.');
          });

          it('should return empty string for unknown tab', () => {
               fixture.componentRef.setInput('tab', 'unknown' as EscrowActionTypes);
               fixture.detectChanges();

               const result = component.getActionText();
               expect(result).toBe('');
          });
     });

     describe('emptyStateMessage', () => {
          it('should return createEscrow empty message', () => {
               fixture.componentRef.setInput('tab', 'createEscrow');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has not created any Escrows yet.');
          });

          it('should return finishEscrow empty message', () => {
               fixture.componentRef.setInput('tab', 'finishEscrow');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no Escrows to finish.');
          });

          it('should return cancelEscrow empty message', () => {
               fixture.componentRef.setInput('tab', 'cancelEscrow');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no Escrows to cancel.');
          });

          it('should return default message for unknown tab', () => {
               fixture.componentRef.setInput('tab', 'unknown' as EscrowActionTypes);
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('No escrows found.');
          });
     });

     describe('cast methods', () => {
          describe('castToCreateEscrow', () => {
               it('should cast object to create escrow format', () => {
                    const result = component.castToCreateEscrow(mockEscrowForCasting as any);

                    expect(result.tab).toBe('createEscrow');
                    expect(result.EscrowSequence).toBe('123');
                    expect(result.amount).toBe('100');
                    expect(result.destination).toBe('rDestination');
                    expect(result.finishAfter).toBe(mockFinishAfter);
                    expect(result.cancelAfter).toBe(mockCancelAfter);
                    expect(result.isExpired).toBe(false);
                    expect(result.display).toBe('100 XRP → rDestination');
                    expect(result.secondary).toBe('Created: 2024-01-01');
                    expect(result.id).toBe('123');
               });

               it('should handle missing destination', () => {
                    const escrowWithoutDestination = { ...mockEscrowForCasting, destination: undefined };
                    const result = component.castToCreateEscrow(escrowWithoutDestination as any);
                    expect(result.destination).toBe('');
               });
          });

          describe('castToFinishEscrow', () => {
               it('should cast object to finish escrow format', () => {
                    const result = component.castToFinishEscrow(mockEscrowForCasting as any);

                    expect(result.tab).toBe('finishEscrow');
                    expect(result.EscrowSequence).toBe('123');
                    expect(result.amount).toBe('100');
                    expect(result.sender).toBe('rSender');
                    expect(result.finishAfter).toBe(mockFinishAfter);
                    expect(result.cancelAfter).toBe(mockCancelAfter);
                    expect(result.isExpired).toBe(false);
                    expect(result.display).toBe('100 XRP → rDestination');
                    expect(result.secondary).toBe('Created: 2024-01-01');
                    expect(result.id).toBe('123');
               });

               it('should handle missing sender', () => {
                    const escrowWithoutSender = { ...mockEscrowForCasting, sender: undefined };
                    const result = component.castToFinishEscrow(escrowWithoutSender as any);
                    expect(result.sender).toBe('');
               });
          });

          describe('castToCancelEscrow', () => {
               it('should cast object to cancel escrow format', () => {
                    const result = component.castToCancelEscrow(mockEscrowForCasting as any);

                    expect(result.tab).toBe('cancelEscrow');
                    expect(result.EscrowSequence).toBe('123');
                    expect(result.amount).toBe('100');
                    expect(result.destination).toBe('rDestination');
                    expect(result.finishAfter).toBe(mockFinishAfter);
                    expect(result.cancelAfter).toBe(mockCancelAfter);
                    expect(result.isExpired).toBe(false);
                    expect(result.display).toBe('100 XRP → rDestination');
                    expect(result.secondary).toBe('Created: 2024-01-01');
                    expect(result.id).toBe('123');
               });

               it('should handle missing destination', () => {
                    const escrowWithoutDestination = { ...mockEscrowForCasting, destination: undefined };
                    const result = component.castToCancelEscrow(escrowWithoutDestination as any);
                    expect(result.destination).toBe('');
               });
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

          it('should have summaryTextConfigService injected', () => {
               expect(component.summaryTextConfigService).toBe(summaryTextConfigService);
          });

          it('should have utilsService injected', () => {
               expect(component.utilsService).toBe(utilsService);
          });
     });

     describe('Edge cases', () => {
          it('should handle undefined wallet input', () => {
               fixture.componentRef.setInput('wallet', undefined);
               fixture.detectChanges();
               expect(component.wallet()).toBeUndefined();
          });

          it('should handle null wallet input', () => {
               fixture.componentRef.setInput('wallet', null);
               fixture.detectChanges();
               expect(component.wallet()).toBeNull();
          });

          it('should handle zero escrow length', () => {
               fixture.componentRef.setInput('escrowLength', 0);
               fixture.detectChanges();
               expect(component.escrowLength()).toBe(0);
          });

          it('should handle negative escrow length', () => {
               fixture.componentRef.setInput('escrowLength', -1);
               fixture.detectChanges();
               expect(component.escrowLength()).toBe(-1);
          });
     });
});
