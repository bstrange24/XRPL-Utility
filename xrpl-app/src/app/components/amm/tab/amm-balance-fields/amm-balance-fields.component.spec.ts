import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceFieldsComponent } from './amm-balance-fields.component';

describe('BalanceFieldsComponent', () => {
     let component: BalanceFieldsComponent;
     let fixture: ComponentFixture<BalanceFieldsComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [BalanceFieldsComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(BalanceFieldsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
