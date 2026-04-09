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

describe('EscrowsCreateComponent', () => {
     let component: EscrowsCreateComponent;
     let fixture: ComponentFixture<EscrowsCreateComponent>;
     let escrowStore: InstanceType<typeof EscrowStoreService>;

     const destinationSearchQuery = signal('');
     const selectedDestinationAddress = signal('');

     const vmMock = {
          activeTab: signal('createEscrow'),
          destinationSearchQuery,
          selectedDestinationAddress,
          destinationItems: jasmine.createSpy('destinationItems').and.returnValue([]),
          selectedDestinationItem: jasmine.createSpy('selectedDestinationItem').and.returnValue(null),
     };

     beforeEach(async () => {
          destinationSearchQuery.set('');
          selectedDestinationAddress.set('');

          await TestBed.configureTestingModule({
               imports: [EscrowsCreateComponent],
               providers: [
                    EscrowStoreService,
                    XrplTxOptionsStore,
                    {
                         provide: CurrencyStoreService,
                         useValue: { currency: signal('XRP'), issuer: signal(''), currencyCode: signal('XRP'), setField: jasmine.createSpy() },
                    },
                    {
                         provide: TrustlineCurrencyService,
                         useValue: {
                              currencyItems: signal([]),
                              issuerItems: signal([]),
                              selectCurrency: jasmine.createSpy(),
                              selectIssuer: jasmine.createSpy(),
                              refreshCurrentBalance: jasmine.createSpy(),
                         },
                    },
                    { provide: MptStoreService, useValue: { existingMpts: signal([]), mptIssuanceId: jasmine.createSpy().and.returnValue(''), setField: jasmine.createSpy() } },
                    { provide: TransactionUiService, useValue: { explorerUrl: signal(''), currentStep: signal('idle'), stepMessage: jasmine.createSpy().and.returnValue('') } },
                    {
                         provide: TransactionDropdownService,
                         useValue: {
                              allDestinations: jasmine.createSpy().and.returnValue(signal([])),
                              destinationMap: jasmine.createSpy().and.returnValue(signal(new Map())),
                              destinationItems: jasmine.createSpy().and.returnValue(signal([])),
                              selectedDestinationItem: jasmine.createSpy().and.returnValue(signal(null)),
                              customDestinations: signal([]),
                         },
                    },
                    { provide: MptUtilService, useValue: { computeMptItems: jasmine.createSpy().and.returnValue([]), computeSelectedMptItem: jasmine.createSpy().and.returnValue(null) } },
                    { provide: UtilsService, useValue: { encodeIfNeeded: (v: string) => v, normalizeCurrencyCode: (c: string) => c } },
                    { provide: EscrowTransactionViewModelService, useValue: vmMock },
                    { provide: TrustlineUtilService, useValue: { loadTrustlines: jasmine.createSpy().and.resolveTo() } },
               ],
          })
               .overrideComponent(EscrowsCreateComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(EscrowsCreateComponent);
          component = fixture.componentInstance;
          escrowStore = TestBed.inject(EscrowStoreService);
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('handleSearchQueryChange', () => {
          it('should update destinationSearchQuery in viewModel', () => {
               component.handleSearchQueryChange('test query');
               expect(destinationSearchQuery()).toBe('test query');
          });
     });

     describe('handleDestinationChange', () => {
          it('should update selectedDestinationAddress and store.destination', () => {
               component.handleDestinationChange({ id: 'rDEST', display: 'rDEST', isCurrentAccount: false, secondary: '' });
               expect(selectedDestinationAddress()).toBe('rDEST');
               expect(escrowStore.destination()).toBe('rDEST');
          });

          it('should clear address when item is null', () => {
               escrowStore.setField('destination', 'rPREVIOUS');
               component.handleDestinationChange(null);
               expect(selectedDestinationAddress()).toBe('');
               expect(escrowStore.destination()).toBe('');
          });
     });

     describe('toggleEscrowFinishAfterExpiration', () => {
          it('should call setField with enableEscrowFinishAfterExpirationDate', () => {
               component.toggleEscrowFinishAfterExpiration(true);
               expect(escrowStore.enableEscrowFinishAfterExpirationDate()).toBeTrue();
               component.toggleEscrowFinishAfterExpiration(false);
               expect(escrowStore.enableEscrowFinishAfterExpirationDate()).toBeFalse();
          });
     });

     describe('toggleEscrowCancelAfterExpiration', () => {
          it('should call setField with enableEscrowCancelAfterExpirationDate', () => {
               component.toggleEscrowCancelAfterExpiration(true);
               expect(escrowStore.enableEscrowCancelAfterExpirationDate()).toBeTrue();
          });
     });

     describe('currencyItems', () => {
          it('should return []', () => {
               expect(component.currencyItems()).toEqual([]);
          });
     });

     describe('selectedCurrencyItem', () => {
          it('should return null when no currency', () => {
               expect(component.selectedCurrencyItem()).toBeNull();
          });
     });

     describe('issuerItems', () => {
          it('should return []', () => {
               expect(component.issuerItems()).toEqual([]);
          });
     });

     describe('selectedIssuerItem', () => {
          it('should return null when no issuer', () => {
               expect(component.selectedIssuerItem()).toBeNull();
          });
     });
});
