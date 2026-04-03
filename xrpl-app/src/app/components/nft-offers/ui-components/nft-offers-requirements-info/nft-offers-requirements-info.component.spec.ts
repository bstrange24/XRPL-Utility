import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftOffersRequirementsInfoComponent } from './nft-offers-requirements-info.component';

describe('NftOffersRequirementsInfoComponent', () => {
  let component: NftOffersRequirementsInfoComponent;
  let fixture: ComponentFixture<NftOffersRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftOffersRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftOffersRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
