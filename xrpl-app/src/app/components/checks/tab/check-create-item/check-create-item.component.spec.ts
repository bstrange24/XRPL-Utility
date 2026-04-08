import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CheckCreateItemComponent } from './check-create-item.component';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CreateCheckItem } from '../../constants/checks.types';

describe('CheckCreateItemComponent', () => {
     let component: CheckCreateItemComponent;
     let fixture: ComponentFixture<CheckCreateItemComponent>;

     const mockCheck: CreateCheckItem = {
          tab: 'createCheck',
          id: 'CREATEID001',
          index: 'CREATEID001',
          amount: '20 XRP',
          destination: 'rDEST789',
          isExpired: false,
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [CheckCreateItemComponent],
               providers: [
                    { provide: TransactionUiService, useValue: { explorerUrl: signal('https://testnet.xrpl.org/') } },
                    { provide: UtilsService, useValue: {} },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy('copy') } },
               ],
          })
               .overrideComponent(CheckCreateItemComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CheckCreateItemComponent);
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

     it('should reflect destination', () => {
          expect(component.check.destination).toBe('rDEST789');
     });

     it('should reflect isExpired false', () => {
          expect(component.check.isExpired).toBeFalse();
     });

     it('should detect expired check', () => {
          component.check = { ...mockCheck, isExpired: true };
          expect(component.check.isExpired).toBeTrue();
     });
});
