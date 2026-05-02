import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EscrowsCreateComponent } from './escrows-create.component';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';

describe('EscrowsCreateComponent', () => {
     let component: EscrowsCreateComponent;
     let fixture: ComponentFixture<EscrowsCreateComponent>;

     // Services
     let escrowStoreService: any;
     let currencyStoreService: any;
     let trustlineCurrencyService: any;
     let mptStoreService: any;
     let txUiService: any;
     let transactionDropdownService: any;
     let mptUtilService: any;
     let utilsService: any;
     let viewModel: any;
     let trustlineUtilService: any;
     let xrplTxOptionsStore: any;

     // Mock data
     const mockCurrencyItems = [
          { id: 'XRP', display: 'XRP' },
          { id: 'USD', display: 'USD' },
          { id: 'MPT', display: 'MPT Token' },
     ];

     const mockIssuerItems = [
          { id: 'rIssuer1', display: 'Issuer 1' },
          { id: 'rIssuer2', display: 'Issuer 2' },
     ];

     const mockMptItems = [
          { id: 'mpt1', display: 'MPT Token 1', secondary: 'Token 1' },
          { id: 'mpt2', display: 'MPT Token 2', secondary: 'Token 2' },
     ];

     const mockDestinationItems = [
          { id: 'rDest1', display: 'Destination 1' },
          { id: 'rDest2', display: 'Destination 2' },
     ];

     beforeEach(async () => {
          escrowStoreService = {
               setField: jasmine.createSpy('setField'),
               destination: signal(''),
          };

          currencyStoreService = {
               currency: signal('XRP'),
               issuer: signal(''),
          };

          trustlineCurrencyService = {
               selectCurrency: jasmine.createSpy('selectCurrency'),
               selectIssuer: jasmine.createSpy('selectIssuer'),
               currencyItems: jasmine.createSpy('currencyItems').and.returnValue(mockCurrencyItems),
               issuerItems: jasmine.createSpy('issuerItems').and.returnValue(mockIssuerItems),
               refreshCurrentBalance: jasmine.createSpy('refreshCurrentBalance').and.resolveTo(),
          };

          mptStoreService = {
               existingMpts: signal([]),
               mptIssuanceId: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };

          transactionDropdownService = {};

          mptUtilService = {
               computeMptItems: jasmine.createSpy('computeMptItems').and.returnValue(mockMptItems),
               computeSelectedMptItem: jasmine.createSpy('computeSelectedMptItem').and.returnValue(mockMptItems[0]),
          };

          utilsService = {
               formatAmount: jasmine.createSpy('formatAmount').and.callFake((val: any) => val),
          };

          viewModel = {
               refreshMpts: jasmine.createSpy('refreshMpts').and.resolveTo(),
               destinationItems: jasmine.createSpy('destinationItems').and.returnValue(mockDestinationItems),
               selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(mockDestinationItems[0]),
               destinationSearchQuery: signal(''),
               selectedDestinationAddress: signal(''),
          };

          trustlineUtilService = {
               loadTrustlines: jasmine.createSpy('loadTrustlines').and.resolveTo(),
          };

          xrplTxOptionsStore = {};

          await TestBed.configureTestingModule({
               imports: [EscrowsCreateComponent],
               providers: [
                    { provide: EscrowStoreService, useValue: escrowStoreService },
                    { provide: CurrencyStoreService, useValue: currencyStoreService },
                    { provide: TrustlineCurrencyService, useValue: trustlineCurrencyService },
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: MptUtilService, useValue: mptUtilService },
                    { provide: UtilsService, useValue: utilsService },
                    { provide: EscrowTransactionViewModelService, useValue: viewModel },
                    { provide: TrustlineUtilService, useValue: trustlineUtilService },
                    { provide: XrplTxOptionsStore, useValue: xrplTxOptionsStore },
               ],
          })
               .overrideComponent(EscrowsCreateComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowsCreateComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          escrowStoreService.setField.calls.reset();
          trustlineCurrencyService.selectCurrency.calls.reset();
          trustlineCurrencyService.selectIssuer.calls.reset();
          trustlineUtilService.loadTrustlines.calls.reset();
          trustlineCurrencyService.refreshCurrentBalance.calls.reset();
          viewModel.refreshMpts.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should have isConditional input defaulting to false', () => {
               expect(component.isConditional).toBeFalse();
          });

          it('should accept isConditional input as true', () => {
               fixture.componentRef.setInput('isConditional', true);
               fixture.detectChanges();
               expect(component.isConditional).toBeTrue();
          });
     });

     describe('onCurrencySelected', () => {
          it('should select XRP when item is null', async () => {
               await component.onCurrencySelected(null);

               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('XRP');
               expect(trustlineUtilService.loadTrustlines).toHaveBeenCalledWith(false);
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
          });

          it('should select USD currency and load trustlines', async () => {
               const item = { id: 'USD', display: 'USD' } as SelectItem;
               await component.onCurrencySelected(item);

               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('USD');
               expect(trustlineUtilService.loadTrustlines).toHaveBeenCalledWith(false);
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
               expect(viewModel.refreshMpts).not.toHaveBeenCalled();
          });

          it('should handle MPT currency selection', async () => {
               const item = { id: 'MPT', display: 'MPT Token' } as SelectItem;
               await component.onCurrencySelected(item);

               expect(trustlineCurrencyService.selectCurrency).toHaveBeenCalledWith('MPT');
               expect(viewModel.refreshMpts).toHaveBeenCalled();
               expect(trustlineUtilService.loadTrustlines).not.toHaveBeenCalled();
          });
     });

     describe('onIssuerSelected', () => {
          it('should select issuer and load trustlines when currency exists', async () => {
               currencyStoreService.currency.set('USD');
               const item = { id: 'rIssuer1', display: 'Issuer 1' } as SelectItem;

               await component.onIssuerSelected(item);

               expect(trustlineCurrencyService.selectIssuer).toHaveBeenCalledWith('rIssuer1');
               expect(trustlineUtilService.loadTrustlines).toHaveBeenCalledWith(false);
               expect(trustlineCurrencyService.refreshCurrentBalance).toHaveBeenCalled();
          });

          it('should handle null item', async () => {
               await component.onIssuerSelected(null);

               expect(trustlineCurrencyService.selectIssuer).toHaveBeenCalledWith('');
          });

          it('should not load trustlines when currency is not selected', async () => {
               currencyStoreService.currency.set('');
               const item = { id: 'rIssuer1', display: 'Issuer 1' } as SelectItem;

               await component.onIssuerSelected(item);

               expect(trustlineUtilService.loadTrustlines).not.toHaveBeenCalled();
               expect(trustlineCurrencyService.refreshCurrentBalance).not.toHaveBeenCalled();
          });
     });

     describe('currencyItems', () => {
          it('should return currency items from service', () => {
               const items = component.currencyItems();
               expect(items.length).toBe(3);
               expect(items[0].id).toBe('XRP');
               expect(items[1].id).toBe('USD');
               expect(items[2].id).toBe('MPT');
               expect(trustlineCurrencyService.currencyItems).toHaveBeenCalled();
          });
     });

     describe('selectedCurrencyItem', () => {
          it('should return selected currency item when currency exists', () => {
               currencyStoreService.currency.set('USD');
               const result = component.selectedCurrencyItem();
               expect(result?.id).toBe('USD');
               expect(result?.display).toBe('USD');
          });

          it('should return null when no currency selected', () => {
               currencyStoreService.currency.set('');
               const result = component.selectedCurrencyItem();
               expect(result).toBeNull();
          });
     });

     describe('issuerItems', () => {
          it('should return issuer items from service', () => {
               const items = component.issuerItems();
               expect(items.length).toBe(2);
               expect(items[0].id).toBe('rIssuer1');
               expect(items[1].id).toBe('rIssuer2');
               expect(trustlineCurrencyService.issuerItems).toHaveBeenCalled();
          });
     });

     describe('selectedIssuerItem', () => {
          it('should return selected issuer item when issuer exists', () => {
               currencyStoreService.issuer.set('rIssuer2');
               const result = component.selectedIssuerItem();
               expect(result?.id).toBe('rIssuer2');
               expect(result?.display).toBe('Issuer 2');
          });

          it('should return null when no issuer selected', () => {
               currencyStoreService.issuer.set('');
               const result = component.selectedIssuerItem();
               expect(result).toBeNull();
          });
     });

     describe('mptItems', () => {
          it('should return MPT items when existingMpts exists', () => {
               const mockMpts = [{ id: 'mpt1' }, { id: 'mpt2' }];
               mptStoreService.existingMpts = signal(mockMpts);

               const items = component.mptItems();

               expect(mptUtilService.computeMptItems).toHaveBeenCalledWith(mockMpts);
               expect(items.length).toBe(2);
               expect(items[0].id).toBe('mpt1');
               expect(items[1].id).toBe('mpt2');
          });

          it('should handle undefined existingMpts', () => {
               mptStoreService.existingMpts = signal(undefined);

               const items = component.mptItems();

               expect(mptUtilService.computeMptItems).toHaveBeenCalledWith([]);
               expect(items).toEqual(mockMptItems);
          });
     });

     describe('selectedMptItem', () => {
          it('should return selected MPT item', () => {
               mptStoreService.mptIssuanceId.set('mpt1');
               const result = component.selectedMptItem();

               expect(mptUtilService.computeSelectedMptItem).toHaveBeenCalledWith(mockMptItems, 'mpt1');
               expect(result?.id).toBe('mpt1');
          });
     });

     describe('destination methods', () => {
          it('should return destinationItems from viewModel', () => {
               const items = component.destinationItems();
               expect(items.length).toBe(2);
               expect(items[0].id).toBe('rDest1');
               expect(items[1].id).toBe('rDest2');
               expect(viewModel.destinationItems).toHaveBeenCalled();
          });

          it('should return selectedDestinationItem from viewModel', () => {
               const item = component.selectedDestinationItem();
               expect(item?.id).toBe('rDest1');
               expect(viewModel.selectedDestinationItem).toHaveBeenCalled();
          });

          it('should return destinationSearchQuery from viewModel', () => {
               viewModel.destinationSearchQuery.set('test query');
               const query = component.destinationSearchQuery();
               expect(query).toBe('test query');
          });
     });

     describe('handleSearchQueryChange', () => {
          it('should update destinationSearchQuery in viewModel', () => {
               component.handleSearchQueryChange('new search');
               expect(viewModel.destinationSearchQuery()).toBe('new search');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update selectedDestinationAddress and store destination', () => {
               const item = { id: 'rDest123', display: 'Destination' } as SelectItem;
               component.handleDestinationChange(item);

               expect(viewModel.selectedDestinationAddress()).toBe('rDest123');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('destination', 'rDest123');
          });

          it('should handle null item', () => {
               component.handleDestinationChange(null);

               expect(viewModel.selectedDestinationAddress()).toBe('');
               expect(escrowStoreService.setField).toHaveBeenCalledWith('destination', '');
          });
     });

     describe('onMptSelected', () => {
          it('should set mptIssuanceId when item is provided', () => {
               const item = { id: 'mpt123', display: 'MPT Token' };
               component.onMptSelected(item);

               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', 'mpt123');
          });

          it('should clear mptIssuanceId when item is null', () => {
               component.onMptSelected(null);

               expect(mptStoreService.setField).toHaveBeenCalledWith('mptIssuanceId', '');
          });
     });

     describe('onFocus', () => {
          it('should call select on input', () => {
               const mockInput = { select: jasmine.createSpy('select') } as any;
               component.onFocus({ target: mockInput } as Event);
               expect(mockInput.select).toHaveBeenCalled();
          });

          it('should handle input without select method', () => {
               const mockInput = {} as any;
               expect(() => {
                    component.onFocus({ target: mockInput } as Event);
               }).not.toThrow();
          });
     });

     describe('toggle methods', () => {
          it('toggleEscrowFinishAfterExpiration should set field', () => {
               component.toggleEscrowFinishAfterExpiration(true);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('enableEscrowFinishAfterExpirationDate', true);
          });

          it('toggleEscrowCancelAfterExpiration should set field', () => {
               component.toggleEscrowCancelAfterExpiration(true);
               expect(escrowStoreService.setField).toHaveBeenCalledWith('enableEscrowCancelAfterExpirationDate', true);
          });
     });

     describe('Service injections', () => {
          it('should have escrowStoreService injected', () => {
               expect(component.escrowStoreService).toBe(escrowStoreService);
          });

          it('should have currencyStoreService injected', () => {
               expect(component.currencyStoreService).toBe(currencyStoreService);
          });

          it('should have trustlineCurrencyService injected', () => {
               expect(component.trustlineCurrencyService).toBe(trustlineCurrencyService);
          });

          it('should have mptStoreService injected', () => {
               expect(component.mptStoreService).toBe(mptStoreService);
          });

          it('should have viewModel injected', () => {
               expect(component.viewModel).toBe(viewModel);
          });
     });

     describe('Edge cases', () => {
          it('should handle missing currency items gracefully', () => {
               trustlineCurrencyService.currencyItems.and.returnValue([]);
               const items = component.currencyItems();
               expect(items).toEqual([]);
          });

          it('should handle missing issuer items gracefully', () => {
               trustlineCurrencyService.issuerItems.and.returnValue([]);
               const items = component.issuerItems();
               expect(items).toEqual([]);
          });
     });
});
