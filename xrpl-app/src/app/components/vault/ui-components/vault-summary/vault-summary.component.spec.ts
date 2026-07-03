import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultSummaryComponent } from './vault-summary.component';

describe('VaultSummaryComponent', () => {
  let component: VaultSummaryComponent;
  let fixture: ComponentFixture<VaultSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VaultSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
