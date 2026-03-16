import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountConfiguratorSummaryComponent } from './account-configurator-summary.component';

describe('AccountConfiguratorSummaryComponent', () => {
  let component: AccountConfiguratorSummaryComponent;
  let fixture: ComponentFixture<AccountConfiguratorSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountConfiguratorSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountConfiguratorSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
