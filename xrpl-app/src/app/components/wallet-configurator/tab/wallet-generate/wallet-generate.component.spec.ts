import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletGenerateComponent } from './wallet-generate.component';

describe('WalletGenerateComponent', () => {
  let component: WalletGenerateComponent;
  let fixture: ComponentFixture<WalletGenerateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletGenerateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletGenerateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
