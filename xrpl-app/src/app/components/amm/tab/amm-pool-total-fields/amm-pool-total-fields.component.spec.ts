import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmmPoolTotalFieldsComponent } from './amm-pool-total-fields.component';

describe('AmmPoolTotalFieldsComponent', () => {
  let component: AmmPoolTotalFieldsComponent;
  let fixture: ComponentFixture<AmmPoolTotalFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmmPoolTotalFieldsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmmPoolTotalFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
