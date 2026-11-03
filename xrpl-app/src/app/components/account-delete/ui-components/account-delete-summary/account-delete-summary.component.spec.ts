import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { AccountDeleteSummaryComponent } from './account-delete-summary.component';
import { AccountDeleteViewModelService } from '../../../../services/account-delete/account-delete-view-model/account-delete-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

/* ==================== MOCKS ==================== */

@Component({
     selector: 'app-summary-container',
     standalone: true,
     template: `
          <div data-testid="summary-container">
               <span>{{ walletName }}</span>
               <span>{{ summaryText }}</span>
               <span>Show {{ itemCount }} {{ buttonLabel }}</span>
               <span>{{ emptyStateMessage }}</span>
               <ng-content></ng-content>
          </div>
     `,
})
class MockSummaryContainerComponent {
     @Input() walletName!: string;
     @Input() summaryText!: string;
     @Input() itemCount!: number;
     @Input() buttonLabel!: string;
     @Input() emptyStateMessage!: string;
     @Input() infoPanelExpanded!: boolean;
     @Input() showExpandButton!: boolean;
     @Input() links!: any;

     @Output() toggleInfoPanel = new EventEmitter<void>();
}

/* ==================== MOCK SERVICE ==================== */

class MockDeleteVM {
     summaryMessage = jasmine.createSpy('summaryMessage').and.returnValue('Delete account summary');
}

/* ==================== TEST SUITE ==================== */

describe('AccountDeleteSummaryComponent', () => {
     let fixture: ComponentFixture<AccountDeleteSummaryComponent>;
     let component: AccountDeleteSummaryComponent;
     let deleteVM: MockDeleteVM;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountDeleteSummaryComponent],
               providers: [
                    { provide: AccountDeleteViewModelService, useClass: MockDeleteVM },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          })
               .overrideComponent(AccountDeleteSummaryComponent, {
                    set: {
                         imports: [MockSummaryContainerComponent],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(AccountDeleteSummaryComponent);
          component = fixture.componentInstance;
          deleteVM = TestBed.inject(AccountDeleteViewModelService) as any;

          // Required signal inputs
          fixture.componentRef.setInput('infoPanelExpanded', true);
          fixture.componentRef.setInput('info', null);

          fixture.detectChanges();
     });

     function setInfo(data: any) {
          fixture.componentRef.setInput('info', data);
          fixture.detectChanges();
     }

     it('should render nothing when info is null', () => {
          setInfo(null);
          expect(fixture.nativeElement.textContent.trim()).toBe('');
     });

     it('should render blockers', () => {
          setInfo({
               walletName: 'My Wallet',
               canDelete: false,
               blockers: [
                    { label: 'Open Orders', count: 3, route: '/orders' },
                    { label: 'Active Positions', count: 1, route: '/positions' },
               ],
               eligibilityIssues: [],
               balanceWarning: null,
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('My Wallet');
          expect(text).toContain('Open Orders');
          expect(text).toContain('3');
          expect(text).toContain('Active Positions');
          expect(text).toContain('Resolve →');
     });

     it('should render balance warning', () => {
          setInfo({
               walletName: 'My Wallet',
               canDelete: false,
               blockers: [],
               eligibilityIssues: [],
               balanceWarning: 'You have a remaining balance of 0.5 USDC',
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Warning:');
          expect(text).toContain('remaining balance of 0.5 USDC');
     });

     it('should show ready for deletion state', () => {
          setInfo({
               walletName: 'My Wallet',
               canDelete: true,
               blockers: [],
               eligibilityIssues: [],
               balanceWarning: null,
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('No deletion blockers or requirements need attention.');
     });

     it('should render account deletion requirements separately from ledger object blockers', () => {
          setInfo({
               walletName: 'My Wallet',
               canDelete: false,
               blockers: [],
               eligibilityIssues: [{ label: 'Wait 20 more ledgers before deletion', count: 1, route: '#' }],
               balanceWarning: null,
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('AccountDelete requirements');
          expect(text).toContain('Wait 20 more ledgers before deletion');
          expect(text).not.toContain('1 Wait 20 more ledgers before deletion');
     });

     it('should show why an incoming payment channel blocks deletion', () => {
          setInfo({
               walletName: 'My Wallet',
               canDelete: false,
               blockers: [{ label: 'Payment Channels', count: 1, route: '/payment-channel', details: ['created by rChannelCreator; destination is this account'] }],
               eligibilityIssues: [],
               balanceWarning: null,
          });

          expect(fixture.nativeElement.textContent).toContain('created by rChannelCreator; destination is this account');
     });

     it('should hide items when hasContent() is false', () => {
          setInfo({
               walletName: 'My Wallet',
               canDelete: true,
               blockers: [],
               eligibilityIssues: [],
               balanceWarning: null,
          });

          expect(fixture.nativeElement.textContent).not.toContain('Resolve →');
     });

     it('should expose the empty-state message for a ready account', () => {
          setInfo({
               walletName: 'My Wallet',
               canDelete: true,
               blockers: [],
               eligibilityIssues: [],
               balanceWarning: null,
          });

          expect(component.emptyStateMessage()).toBe('No deletion blockers or requirements need attention.');
     });

     it('should react to info changes', () => {
          setInfo({
               walletName: 'Wallet A',
               canDelete: false,
               blockers: [{ label: 'Test', count: 1, route: '#' }],
               eligibilityIssues: [],
               balanceWarning: null,
          });
          expect(fixture.nativeElement.textContent).toContain('Wallet A');

          setInfo({
               walletName: 'Wallet B',
               canDelete: true,
               blockers: [],
               eligibilityIssues: [],
               balanceWarning: null,
          });
          expect(fixture.nativeElement.textContent).toContain('Wallet B');
     });
});
