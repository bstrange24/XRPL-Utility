import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ChecksSummaryComponent } from './checks-summary.component';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { CheckActionTypes } from '../../constants/checks.types';

describe('ChecksSummaryComponent', () => {
     let component: ChecksSummaryComponent;
     let fixture: ComponentFixture<ChecksSummaryComponent>;
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let txUiService: any;
     let checkUtilService: jasmine.SpyObj<CheckUtilService>;
     let checksTransactionViewModelService: any;
     let summaryTextConfigService: jasmine.SpyObj<SummaryTextConfigService>;
     let utilsService: jasmine.SpyObj<UtilsService>;

     // Use WritableSignal
     let infoDataSignal: WritableSignal<any>;

     const mockWallet = { address: 'rTestAddress123' };
     const mockCheck = {
          index: 1,
          amount: '100',
          destination: 'rDestination',
          sendMax: '100',
          destinationTag: 12345,
          expiration: '2024-12-31',
          isExpired: false,
          display: '100 XRP → rDestination',
          secondary: 'Created: 2024-01-01',
          id: 'check123',
     };

     const mockInfoData = {
          walletName: 'Test Wallet',
          checkCount: 5,
     };

     beforeEach(async () => {
          // Create writable signal
          infoDataSignal = signal(mockInfoData);

          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copy']);
          txUiService = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };
          checkUtilService = jasmine.createSpyObj('CheckUtilService', ['onCheckSelected']);
          checksTransactionViewModelService = {
               infoData: infoDataSignal,
               activeTab: signal('createCheck'),
          };
          summaryTextConfigService = jasmine.createSpyObj('SummaryTextConfigService', ['buildSummaryText']);
          utilsService = jasmine.createSpyObj('UtilsService', ['formatAmount']);

          summaryTextConfigService.buildSummaryText.and.returnValue('Test summary text');

          await TestBed.configureTestingModule({
               imports: [ChecksSummaryComponent],
               providers: [
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: CheckUtilService, useValue: checkUtilService },
                    { provide: ChecksTransactionViewModelService, useValue: checksTransactionViewModelService },
                    { provide: SummaryTextConfigService, useValue: summaryTextConfigService },
                    { provide: UtilsService, useValue: utilsService },
               ],
          })
               .overrideComponent(ChecksSummaryComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksSummaryComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('wallet', mockWallet);
          fixture.componentRef.setInput('checksLength', 5);
          fixture.componentRef.setInput('tab', 'createCheck');
          fixture.componentRef.setInput('infoPanelExpanded', false);

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept wallet input', () => {
               expect(component.wallet()).toEqual(mockWallet);
          });

          it('should accept checksLength input', () => {
               expect(component.checksLength()).toBe(5);
          });

          it('should accept tab input', () => {
               expect(component.tab()).toBe('createCheck');
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

          it('should update checksLength when changed', () => {
               fixture.componentRef.setInput('checksLength', 10);
               fixture.detectChanges();
               expect(component.checksLength()).toBe(10);
          });
     });

     describe('Output signals', () => {
          it('should have toggleInfoPanel output', () => {
               expect(component.toggleInfoPanel).toBeDefined();
               expect(component.toggleInfoPanel.emit).toBeDefined();
          });

          it('should have checkSelected output', () => {
               expect(component.checkSelected).toBeDefined();
               expect(component.checkSelected.emit).toBeDefined();
          });

          it('should emit toggleInfoPanel when called', () => {
               spyOn(component.toggleInfoPanel, 'emit');
               component.toggleInfoPanel.emit();
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should emit checkSelected when called', () => {
               spyOn(component.checkSelected, 'emit');
               const mockCheckData = { id: 'check123' };
               component.checkSelected.emit(mockCheckData);
               expect(component.checkSelected.emit).toHaveBeenCalledWith(mockCheckData);
          });
     });

     describe('Computed signals', () => {
          describe('summaryText', () => {
               it('should return empty string when infoData is null', () => {
                    infoDataSignal.set(null);
                    fixture.detectChanges();

                    const result = component.summaryText();
                    expect(result).toBe('');
               });

               it('should build summary text when infoData exists', () => {
                    const result = component.summaryText();
                    expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 5, 'createCheck', jasmine.any(Object));
                    expect(result).toBe('Test summary text');
               });

               it('should update summary text when tab changes', () => {
                    summaryTextConfigService.buildSummaryText.calls.reset();
                    fixture.componentRef.setInput('tab', 'cashCheck');
                    fixture.detectChanges();

                    component.summaryText();
                    expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 5, 'cashCheck', jasmine.any(Object));
               });

               it('should update summary text when infoData checkCount changes', () => {
                    summaryTextConfigService.buildSummaryText.calls.reset();
                    infoDataSignal.set({ walletName: 'Test Wallet', checkCount: 10 });
                    fixture.detectChanges();

                    const result = component.summaryText();
                    expect(result).toBe('Test summary text');
                    expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 10, 'createCheck', jasmine.any(Object));
               });
          });

          describe('emptyStateMessage', () => {
               it('should return empty string when check count > 0', () => {
                    const result = component.emptyStateMessage();
                    expect(result).toBe('');
               });

               it('should return createCheck empty message when count is 0 and tab is createCheck', () => {
                    infoDataSignal.set({ walletName: 'Test', checkCount: 0 });
                    fixture.componentRef.setInput('tab', 'createCheck');
                    fixture.detectChanges();

                    const result = component.emptyStateMessage();
                    expect(result).toBe('This wallet has not created any Checks yet.');
               });

               it('should return cashCheck empty message when count is 0 and tab is cashCheck', () => {
                    infoDataSignal.set({ walletName: 'Test', checkCount: 0 });
                    fixture.componentRef.setInput('tab', 'cashCheck');
                    fixture.detectChanges();

                    const result = component.emptyStateMessage();
                    expect(result).toBe('This wallet has no Checks to cash.');
               });

               it('should return cancelCheck empty message when count is 0 and tab is cancelCheck', () => {
                    infoDataSignal.set({ walletName: 'Test', checkCount: 0 });
                    fixture.componentRef.setInput('tab', 'cancelCheck');
                    fixture.detectChanges();

                    const result = component.emptyStateMessage();
                    expect(result).toBe('This wallet has no Checks to cancel.');
               });

               it('should return default message when count is 0 and tab is unknown', () => {
                    infoDataSignal.set({ walletName: 'Test', checkCount: 0 });
                    fixture.componentRef.setInput('tab', 'unknown' as CheckActionTypes);
                    fixture.detectChanges();

                    const result = component.emptyStateMessage();
                    expect(result).toBe('No checks found.');
               });

               it('should handle undefined infoData', () => {
                    infoDataSignal.set(undefined);
                    fixture.componentRef.setInput('tab', 'createCheck');
                    fixture.detectChanges();

                    const result = component.emptyStateMessage();
                    expect(result).toBe('This wallet has not created any Checks yet.');
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

          it('should have checkUtilService injected', () => {
               expect(component.checkUtilService).toBe(checkUtilService);
          });

          it('should have checksTransactionViewModelService injected', () => {
               expect(component.checksTransactionViewModelService).toBe(checksTransactionViewModelService);
          });

          it('should have summaryTextConfigService injected', () => {
               expect(component.summaryTextConfigService).toBe(summaryTextConfigService);
          });

          it('should have utilsService injected', () => {
               expect(component.utilsService).toBe(utilsService);
          });
     });

     describe('explorerUrl', () => {
          it('should return explorerUrl from txUiService', () => {
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('onCheckClick', () => {
          it('should not emit anything when tab is createCheck', () => {
               spyOn(component.checkSelected, 'emit');
               spyOn(component.toggleInfoPanel, 'emit');

               component.onCheckClick(mockCheck);

               expect(component.checkSelected.emit).not.toHaveBeenCalled();
               expect(component.toggleInfoPanel.emit).not.toHaveBeenCalled();
          });

          it('should emit checkSelected and toggleInfoPanel when tab is cashCheck', () => {
               fixture.componentRef.setInput('tab', 'cashCheck');
               fixture.detectChanges();

               spyOn(component.checkSelected, 'emit');
               spyOn(component.toggleInfoPanel, 'emit');

               component.onCheckClick(mockCheck);

               expect(component.checkSelected.emit).toHaveBeenCalledWith(mockCheck);
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should emit checkSelected and toggleInfoPanel when tab is cancelCheck', () => {
               fixture.componentRef.setInput('tab', 'cancelCheck');
               fixture.detectChanges();

               spyOn(component.checkSelected, 'emit');
               spyOn(component.toggleInfoPanel, 'emit');

               component.onCheckClick(mockCheck);

               expect(component.checkSelected.emit).toHaveBeenCalledWith(mockCheck);
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });
     });

     describe('selectCheck', () => {
          it('should call checkUtilService.onCheckSelected with the check', () => {
               component.selectCheck(mockCheck, 'list');

               expect(checkUtilService.onCheckSelected).toHaveBeenCalledWith(mockCheck);
          });
     });

     describe('castToCreateCheck', () => {
          it('should cast CreateCheckItem correctly', () => {
               const createCheck = {
                    ...mockCheck,
                    destination: 'rDestination',
                    sendMax: '100',
               } as any;

               const result = component.castToCreateCheck(createCheck);

               expect(result.tab).toBe('createCheck');
               expect(result.index).toBe(createCheck.index);
               expect(result.amount).toBe(createCheck.amount);
               expect(result.destination).toBe(createCheck.destination);
               expect(result.sendMax).toBe(createCheck.sendMax);
               expect(result.destinationTag).toBe(createCheck.destinationTag);
               expect(result.expiration).toBe(createCheck.expiration);
               expect(result.isExpired).toBe(createCheck.isExpired);
               expect(result.display).toBe(createCheck.display);
               expect(result.secondary).toBe(createCheck.secondary);
               expect(result.id).toBe(createCheck.id);
          });

          it('should handle missing destination', () => {
               const createCheck = { ...mockCheck, destination: undefined } as any;
               const result = component.castToCreateCheck(createCheck);
               expect(result.destination).toBe('');
          });
     });

     describe('castToCashCheck', () => {
          it('should cast CashCheckItem correctly', () => {
               const cashCheck = {
                    ...mockCheck,
                    sender: 'rSender',
                    sendMax: '100',
               } as any;

               const result = component.castToCashCheck(cashCheck);

               expect(result.tab).toBe('cashCheck');
               expect(result.index).toBe(cashCheck.index);
               expect(result.amount).toBe(cashCheck.amount);
               expect(result.sender).toBe(cashCheck.sender);
               expect(result.sendMax).toBe(cashCheck.sendMax);
               expect(result.destinationTag).toBe(cashCheck.destinationTag);
               expect(result.expiration).toBe(cashCheck.expiration);
               expect(result.isExpired).toBe(cashCheck.isExpired);
               expect(result.display).toBe(cashCheck.display);
               expect(result.secondary).toBe(cashCheck.secondary);
               expect(result.id).toBe(cashCheck.id);
          });

          it('should handle missing sender', () => {
               const cashCheck = { ...mockCheck, sender: undefined } as any;
               const result = component.castToCashCheck(cashCheck);
               expect(result.sender).toBe('');
          });
     });

     describe('castToCancelCheck', () => {
          it('should cast CancelCheckItem correctly', () => {
               const cancelCheck = {
                    ...mockCheck,
                    destination: 'rDestination',
                    sendMax: '100',
               } as any;

               const result = component.castToCancelCheck(cancelCheck);

               expect(result.tab).toBe('cancelCheck');
               expect(result.index).toBe(cancelCheck.index);
               expect(result.amount).toBe(cancelCheck.amount);
               expect(result.destination).toBe(cancelCheck.destination);
               expect(result.sendMax).toBe(cancelCheck.sendMax);
               expect(result.destinationTag).toBe(cancelCheck.destinationTag);
               expect(result.expiration).toBe(cancelCheck.expiration);
               expect(result.isExpired).toBe(cancelCheck.isExpired);
               expect(result.display).toBe(cancelCheck.display);
               expect(result.secondary).toBe(cancelCheck.secondary);
               expect(result.id).toBe(cancelCheck.id);
          });

          it('should handle missing destination', () => {
               const cancelCheck = { ...mockCheck, destination: undefined } as any;
               const result = component.castToCancelCheck(cancelCheck);
               expect(result.destination).toBe('');
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

          it('should handle zero checks length', () => {
               fixture.componentRef.setInput('checksLength', 0);
               fixture.detectChanges();
               expect(component.checksLength()).toBe(0);
          });

          it('should handle negative checks length', () => {
               fixture.componentRef.setInput('checksLength', -1);
               fixture.detectChanges();
               expect(component.checksLength()).toBe(-1);
          });

          it('should handle infoData with undefined checkCount', () => {
               infoDataSignal.set({ walletName: 'Test', checkCount: undefined });
               fixture.componentRef.setInput('tab', 'createCheck');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has not created any Checks yet.');
          });
     });
});
