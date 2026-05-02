import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NftBurnComponent } from './nft-burn.component';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { DownloadUtilService } from '../../../../services/utils/download-util/download-util.service';
import { NftTransactionOrchestrator } from '../../../../services/nft/nft-orchestrator/nft-orchestrator.service';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';

describe('NftBurnComponent', () => {
     let component: NftBurnComponent;
     let fixture: ComponentFixture<NftBurnComponent>;

     // Services
     let txUiService: any;
     let utilsService: any;
     let trustlineUtilService: any;
     let xrplDateService: any;
     let walletManagerService: any;
     let downloadUtilService: any;
     let trustlineCurrency: any;
     let nftCreateTransactionViewModelService: any;
     let nftCreateStoreService: any;
     let nftUtilService: any;
     let nftTransactionOrchestrator: any;

     // Mock data
     const mockNftItems = [
          { id: 'nft1', display: 'NFT 1', secondary: 'Token 1' },
          { id: 'nft2', display: 'NFT 2', secondary: 'Token 2' },
          { id: 'nft3', display: 'NFT 3', secondary: 'Token 3' },
     ];

     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     beforeEach(async () => {
          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          utilsService = {
               updateAmount: jasmine.createSpy('updateAmount'),
               formatAmount: jasmine.createSpy('formatAmount').and.callFake((val: any) => val),
          };

          trustlineUtilService = {
               loadTrustlines: jasmine.createSpy('loadTrustlines').and.resolveTo(),
          };

          xrplDateService = {
               toLocalDateTimeString: jasmine.createSpy('toLocalDateTimeString').and.returnValue('2024-01-01T00:00:00'),
          };

          walletManagerService = {
               getSelectedWallet: jasmine.createSpy('getSelectedWallet').and.returnValue({ address: 'rTestWallet' }),
          };

          downloadUtilService = {
               download: jasmine.createSpy('download'),
          };

          trustlineCurrency = {
               selectCurrency: jasmine.createSpy('selectCurrency'),
          };

          nftCreateTransactionViewModelService = {};

          nftCreateStoreService = {
               nftId: signal(''),
               expiration: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          nftUtilService = {
               nftItems: jasmine.createSpy('nftItems').and.returnValue(mockNftItems),
               selectedNftItem: jasmine.createSpy('selectedNftItem').and.returnValue(mockNftItems[0]),
          };

          nftTransactionOrchestrator = {};

          await TestBed.configureTestingModule({
               imports: [NftBurnComponent],
               providers: [
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: UtilsService, useValue: utilsService },
                    { provide: TrustlineUtilService, useValue: trustlineUtilService },
                    { provide: XrplDateService, useValue: xrplDateService },
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: DownloadUtilService, useValue: downloadUtilService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrency },
                    { provide: NftTransactionViewModelService, useValue: nftCreateTransactionViewModelService },
                    { provide: CreateNftStoreService, useValue: nftCreateStoreService },
                    { provide: NftUtilService, useValue: nftUtilService },
                    { provide: NftTransactionOrchestrator, useValue: nftTransactionOrchestrator },
               ],
          })
               .overrideComponent(NftBurnComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(NftBurnComponent);
          component = fixture.componentInstance;

          // Set inputs
          component.destinationItems = mockDestinationItems;
          component.selectedDestinationItem = mockDestinationItems[0];
          component.destinationSearchQuery = '';

          fixture.detectChanges();
     });

     afterEach(() => {
          nftCreateStoreService.setField.calls.reset();
          utilsService.updateAmount.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept destinationItems input', () => {
               expect(component.destinationItems).toEqual(mockDestinationItems);
          });

          it('should accept selectedDestinationItem input', () => {
               expect(component.selectedDestinationItem).toEqual(mockDestinationItems[0]);
          });

          it('should accept destinationSearchQuery input', () => {
               expect(component.destinationSearchQuery).toBe('');
          });
     });

     describe('Output emitters', () => {
          it('should have destinationChanged emitter', () => {
               expect(component.destinationChanged).toBeDefined();
               expect(component.destinationChanged.emit).toBeDefined();
          });

          it('should have optionsToggled emitter', () => {
               expect(component.optionsToggled).toBeDefined();
               expect(component.optionsToggled.emit).toBeDefined();
          });

          it('should have expirationToggled emitter', () => {
               expect(component.expirationToggled).toBeDefined();
               expect(component.expirationToggled.emit).toBeDefined();
          });

          it('should have destinationSearchQueryChange emitter', () => {
               expect(component.destinationSearchQueryChange).toBeDefined();
               expect(component.destinationSearchQueryChange.emit).toBeDefined();
          });

          it('should have destinationValueChange emitter', () => {
               expect(component.destinationValueChange).toBeDefined();
               expect(component.destinationValueChange.emit).toBeDefined();
          });
     });

     describe('onFocus', () => {
          it('should format numeric input to 6 decimal places', () => {
               const mockInput = { value: '2.5' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('2.500000');
          });

          it('should format integer to 6 decimal places', () => {
               const mockInput = { value: '10' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('10.000000');
          });

          it('should not modify empty input', () => {
               const mockInput = { value: '' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('');
          });

          it('should not modify non-numeric input', () => {
               const mockInput = { value: 'abc' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('abc');
          });

          it('should handle negative numbers', () => {
               const mockInput = { value: '-5.5' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('-5.500000');
          });
     });

     describe('setNftExpirationDate', () => {
          it('should set expiration field in store', () => {
               const testDate = '2024-12-31T00:00:00';
               component.setNftExpirationDate(testDate);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('expiration', testDate);
          });
     });

     describe('onNftSelected', () => {
          it('should set nftId when item is provided with id', () => {
               const item = { id: 'nft123', display: 'NFT 1' } as SelectItem;
               component.onNftSelected(item);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', 'nft123');
          });

          it('should handle item with undefined id', () => {
               const item = { display: 'NFT 1' } as SelectItem;
               component.onNftSelected(item);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', '');
          });

          it('should handle null item', () => {
               component.onNftSelected(null);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', '');
          });
     });

     describe('Service injections', () => {
          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiService);
          });

          it('should have utilsService injected', () => {
               expect(component.utilsService).toBe(utilsService);
          });

          it('should have trustlineUtilService injected', () => {
               expect(component.trustlineUtilService).toBe(trustlineUtilService);
          });

          it('should have xrplDateService injected', () => {
               expect(component.xrplDateService).toBe(xrplDateService);
          });

          it('should have walletManagerService injected', () => {
               expect(component.walletManagerService).toBe(walletManagerService);
          });

          it('should have downloadUtilService injected', () => {
               expect(component.downloadUtilService).toBe(downloadUtilService);
          });

          it('should have trustlineCurrency injected', () => {
               expect(component.trustlineCurrency).toBe(trustlineCurrency);
          });

          it('should have nftCreateTransactionViewModelService injected', () => {
               expect(component.nftCreateTransactionViewModelService).toBe(nftCreateTransactionViewModelService);
          });

          it('should have nftCreateStoreService injected', () => {
               expect(component.nftCreateStoreService).toBe(nftCreateStoreService);
          });

          it('should have nftUtilService injected', () => {
               expect(component.nftUtilService).toBe(nftUtilService);
          });

          it('should have nftTransactionOrchestrator injected', () => {
               expect(component.nftTransactionOrchestrator).toBe(nftTransactionOrchestrator);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          // it('should have nftItems available for template', () => {
          //      const items = component.nftUtilService.nftItems();
          //      expect(items).toEqual(mockNftItems);
          //      expect(items.length).toBe(3);
          // });

          // it('should have selectedNftItem available for template', () => {
          //      const selected = component.nftUtilService.selectedNftItem();
          //      expect(selected).toEqual(mockNftItems[0]);
          // });

          it('should have nftId signal available for template', () => {
               expect(component.nftCreateStoreService.nftId).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty destinationItems array', () => {
               component.destinationItems = [];
               fixture.detectChanges();
               expect(component.destinationItems).toEqual([]);
          });

          it('should handle null selectedDestinationItem', () => {
               component.selectedDestinationItem = null;
               fixture.detectChanges();
               expect(component.selectedDestinationItem).toBeNull();
          });

          it('should handle empty nftItems', () => {
               nftUtilService.nftItems.and.returnValue([]);
               const items = component.nftUtilService.nftItems();
               expect(items).toEqual([]);
          });

          it('should handle undefined selectedNftItem', () => {
               nftUtilService.selectedNftItem.and.returnValue(null);
               const selected = component.nftUtilService.selectedNftItem();
               expect(selected).toBeNull();
          });

          it('should handle long NFT IDs', () => {
               const longId = 'a'.repeat(1000);
               component.onNftSelected({ id: longId } as SelectItem);
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', longId);
          });

          it('should handle rapid nft selection changes', () => {
               for (let i = 0; i < 10; i++) {
                    component.onNftSelected({ id: `nft${i}` } as SelectItem);
               }

               expect(nftCreateStoreService.setField).toHaveBeenCalledTimes(10);
          });
     });
});
