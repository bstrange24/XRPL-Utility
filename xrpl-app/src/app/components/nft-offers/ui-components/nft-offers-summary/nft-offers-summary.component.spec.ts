import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftOffersSummaryComponent } from './nft-offers-summary.component';

describe('NftOffersSummaryComponent', () => {
  let component: NftOffersSummaryComponent;
  let fixture: ComponentFixture<NftOffersSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftOffersSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftOffersSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
