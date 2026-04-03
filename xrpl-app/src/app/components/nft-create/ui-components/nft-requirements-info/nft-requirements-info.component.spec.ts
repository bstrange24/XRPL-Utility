import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftRequirementsInfoComponent } from './nft-requirements-info.component';

describe('NftRequirementsInfoComponent', () => {
  let component: NftRequirementsInfoComponent;
  let fixture: ComponentFixture<NftRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NftRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NftRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
