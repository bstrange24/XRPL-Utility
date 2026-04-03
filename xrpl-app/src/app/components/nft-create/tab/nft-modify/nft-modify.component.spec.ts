import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftModifyComponent } from './nft-modify.component';

describe('NftModifyComponent', () => {
  let component: NftModifyComponent;
  let fixture: ComponentFixture<NftModifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftModifyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftModifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
