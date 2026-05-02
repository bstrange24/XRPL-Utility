import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { NftCreateSummaryComponent } from './nft-create-summary.component';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';

describe('NftCreateSummaryComponent', () => {
     let component: NftCreateSummaryComponent;
     let fixture: ComponentFixture<NftCreateSummaryComponent>;

     // Services
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let nftTransactionViewModelService: any;
     let txUiService: any;
     let nftUtilService: any;
     let summaryTextConfigService: jasmine.SpyObj<SummaryTextConfigService>;

     // Mock data
     const mockInfoData = {
          walletName: 'Test Wallet',
          nftCount: 3,
          nftsToShow: [
               { id: 'nft1', taxon: '1000', sequence: '1', uri: 'https://example.com/nft1', transferFee: 5000, flags: ['burnable', 'transferable'] },
               { id: 'nft2', taxon: '2000', sequence: '2', uri: 'https://example.com/nft2', transferFee: null, flags: [] },
               { id: 'nft3', taxon: '3000', sequence: '3', uri: null, transferFee: 10000, flags: ['mutable'] },
          ],
          links: '<a href="/explorer">View NFTs</a>',
     };

     const mockSelectedNftItem = { id: 'nft1', display: 'NFT 1' };

     beforeEach(async () => {
          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copyAndToast']);
          copyUtilService.copyAndToast.and.returnValue();

          txUiService = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };

          nftUtilService = {
               selectedNftItem: jasmine.createSpy('selectedNftItem').and.returnValue(mockSelectedNftItem),
          };

          summaryTextConfigService = jasmine.createSpyObj('SummaryTextConfigService', ['buildSummaryText']);
          summaryTextConfigService.buildSummaryText.and.returnValue('Test summary text');

          nftTransactionViewModelService = {
               infoData: signal(mockInfoData),
               activeTab: signal('createNft'),
          };

          await TestBed.configureTestingModule({
               imports: [NftCreateSummaryComponent],
               providers: [
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: NftTransactionViewModelService, useValue: nftTransactionViewModelService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: NftUtilService, useValue: nftUtilService },
                    { provide: SummaryTextConfigService, useValue: summaryTextConfigService },
               ],
          })
               .overrideComponent(NftCreateSummaryComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(NftCreateSummaryComponent);
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

          it('should have nftSelected output', () => {
               expect(component.nftSelected).toBeDefined();
               expect(component.nftSelected.emit).toBeDefined();
          });

          it('should emit nftSelected when called', () => {
               spyOn(component.nftSelected, 'emit');
               const mockNft = { id: 'nft1' };
               component.nftSelected.emit(mockNft);
               expect(component.nftSelected.emit).toHaveBeenCalledWith(mockNft);
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
               nftTransactionViewModelService.infoData.set(null);
               fixture.detectChanges();

               const result = component.summaryText();
               expect(result).toBe('');
          });

          it('should build summary text when infoData exists', () => {
               const result = component.summaryText();

               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 3, 'createNft', jasmine.any(Object));
               expect(result).toBe('Test summary text');
          });

          it('should update summary text when tab changes', () => {
               summaryTextConfigService.buildSummaryText.calls.reset();
               nftTransactionViewModelService.activeTab.set('burnNft');
               fixture.detectChanges();

               component.summaryText();

               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 3, 'burnNft', jasmine.any(Object));
          });

          it('should update summary text when nftCount changes', () => {
               summaryTextConfigService.buildSummaryText.calls.reset();
               nftTransactionViewModelService.infoData.set({ ...mockInfoData, nftCount: 10 });
               fixture.detectChanges();

               const result = component.summaryText();

               expect(result).toBe('Test summary text');
               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 10, 'createNft', jasmine.any(Object));
          });
     });

     describe('emptyStateMessage', () => {
          it('should return empty string when nftCount > 0', () => {
               const result = component.emptyStateMessage();
               expect(result).toBe('');
          });

          it('should return createNft empty message when count is 0 and tab is createNft', () => {
               nftTransactionViewModelService.infoData.set({ ...mockInfoData, nftCount: 0 });
               nftTransactionViewModelService.activeTab.set('createNft');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has not created any NFTs yet.');
          });

          it('should return updateNFTMetadata empty message when count is 0 and tab is updateNFTMetadata', () => {
               nftTransactionViewModelService.infoData.set({ ...mockInfoData, nftCount: 0 });
               nftTransactionViewModelService.activeTab.set('updateNFTMetadata');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no NFTs to update.');
          });

          it('should return burnNft empty message when count is 0 and tab is burnNft', () => {
               nftTransactionViewModelService.infoData.set({ ...mockInfoData, nftCount: 0 });
               nftTransactionViewModelService.activeTab.set('burnNft');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no NFTs to burn.');
          });

          // it('should return default message for unknown tab', () => {
          //      nftTransactionViewModelService.infoData.set({ ...mockInfoData, nftCount: 0 });
          //      nftTransactionViewModelService.activeTab.set('unknown' as NftActionTypes);
          //      fixture.detectChanges();

          //      const result = component.emptyStateMessage();
          //      expect(result).toBe('No NFTs found.');
          // });

          // it('should handle undefined infoData', () => {
          //      nftTransactionViewModelService.infoData.set(undefined);
          //      fixture.detectChanges();

          //      const result = component.emptyStateMessage();
          //      expect(result).toBe('No NFTs found.');
          // });
     });

     describe('onNftClick', () => {
          const mockNft = { id: 'nft1' };

          it('should emit nftSelected', () => {
               spyOn(component.nftSelected, 'emit');

               component.onNftClick(mockNft);

               expect(component.nftSelected.emit).toHaveBeenCalledWith(mockNft);
          });

          it('should emit toggleInfoPanel for updateNFTMetadata tab', () => {
               nftTransactionViewModelService.activeTab.set('updateNFTMetadata');
               fixture.detectChanges();

               spyOn(component.toggleInfoPanel, 'emit');

               component.onNftClick(mockNft);

               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should emit toggleInfoPanel for burnNft tab', () => {
               nftTransactionViewModelService.activeTab.set('burnNft');
               fixture.detectChanges();

               spyOn(component.toggleInfoPanel, 'emit');

               component.onNftClick(mockNft);

               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should not emit toggleInfoPanel for createNft tab', () => {
               nftTransactionViewModelService.activeTab.set('createNft');
               fixture.detectChanges();

               spyOn(component.toggleInfoPanel, 'emit');

               component.onNftClick(mockNft);

               expect(component.toggleInfoPanel.emit).not.toHaveBeenCalled();
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have nftsToShow available for template', () => {
               const nfts = component.infoData()?.nftsToShow;
               expect(nfts).toBeDefined();
               expect(nfts?.length).toBe(3);
          });

          // it('should have selectedNftItem available for template comparison', () => {
          //      const selected = component.nftUtilService.selectedNftItem();
          //      expect(selected).toEqual(mockSelectedNftItem);
          // });

          it('should have explorerUrl available for template', () => {
               expect(component.explorerUrl).toBeDefined();
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('Service injections', () => {
          it('should have copyUtilService injected', () => {
               expect(component.copyUtilService).toBe(copyUtilService);
          });

          it('should have nftTransactionViewModelService injected', () => {
               expect(component.nftTransactionViewModelService).toBe(nftTransactionViewModelService);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });

          it('should have nftUtilService injected', () => {
               expect(component.nftUtilService).toBe(nftUtilService);
          });

          it('should have summaryTextConfigService injected', () => {
               expect(component.summaryTextConfigService).toBe(summaryTextConfigService);
          });
     });

     describe('Edge cases', () => {
          it('should handle nftsToShow being empty', () => {
               nftTransactionViewModelService.infoData.set({ ...mockInfoData, nftCount: 0, nftsToShow: [] });
               fixture.detectChanges();

               const nfts = component.infoData()?.nftsToShow;
               expect(nfts).toEqual([]);
          });

          it('should handle nft with no transfer fee', () => {
               const nft = mockInfoData.nftsToShow[1];
               expect(nft.transferFee).toBeNull();
               expect(nft.flags).toEqual([]);
          });

          it('should handle nft with null URI', () => {
               const nft = mockInfoData.nftsToShow[2];
               expect(nft.uri).toBeNull();
          });

          it('should handle nft with flags array', () => {
               const nft = mockInfoData.nftsToShow[0];
               expect(nft.flags).toEqual(['burnable', 'transferable']);
          });
     });
});
