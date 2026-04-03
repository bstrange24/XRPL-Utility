import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftSellOffersComponent } from './nft-sell-offers.component';

describe('NftSellOffersComponent', () => {
  let component: NftSellOffersComponent;
  let fixture: ComponentFixture<NftSellOffersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftSellOffersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftSellOffersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
