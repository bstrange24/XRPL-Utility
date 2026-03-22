import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletGeneratorRequirementsInfoComponent } from './wallet-generator-requirements-info.component';

describe('WalletGeneratorRequirementsInfoComponent', () => {
  let component: WalletGeneratorRequirementsInfoComponent;
  let fixture: ComponentFixture<WalletGeneratorRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletGeneratorRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletGeneratorRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
