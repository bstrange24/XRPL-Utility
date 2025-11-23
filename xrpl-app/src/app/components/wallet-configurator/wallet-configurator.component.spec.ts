import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletConfiguratorComponent } from './wallet-configurator.component';

describe('WalletConfiguratorComponent', () => {
  let component: WalletConfiguratorComponent;
  let fixture: ComponentFixture<WalletConfiguratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletConfiguratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
