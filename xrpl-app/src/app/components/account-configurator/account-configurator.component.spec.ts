// To run test in Windows CMD:
// cd xrpl-app
// npm test -- --watch=false --browsers=ChromeHeadless --include src/app/components/account-configurator/account-configurator.component.spec.ts
// npm test -- --watch=false --browsers=ChromeHeadless --include src/app/components/account-configurator/account-configurator.component.spec.ts | findstr /i "FAILED ✗ ✓ Executed"
// saajfPAyTUg5JDesjK9JYUAS3NKBR
// utilService.formatDepositAuthEntries.and.returnValue([{ SignerEntry: { Account: 'rPreauth' } }]);

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountConfiguratorComponent } from './account-configurator.component';

describe('AccountConfiguratorComponent', () => {
     let component: AccountConfiguratorComponent;
     let fixture: ComponentFixture<AccountConfiguratorComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountConfiguratorComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountConfiguratorComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
