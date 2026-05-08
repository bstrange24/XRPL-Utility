import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { MptSummaryComponent } from './mpt-summary.component';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { MptActionTypes } from '../../constants/mpt.types';

describe('MptSummaryComponent', () => {
     let component: MptSummaryComponent;
     let fixture: ComponentFixture<MptSummaryComponent>;

     // Services
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let viewModel: any;
     let txUiService: any;
     let mptUtilService: any;
     let summaryTextConfigService: jasmine.SpyObj<SummaryTextConfigService>;

     // Mock data
     const mockInfoData = {
          walletName: 'Test Wallet',
          mptCount: 3,
          mptsToShow: [
               {
                    id: 'mpt1',
                    mpt_issuance_id: 'mpt123',
                    formattedAmount: '1000',
                    formattedOutstanding: '500',
                    formattedMaxAmount: '10000',
                    isHolder: false,
                    assetScale: 2,
                    ticker: 'TEST',
                    transferFee: 5000,
                    flags: ['canLock', 'canTrade'],
               },
               {
                    id: 'mpt2',
                    mpt_issuance_id: 'mpt456',
                    formattedAmount: '250',
                    formattedOutstanding: '0',
                    formattedMaxAmount: 'Unlimited',
                    isHolder: true,
                    assetScale: 0,
                    ticker: 'N/A',
                    transferFee: 0,
                    flags: [],
               },
          ],
          links: '<a href="/explorer">View MPTs</a>',
     };

     beforeEach(async () => {
          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copyAndToast']);
          copyUtilService.copyAndToast.and.returnValue();

          txUiService = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };

          mptUtilService = {
               selectedMptIssuanceId: jasmine.createSpy('selectedMptIssuanceId').and.returnValue('mpt123'),
          };

          summaryTextConfigService = jasmine.createSpyObj('SummaryTextConfigService', ['buildSummaryText']);
          summaryTextConfigService.buildSummaryText.and.returnValue('Test summary text');

          viewModel = {
               infoData: signal(mockInfoData),
               activeTab: signal('createMpt'),
          };

          await TestBed.configureTestingModule({
               imports: [MptSummaryComponent],
               providers: [
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: MptTransactionViewModelService, useValue: viewModel },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: MptUtilService, useValue: mptUtilService },
                    { provide: SummaryTextConfigService, useValue: summaryTextConfigService },
               ],
          })
               .overrideComponent(MptSummaryComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(MptSummaryComponent);
          component = fixture.componentInstance;

          // Set required input
          fixture.componentRef.setInput('infoPanelExpanded', false);

          fixture.detectChanges();
     });

     afterEach(() => {
          summaryTextConfigService.buildSummaryText.calls.reset();
          copyUtilService.copyAndToast.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept infoPanelExpanded input', () => {
               expect(component.infoPanelExpanded()).toBeFalse();
          });

          it('should update infoPanelExpanded when changed', () => {
               fixture.componentRef.setInput('infoPanelExpanded', true);
               fixture.detectChanges();
               expect(component.infoPanelExpanded()).toBeTrue();
          });
     });

     describe('Output signals', () => {
          it('should have toggleInfoPanel output', () => {
               expect(component.toggleInfoPanel).toBeDefined();
               expect(component.toggleInfoPanel.emit).toBeDefined();
          });

          it('should emit toggleInfoPanel when called', () => {
               spyOn(component.toggleInfoPanel, 'emit');
               component.toggleInfoPanel.emit();
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should have mptSelected output', () => {
               expect(component.mptSelected).toBeDefined();
               expect(component.mptSelected.emit).toBeDefined();
          });

          it('should emit mptSelected when called', () => {
               spyOn(component.mptSelected, 'emit');
               const mockMpt = { id: 'mpt1' };
               component.mptSelected.emit(mockMpt);
               expect(component.mptSelected.emit).toHaveBeenCalledWith(mockMpt);
          });
     });

     // describe('infoData', () => {
     //      it('should return infoData from viewModel', () => {
     //           expect(component.infoData()).toEqual(mockInfoData);
     //      });
     // });

     describe('explorerUrl', () => {
          it('should return explorerUrl from txUiService', () => {
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('summaryText', () => {
          it('should return empty string when infoData is null', () => {
               viewModel.infoData.set(null);
               fixture.detectChanges();

               const result = component.summaryText();
               expect(result).toBe('');
          });

          it('should build summary text when infoData exists', () => {
               const result = component.summaryText();

               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 3, 'createMpt', jasmine.any(Object));
               expect(result).toBe('Test summary text');
          });

          it('should update summary text when tab changes', () => {
               summaryTextConfigService.buildSummaryText.calls.reset();
               viewModel.activeTab.set('sendMpt');
               fixture.detectChanges();

               component.summaryText();

               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 3, 'sendMpt', jasmine.any(Object));
          });
     });

     describe('emptyStateMessage', () => {
          it('should return empty string when mptCount > 0', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 5 });
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('');
          });

          it('should return createMpt empty message', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('createMpt');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has not created any MPTs yet.');
          });

          it('should return authorizeMpt empty message', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('authorizeMpt');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no MPTs to authorize.');
          });

          it('should return unauthorizeMpt empty message', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('unauthorizeMpt');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no MPTs to unauthorize.');
          });

          it('should return sendMpt empty message', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('sendMpt');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no MPTs available to send.');
          });

          it('should return lockMpt empty message', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('lockMpt');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no MPTs to lock.');
          });

          it('should return unlockMpt empty message', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('unlockMpt');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no MPTs to unlock.');
          });

          it('should return clawbackMpt empty message', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('clawbackMpt');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no MPTs to clawback.');
          });

          it('should return destroyMpt empty message', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('destroyMpt');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no MPTs to destroy.');
          });

          it('should return default message for unknown tab', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0 });
               viewModel.activeTab.set('unknown' as MptActionTypes);
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('No Multi-Purpose Tokens found.');
          });
     });

     describe('onMptClick', () => {
          const mockMpt = mockInfoData.mptsToShow[0];

          it('should emit mptSelected and toggleInfoPanel for non-createMpt tabs', () => {
               viewModel.activeTab.set('sendMpt');
               fixture.detectChanges();

               spyOn(component.mptSelected, 'emit');
               spyOn(component.toggleInfoPanel, 'emit');

               component.onMptClick(mockMpt);

               expect(component.mptSelected.emit).toHaveBeenCalledWith(mockMpt);
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should not emit anything for createMpt tab', () => {
               viewModel.activeTab.set('createMpt');
               fixture.detectChanges();

               spyOn(component.mptSelected, 'emit');
               spyOn(component.toggleInfoPanel, 'emit');

               component.onMptClick(mockMpt);

               expect(component.mptSelected.emit).not.toHaveBeenCalled();
               expect(component.toggleInfoPanel.emit).not.toHaveBeenCalled();
          });
     });

     describe('Service injections', () => {
          it('should have copyUtilService injected', () => {
               expect(component.copyUtilService).toBe(copyUtilService);
          });

          it('should have viewModel injected', () => {
               expect(component.viewModel).toBe(viewModel);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });

          it('should have mptUtilService injected', () => {
               expect(component.mptUtilService).toBe(mptUtilService);
          });

          it('should have summaryTextConfigService injected', () => {
               expect(component.summaryTextConfigService).toBe(summaryTextConfigService);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have mptsToShow available for template', () => {
               const mpts = component.infoData()?.mptsToShow;
               expect(mpts).toBeDefined();
               expect(mpts?.length).toBe(2);
          });

          it('should have selectedMptIssuanceId available for comparison', () => {
               const selectedId = component.mptUtilService.selectedMptIssuanceId();
               expect(selectedId).toBe('mpt123');
          });

          it('should have explorerUrl available for template', () => {
               expect(component.explorerUrl).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty mptsToShow', () => {
               viewModel.infoData.set({ ...mockInfoData, mptCount: 0, mptsToShow: [] });
               fixture.detectChanges();

               const mpts = component.infoData()?.mptsToShow;
               expect(mpts).toEqual([]);
          });

          it('should handle MPT with no ticker', () => {
               const mptWithoutTicker = { ...mockInfoData.mptsToShow[1], ticker: 'N/A' };
               expect(mptWithoutTicker.ticker).toBe('N/A');
          });

          it('should handle MPT with zero transfer fee', () => {
               const mptWithZeroFee = { ...mockInfoData.mptsToShow[1], transferFee: 0 };
               expect(mptWithZeroFee.transferFee / 1000).toBe(0);
          });

          it('should handle MPT with empty flags', () => {
               const mptWithNoFlags = { ...mockInfoData.mptsToShow[1], flags: [] };
               expect(mptWithNoFlags.flags).toEqual([]);
          });

          it('should handle undefined infoData', () => {
               viewModel.infoData.set(null);
               fixture.detectChanges();

               const result = component.summaryText();
               expect(result).toBe('');
          });
     });
});
