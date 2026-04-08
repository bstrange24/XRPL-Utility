import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChecksTransactionOptionsComponent } from './checks-transaction-options.component';

describe('ChecksTransactionOptionsComponent', () => {
     let component: ChecksTransactionOptionsComponent;
     let fixture: ComponentFixture<ChecksTransactionOptionsComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [ChecksTransactionOptionsComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(ChecksTransactionOptionsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
