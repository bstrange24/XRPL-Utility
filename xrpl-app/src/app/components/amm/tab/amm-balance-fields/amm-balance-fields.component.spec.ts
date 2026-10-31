import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmmBalanceFieldsComponent } from './amm-balance-fields.component';

describe('BalanceFieldsComponent', () => {
     let component: AmmBalanceFieldsComponent;
     let fixture: ComponentFixture<AmmBalanceFieldsComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AmmBalanceFieldsComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(AmmBalanceFieldsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
