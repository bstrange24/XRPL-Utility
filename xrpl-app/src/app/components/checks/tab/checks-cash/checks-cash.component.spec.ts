import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksCashComponent } from './checks-cash.component';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TrustlineStoreService } from '../../../../services/trustlines/trustline-store/trustline-store.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';

describe('ChecksCashComponent', () => {
     let component: ChecksCashComponent;
     let fixture: ComponentFixture<ChecksCashComponent>;

     const vmMock = {
          activeTab: signal('cashCheck'),
          checkItems: signal([]),
          filteredCheckIds: signal([]),
          selectedCheckItem: signal(null),
          selectedCheckIsExpired: signal(false),
          checkIdDisplay: signal(''),
          checkIdInputDisplay: signal(''),
          checksStoreService: { checkIdSearchQuery: signal(''), checkIdField: signal(''), useDeliverMin: signal(false), deliverMinAmount: signal(''), amount: signal(''), setField: jasmine.createSpy('setField') },
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [ChecksCashComponent],
               providers: [
                    { provide: ChecksTransactionViewModelService, useValue: vmMock },
                    { provide: TransactionUiService, useValue: { currentStep: signal('idle'), explorerUrl: signal('') } },
                    { provide: UtilsService, useValue: { formatIOUXrpAmountOutstanding: () => '' } },
                    { provide: TrustlineStoreService, useValue: { outstandingIOUCollapsed: signal(false), setField: jasmine.createSpy() } },
                    { provide: ChecksStoreService, useValue: { useDeliverMin: signal(false), deliverMinAmount: signal(''), amount: signal(''), setField: jasmine.createSpy() } },
               ],
          })
               .overrideComponent(ChecksCashComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksCashComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('onFocus', () => {
          it('should format a float to 6 decimal places', () => {
               const mockInput = { value: '1.23456789' } as HTMLInputElement;
               const event = { target: mockInput } as unknown as FocusEvent;
               component.onFocus(event);
               expect(mockInput.value).toBe('1.234568');
          });

          it('should not change value when input is empty', () => {
               const mockInput = { value: '' } as HTMLInputElement;
               const event = { target: mockInput } as unknown as FocusEvent;
               component.onFocus(event);
               expect(mockInput.value).toBe('');
          });

          it('should not change value when input is not a number', () => {
               const mockInput = { value: 'abc' } as HTMLInputElement;
               const event = { target: mockInput } as unknown as FocusEvent;
               component.onFocus(event);
               expect(mockInput.value).toBe('abc');
          });

          it('should format whole number to 6 decimal places', () => {
               const mockInput = { value: '5' } as HTMLInputElement;
               const event = { target: mockInput } as unknown as FocusEvent;
               component.onFocus(event);
               expect(mockInput.value).toBe('5.000000');
          });
     });
});
