import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftCreateSummaryComponent } from './nft-create-summary.component';

describe('NftCreateSummaryComponent', () => {
  let component: NftCreateSummaryComponent;
  let fixture: ComponentFixture<NftCreateSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftCreateSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftCreateSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
