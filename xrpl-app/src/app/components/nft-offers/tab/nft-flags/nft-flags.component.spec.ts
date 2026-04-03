import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftFlagsComponent } from './nft-flags.component';

describe('NftFlagsComponent', () => {
  let component: NftFlagsComponent;
  let fixture: ComponentFixture<NftFlagsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftFlagsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftFlagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
