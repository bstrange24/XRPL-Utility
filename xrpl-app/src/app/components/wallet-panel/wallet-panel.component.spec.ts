import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletPanelComponent } from './wallet-panel.component';

describe('WalletPanelComponent', () => {
  let component: WalletPanelComponent;
  let fixture: ComponentFixture<WalletPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
