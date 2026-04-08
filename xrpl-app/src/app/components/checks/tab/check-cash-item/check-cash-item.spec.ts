import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CheckCashItemComponent } from './check-cash-item.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CashCheckItem } from '../../constants/checks.types';

describe('CheckCashItemComponent', () => {
     let component: CheckCashItemComponent;
     let fixture: ComponentFixture<CheckCashItemComponent>;

     const mockCheck: CashCheckItem = {
          tab: 'cashCheck',
          id: 'CASHID001',
          index: 'CASHID001',
          amount: '5 XRP',
          destination: 'rMYADDR',
          sender: 'rSENDER456',
          isExpired: false,
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [CheckCashItemComponent],
               providers: [
                    { provide: TransactionUiService, useValue: { explorerUrl: signal('https://testnet.xrpl.org/') } },
                    { provide: UtilsService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy('copy') } },
               ],
          })
               .overrideComponent(CheckCashItemComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CheckCashItemComponent);
          component = fixture.componentInstance;
          component.check = mockCheck;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should have the check input set', () => {
          expect(component.check).toEqual(mockCheck);
     });

     it('should reflect sender', () => {
          expect(component.check.sender).toBe('rSENDER456');
     });

     it('should reflect isExpired false', () => {
          expect(component.check.isExpired).toBeFalse();
     });

     it('should reflect expired check', () => {
          component.check = { ...mockCheck, isExpired: true };
          expect(component.check.isExpired).toBeTrue();
     });
});
