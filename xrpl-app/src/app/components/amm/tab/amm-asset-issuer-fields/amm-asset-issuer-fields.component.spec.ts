import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmmAssetIssuerFieldsComponent } from './amm-asset-issuer-fields.component';

describe('AmmAssetIssuerFieldsComponent', () => {
  let component: AmmAssetIssuerFieldsComponent;
  let fixture: ComponentFixture<AmmAssetIssuerFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmmAssetIssuerFieldsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AmmAssetIssuerFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
