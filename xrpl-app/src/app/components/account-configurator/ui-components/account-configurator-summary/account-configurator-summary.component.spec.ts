import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { AccountConfiguratorSummaryComponent } from './account-configurator-summary.component';
import { AccountConfiguratorViewModelService } from '../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
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
     @Input() emptyStateSubMessage!: string;
     @Input() infoPanelExpanded!: boolean;

     @Output() toggleInfoPanel = new EventEmitter<void>();
}

@Component({
     selector: 'app-summary-item',
     standalone: true,
     template: `
          <div data-testid="summary-item" class="mock-summary-item">
               <ng-content select="[item-content]"></ng-content>
          </div>
     `,
})
class MockSummaryItemComponent {
     @Input() copyValue!: string;
     @Output() onCopyClick = new EventEmitter<string>();
}

/* ==================== MOCK SERVICES ==================== */

class MockVM {
     private _data = signal<any>(null);

     infoData() {
          return this._data();
     }

     set(data: any) {
          this._data.set(data);
     }
}

class MockCopy {
     copyAndToast = jasmine.createSpy('copyAndToast');
}

/* ==================== TEST SUITE ==================== */

describe('AccountConfiguratorSummaryComponent', () => {
     let fixture: ComponentFixture<AccountConfiguratorSummaryComponent>;
     let component: AccountConfiguratorSummaryComponent;
     let vm: MockVM;
     let copy: MockCopy;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountConfiguratorSummaryComponent],
               providers: [
                    { provide: AccountConfiguratorViewModelService, useClass: MockVM },
                    { provide: CopyUtilService, useClass: MockCopy },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          })
               // Override real child components with our mocks
               .overrideComponent(AccountConfiguratorSummaryComponent, {
                    set: {
                         imports: [MockSummaryContainerComponent, MockSummaryItemComponent],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(AccountConfiguratorSummaryComponent);
          component = fixture.componentInstance;

          // Required signal inputs
          fixture.componentRef.setInput('infoPanelExpanded', true); // ← Important: set to true
          fixture.componentRef.setInput('tab', 'modifyAccountFlags' as any);

          vm = TestBed.inject(AccountConfiguratorViewModelService) as any;
          copy = TestBed.inject(CopyUtilService) as any;
     });

     function setData(data: any) {
          vm.set(data);
          fixture.detectChanges();
     }

     it('should render nothing when no data', () => {
          setData(null);
          expect(fixture.nativeElement.textContent.trim()).toBe('');
     });

     it('should render config items', () => {
          setData({
               walletName: 'Wallet',
               summaryMessage: 'Summary',
               hasSpecialConfig: true,
               hasIrreversible: false,
               configItems: [
                    { id: 1, text: 'Flag A' },
                    { id: 2, text: 'Flag B' },
               ],
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Flag A');
          expect(text).toContain('Flag B');

          const items = fixture.debugElement.queryAll(By.css('.mock-summary-item'));
          expect(items.length).toBe(2);
     });

     it('should NOT render items when hasSpecialConfig is false', () => {
          setData({
               walletName: 'Wallet',
               summaryMessage: 'Summary',
               hasSpecialConfig: false,
               hasIrreversible: false,
               configItems: [{ id: 1, text: 'Hidden' }],
          });

          expect(fixture.nativeElement.textContent).not.toContain('Hidden');
     });

     it('should render irreversible warning', () => {
          setData({
               walletName: 'Wallet',
               summaryMessage: 'Summary',
               hasSpecialConfig: true,
               hasIrreversible: true,
               irreversibleMessage: 'Irreversible flag enabled',
               configItems: [{ id: 1, text: 'Flag A' }],
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Irreversible flag enabled');
          expect(text).toContain('cannot be disabled');
     });

     it('should call copy util when copy triggered', () => {
          setData({
               walletName: 'Wallet',
               summaryMessage: 'Summary',
               hasSpecialConfig: true,
               hasIrreversible: false,
               configItems: [{ id: 1, text: 'Copy Me' }],
          });

          const item = fixture.debugElement.query(By.css('.mock-summary-item'));
          expect(item).toBeTruthy('Summary item should be rendered');

          item.componentInstance.onCopyClick.emit('Copy Me');

          expect(copy.copyAndToast).toHaveBeenCalledWith('Copy Me', 'Configuration text');
     });

     it('should emit toggle event', () => {
          setData({
               walletName: 'Wallet',
               summaryMessage: 'Summary',
               hasSpecialConfig: false,
               hasIrreversible: false,
               configItems: [],
          });

          const container = fixture.debugElement.query(By.directive(MockSummaryContainerComponent));
          expect(container).toBeTruthy();

          spyOn(component.toggleInfoPanel, 'emit');
          container.componentInstance.toggleInfoPanel.emit();

          expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
     });

     it('should react to data changes', () => {
          setData({ walletName: 'A', summaryMessage: 'A', hasSpecialConfig: false, hasIrreversible: false, configItems: [] });
          expect(fixture.nativeElement.textContent).toContain('A');

          setData({ walletName: 'B', summaryMessage: 'B', hasSpecialConfig: false, hasIrreversible: false, configItems: [] });
          expect(fixture.nativeElement.textContent).toContain('B');
     });
});
