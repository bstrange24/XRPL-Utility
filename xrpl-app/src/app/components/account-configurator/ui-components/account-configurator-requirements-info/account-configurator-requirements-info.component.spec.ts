import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountConfiguratorRequirementsInfoComponent } from './account-configurator-requirements-info.component';

describe('AccountConfiguratorRequirementsInfoComponent', () => {
  let component: AccountConfiguratorRequirementsInfoComponent;
  let fixture: ComponentFixture<AccountConfiguratorRequirementsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountConfiguratorRequirementsInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountConfiguratorRequirementsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
