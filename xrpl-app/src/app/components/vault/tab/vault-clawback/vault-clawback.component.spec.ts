import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultClawbackComponent } from './vault-clawback.component';

describe('VaultClawbackComponent', () => {
  let component: VaultClawbackComponent;
  let fixture: ComponentFixture<VaultClawbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultClawbackComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VaultClawbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
