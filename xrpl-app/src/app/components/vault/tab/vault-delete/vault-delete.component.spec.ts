import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VaultDeleteComponent } from './vault-delete.component';

describe('VaultDeleteComponent', () => {
  let component: VaultDeleteComponent;
  let fixture: ComponentFixture<VaultDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultDeleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VaultDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
