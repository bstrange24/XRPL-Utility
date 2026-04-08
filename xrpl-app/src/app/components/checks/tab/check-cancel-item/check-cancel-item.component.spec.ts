import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CheckCancelItemComponent } from './check-cancel-item.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CancelCheckItem } from '../../constants/checks.types';

describe('CheckCancelItemComponent', () => {
     let component: CheckCancelItemComponent;
     let fixture: ComponentFixture<CheckCancelItemComponent>;

     const mockCheck: CancelCheckItem = {
          tab: 'cancelCheck',
          id: 'CHECKID001',
          index: 'CHECKID001',
          amount: '10 XRP',
          destination: 'rDEST123',
          isExpired: false,
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [CheckCancelItemComponent],
               providers: [
                    { provide: TransactionUiService, useValue: { explorerUrl: signal('https://testnet.xrpl.org/') } },
                    { provide: UtilsService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy('copy') } },
               ],
          })
               .overrideComponent(CheckCancelItemComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CheckCancelItemComponent);
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

     it('should reflect check id', () => {
          expect(component.check.id).toBe('CHECKID001');
     });

     it('should reflect destination', () => {
          expect(component.check.destination).toBe('rDEST123');
     });

     it('should reflect isExpired false', () => {
          expect(component.check.isExpired).toBeFalse();
     });

     it('should show expired state when check is expired', () => {
          component.check = { ...mockCheck, isExpired: true };
          expect(component.check.isExpired).toBeTrue();
     });
});
