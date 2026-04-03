import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftSellComponent } from './nft-sell.component';

describe('NftSellComponent', () => {
  let component: NftSellComponent;
  let fixture: ComponentFixture<NftSellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftSellComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftSellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
