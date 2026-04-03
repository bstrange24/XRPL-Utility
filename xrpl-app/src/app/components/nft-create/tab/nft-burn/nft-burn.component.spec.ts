import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftBurnComponent } from './nft-burn.component';

describe('NftBurnComponent', () => {
  let component: NftBurnComponent;
  let fixture: ComponentFixture<NftBurnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftBurnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftBurnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
