import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftBuyOffersComponent } from './nft-buy-offers.component';

describe('NftBuyOffersComponent', () => {
  let component: NftBuyOffersComponent;
  let fixture: ComponentFixture<NftBuyOffersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftBuyOffersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftBuyOffersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
