import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultSetComponent } from './vault-set.component';

describe('VaultSetComponent', () => {
  let component: VaultSetComponent;
  let fixture: ComponentFixture<VaultSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultSetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VaultSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
