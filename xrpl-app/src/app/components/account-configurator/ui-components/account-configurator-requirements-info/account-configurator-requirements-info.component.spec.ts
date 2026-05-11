import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AccountConfiguratorRequirementsInfoComponent } from './account-configurator-requirements-info.component';
import { ACCOUNT_ACTIONS } from '../../constants/account-configurator.constants';

import { LUCIDE_ICONS, LucideIconProvider, icons, LucideAngularComponent } from 'lucide-angular';

@Component({
     standalone: true,
     imports: [AccountConfiguratorRequirementsInfoComponent],
     template: ` <app-account-configurator-requirements-info [activeTab]="activeTabSignal"> </app-account-configurator-requirements-info> `,
})
class TestHostComponent {
     activeTabSignal = signal<ACCOUNT_ACTIONS>('modifyAccountFlags' as ACCOUNT_ACTIONS);
}

describe('AccountConfiguratorRequirementsInfoComponent', () => {
     let fixture: ComponentFixture<TestHostComponent>;
     let host: TestHostComponent;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [TestHostComponent],
               providers: [
                    provideRouter([]),
                    provideNoopAnimations(), // ✅ Fix animation errors
                    {
                         provide: LUCIDE_ICONS,
                         useValue: new LucideIconProvider(icons),
                         multi: true,
                    },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(TestHostComponent);
          host = fixture.componentInstance;
     });

     function getInnerComponent(): AccountConfiguratorRequirementsInfoComponent {
          return fixture.debugElement.query(By.directive(AccountConfiguratorRequirementsInfoComponent)).componentInstance;
     }

     function getToggleButton() {
          return fixture.debugElement.query(By.css('button.w-full'));
     }

     function getLucideIcon(): LucideAngularComponent {
          return fixture.debugElement.query(By.directive(LucideAngularComponent)).componentInstance;
     }

     it('should create', () => {
          fixture.detectChanges();
          expect(getInnerComponent()).toBeTruthy();
     });

     describe('tab switching (@switch)', () => {
          it('should render Account Flags content', () => {
               host.activeTabSignal.set('modifyAccountFlags' as ACCOUNT_ACTIONS);
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Account Flags');
          });

          it('should render Metadata content', () => {
               host.activeTabSignal.set('modifyMetaData' as ACCOUNT_ACTIONS);
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Account Metadata');
          });

          it('should render Deposit Authorization content', () => {
               host.activeTabSignal.set('modifyDepositAuth' as ACCOUNT_ACTIONS);
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Deposit Authorization');
          });

          it('should render Multi-Signer content', () => {
               host.activeTabSignal.set('modifyMultiSigners' as ACCOUNT_ACTIONS);
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Multi-Signer Setup');
          });

          it('should render Regular Key content', () => {
               host.activeTabSignal.set('modifyRegularKey' as ACCOUNT_ACTIONS);
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Regular Key Setup');
          });
     });

     describe('expand/collapse behavior', () => {
          it('should be collapsed by default', () => {
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).not.toContain('Account Flags (AccountSet)');
          });

          it('should expand when header button is clicked', () => {
               fixture.detectChanges();

               getToggleButton().triggerEventHandler('click');
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Account Flags (AccountSet)');
          });

          it('should collapse when header button clicked twice', () => {
               fixture.detectChanges();

               const btn = getToggleButton();

               btn.triggerEventHandler('click');
               fixture.detectChanges();

               btn.triggerEventHandler('click');
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).not.toContain(
                    "'Account Flags Expand Account Flags (AccountSet)AccountSet lets you enable or disable specific account behaviors using SetFlag and ClearFlag.Requirements⚙️ Enable FlagsSetFlagRequiredClearFlagOptional⚙️ Disable FlagsClearFlagRequiredSetFlagOptional<ng-icon name="heroDocumentText" size="16" class="text-red-700 flex-shrink-0 mt-0.5" />Important NotesUse SetFlag to enable or ClearFlag to disable — only one of each per transaction.Check current flags in your AccountRoot via account_info.Some flags are irreversible once enabled (see warnings below).Transaction still costs a fee even if no change occurs.<ng-icon name="heroExclamationTriangle" size="16" class="text-amber-600 flex-shrink-0 mt-0.5" /> Irreversible & Restricted FlagsasfNoFreeze, asfAllowTrustLineClawback, asfAllowTrustLineLocking — irreversible.asfDisableMaster — requires alternative signing method first.asfRequireAuth — only possible with no existing trust lines.Always test on Testnet first.' not to contain 'Account Flags Expand Account Flags (AccountSet)AccountSet lets you enable or disable specific account behaviors using SetFlag and ClearFlag.Requirements⚙️ Enable FlagsSetFlagRequiredClearFlagOptional⚙️ Disable FlagsClearFlagRequiredSetFlagOptional<ng-icon name="heroDocumentText" size="16" class="text-amber-800 flex-shrink-0 mt-0.5" />Important NotesUse SetFlag to enable or ClearFlag to disable — only one of each per transaction.Check current flags in your AccountRoot via account_info.Some flags are irreversible once enabled (see warnings below).Transaction still costs a fee even if no change occurs.<ng-icon name="heroExclamationTriangle" size="16" class="text-red-700 flex-shrink-0 mt-0.5" /> Irreversible & Restricted FlagsasfNoFreeze, asfAllowTrustLineClawback, asfAllowTrustLineLocking — irreversible.asfDisableMaster — requires alternative signing method first.asfRequireAuth — only possible with no existing trust lines.Always test on Testnet first.'"
               );
          });

          it('should reflect correct label (Expand/Collapse)', () => {
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Expand');

               getToggleButton().triggerEventHandler('click');
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Collapse');
          });
     });

     describe('reactivity', () => {
          it('should update view when activeTab changes', () => {
               host.activeTabSignal.set('modifyAccountFlags' as ACCOUNT_ACTIONS);
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Account Flags');

               host.activeTabSignal.set('modifyMetaData' as ACCOUNT_ACTIONS);
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent).toContain('Account Metadata');
          });
     });

     describe('UI elements', () => {
          it('should render ng-icon', () => {
               fixture.detectChanges();

               const icon = fixture.debugElement.query(By.css('ng-icon'));
               expect(icon).not.toBeNull();
          });

          it('should render lucide chevron icon based on state', () => {
               fixture.detectChanges();

               let icon = getLucideIcon();
               expect(icon.name).toBe('chevron-up');

               getToggleButton().triggerEventHandler('click');
               fixture.detectChanges();

               icon = getLucideIcon();
               expect(icon.name).toBe('chevron-down');
          });
     });

     describe('edge cases', () => {
          it('should render nothing if activeTab is undefined', () => {
               host.activeTabSignal.set(undefined as unknown as ACCOUNT_ACTIONS);
               fixture.detectChanges();

               expect(fixture.nativeElement.textContent.trim().length).toBe(0);
          });
     });
});
