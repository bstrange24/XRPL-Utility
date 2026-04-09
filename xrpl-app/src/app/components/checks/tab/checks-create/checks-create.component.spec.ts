import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksCreateComponent } from './checks-create.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksStoreService } from '../../../../services/checks/checks-store/checks-store.service';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';

describe('ChecksCreateComponent', () => {
     let component: ChecksCreateComponent;
     let fixture: ComponentFixture<ChecksCreateComponent>;

     const checksStoreMock = {
          amount: signal(''),
          checkExpirationDate: signal(''),
          enableExpirationDate: signal(false),
          setField: jasmine.createSpy('setField'),
     };

     const vmMock = {
          activeTab: signal('createCheck'),
          selectedCurrencyItem: signal(null),
          selectedIssuerItem: signal(null),
          currencyItems: signal([]),
          issuerItems: signal([]),
          createCheckButtonLabel: signal('Create Check'),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [ChecksCreateComponent],
               providers: [
                    { provide: TransactionUiService, useValue: { currentStep: signal('idle'), wantsOptions: signal(false), explorerUrl: signal('') } },
                    { provide: ChecksStoreService, useValue: checksStoreMock },
                    { provide: CurrencyStoreService, useValue: { currency: signal('XRP'), currencyCode: signal('XRP'), issuer: signal(''), balance: signal('') } },
                    { provide: ChecksTransactionViewModelService, useValue: vmMock },
                    { provide: UtilsService, useValue: {} },
                    { provide: TrustlineCurrencyService, useValue: { currencyItems: signal([]), issuerItems: signal([]), preferXrpAsDefault: signal(false) } },
                    { provide: TrustlineUtilService, useValue: { loadTrustlines: jasmine.createSpy().and.resolveTo() } },
                    { provide: XrplDateService, useValue: {} },
                    { provide: CheckUtilService, useValue: { isCheckExpired: () => false } },
               ],
          })
               .overrideComponent(ChecksCreateComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksCreateComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('setCheckExpirationDate', () => {
          it('should call checksStoreService.setField with checkExpirationDate', () => {
               component.setCheckExpirationDate('2026-06-01T12:00');
               expect(checksStoreMock.setField).toHaveBeenCalledWith('checkExpirationDate', '2026-06-01T12:00');
          });

          it('should call with empty string to clear', () => {
               component.setCheckExpirationDate('');
               expect(checksStoreMock.setField).toHaveBeenCalledWith('checkExpirationDate', '');
          });
     });

     describe('onFocus', () => {
          it('should format numeric input to 6 decimal places', () => {
               const mockInput = { value: '2.5' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('2.500000');
          });

          it('should not modify empty input', () => {
               const mockInput = { value: '' } as HTMLInputElement;
               component.onFocus({ target: mockInput } as unknown as FocusEvent);
               expect(mockInput.value).toBe('');
          });
     });

     describe('output emitters', () => {
          it('should have destinationChanged emitter', () => {
               expect(component.destinationChanged).toBeDefined();
          });

          it('should have currencySelected emitter', () => {
               expect(component.currencySelected).toBeDefined();
          });

          it('should have expirationToggled emitter', () => {
               expect(component.expirationToggled).toBeDefined();
          });
     });
});
