import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmmFieldsComponent } from './amm-fields.component';

describe('AmmFieldsComponent', () => {
  let component: AmmFieldsComponent;
  let fixture: ComponentFixture<AmmFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmmFieldsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmmFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
