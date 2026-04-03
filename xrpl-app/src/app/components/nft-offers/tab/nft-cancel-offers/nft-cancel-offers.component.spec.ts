import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftCancelOffersComponent } from './nft-cancel-offers.component';

describe('NftCancelOffersComponent', () => {
  let component: NftCancelOffersComponent;
  let fixture: ComponentFixture<NftCancelOffersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftCancelOffersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftCancelOffersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
