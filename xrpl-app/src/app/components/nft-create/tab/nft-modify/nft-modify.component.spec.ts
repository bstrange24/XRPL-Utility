import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NftModifyComponent } from './nft-modify.component';
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

describe('NftModifyComponent', () => {
     let component: NftModifyComponent;
     let fixture: ComponentFixture<NftModifyComponent>;

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

     // Define signals as functions that return values
     let initialURIValue: string = '';

     // Mock data
     const mockNftItems = [
          { id: 'nft1', display: 'NFT 1', secondary: 'Token 1' },
          { id: 'nft2', display: 'NFT 2', secondary: 'Token 2' },
     ];

     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     beforeEach(async () => {
          // Reset value
          initialURIValue = '';

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
               nftId: jasmine.createSpy('nftId').and.returnValue(''),
               // Make initialURI a function that returns the current value
               initialURI: jasmine.createSpy('initialURI').and.callFake(() => initialURIValue),
               nftOwnerAddress: jasmine.createSpy('nftOwnerAddress').and.returnValue(''),
               setField: jasmine.createSpy('setField'),
          };

          nftUtilService = {
               nftItems: jasmine.createSpy('nftItems').and.returnValue(mockNftItems),
               selectedNftItem: jasmine.createSpy('selectedNftItem').and.returnValue(mockNftItems[0]),
          };

          nftTransactionOrchestrator = {};

          await TestBed.configureTestingModule({
               imports: [NftModifyComponent],
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
               .overrideComponent(NftModifyComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(NftModifyComponent);
          component = fixture.componentInstance;

          // Set inputs
          component.destinationItems = mockDestinationItems;
          component.selectedDestinationItem = mockDestinationItems[0];
          component.destinationSearchQuery = '';

          fixture.detectChanges();
     });

     afterEach(() => {
          nftCreateStoreService.setField.calls.reset();
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
     });

     describe('setNftExpirationDate', () => {
          it('should set expiration field in store', () => {
               const testDate = '2024-12-31T00:00:00';
               component.setNftExpirationDate(testDate);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('expiration', testDate);
          });
     });

     describe('onNftSelected', () => {
          it('should set nftId when item is provided', () => {
               const item = { id: 'nft123', display: 'NFT 1' } as SelectItem;
               component.onNftSelected(item);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', 'nft123');
          });

          it('should handle null item', () => {
               component.onNftSelected(null);

               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', '');
          });
     });

     describe('uriByteLength', () => {
          it('should return 0 when URI is empty', () => {
               initialURIValue = '';
               const length = component.uriByteLength();
               expect(length).toBe(0);
          });

          // it('should calculate correct byte length for hex-encoded URI', () => {
          //      initialURIValue = '48656c6c6f'; // "Hello" in hex (10 chars = 5 bytes)
          //      const length = component.uriByteLength();
          //      expect(length).toBe(10 / 2); // 5 bytes
          // });

          // it('should handle even-length hex strings', () => {
          //      initialURIValue = 'aabbccdd'; // 8 chars = 4 bytes
          //      const length = component.uriByteLength();
          //      expect(length).toBe(8 / 2); // 4 bytes
          // });
     });

     describe('selectedNftIsNotMutable', () => {
          it('should return false (placeholder implementation)', () => {
               expect(component.selectedNftIsNotMutable()).toBeFalse();
          });
     });

     describe('selectedNftOwnerMismatch', () => {
          it('should return false (placeholder implementation)', () => {
               expect(component.selectedNftOwnerMismatch()).toBeFalse();
          });
     });

     describe('selectedNftIsNotBurnable', () => {
          it('should return false (placeholder implementation)', () => {
               expect(component.selectedNftIsNotBurnable()).toBeFalse();
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

          it('should have nftCreateStoreService injected', () => {
               expect(component.nftCreateStoreService).toBe(nftCreateStoreService);
          });

          it('should have nftUtilService injected', () => {
               expect(component.nftUtilService).toBe(nftUtilService);
          });
     });

     // describe('Template bindings (indirect tests)', () => {
     //      it('should have nftItems available for template', () => {
     //           const items = component.nftUtilService.nftItems();
     //           expect(items).toEqual(mockNftItems);
     //      });

     //      it('should have selectedNftItem available for template', () => {
     //           const selected = component.nftUtilService.selectedNftItem();
     //           expect(selected).toEqual(mockNftItems[0]);
     //      });
     // });

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

          it('should handle long NFT IDs', () => {
               const longId = 'a'.repeat(1000);
               component.onNftSelected({ id: longId } as SelectItem);
               expect(nftCreateStoreService.setField).toHaveBeenCalledWith('nftId', longId);
          });
     });
});
