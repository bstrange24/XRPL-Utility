import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountChangesSummaryComponent } from './account-changes-summary.component';
import { AccountChangesViewModelService } from '../../../../services/account-balance-changes/account-changes-view-model/account-changes-view-model.service';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';

class MockAccountChangesViewModelService {
     // using signal to mimic Angular 20+ reactive patterns
     private _infoData = signal<string | null>(null);

     infoData() {
          return this._infoData();
     }

     setInfoData(value: string | null) {
          this._infoData.set(value);
     }
}

describe('AccountChangesSummaryComponent', () => {
     let component: AccountChangesSummaryComponent;
     let fixture: ComponentFixture<AccountChangesSummaryComponent>;
     let mockViewModel: MockAccountChangesViewModelService;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [AccountChangesSummaryComponent],
               providers: [
                    {
                         provide: AccountChangesViewModelService,
                         useClass: MockAccountChangesViewModelService,
                    },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountChangesSummaryComponent);
          component = fixture.componentInstance;
          mockViewModel = TestBed.inject(AccountChangesViewModelService) as unknown as MockAccountChangesViewModelService;
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('template rendering', () => {
          it('should NOT render summary container when infoData is null', () => {
               mockViewModel.setInfoData(null);
               fixture.detectChanges();

               const container = fixture.debugElement.query(By.css('div.bg-green-50'));
               expect(container).toBeNull();
          });

          it('should render summary container when infoData has value', () => {
               mockViewModel.setInfoData('Test summary');
               fixture.detectChanges();

               const container = fixture.debugElement.query(By.css('div.bg-green-50'));
               expect(container).not.toBeNull();
          });

          it('should render the info HTML content correctly via innerHTML', () => {
               const htmlContent = '<strong>Balance Updated</strong>';
               mockViewModel.setInfoData(htmlContent);
               fixture.detectChanges();

               const contentEl: HTMLElement = fixture.debugElement.query(By.css('.text-green-800 div')).nativeElement;
               expect(contentEl.innerHTML).toContain('<strong>Balance Updated</strong>');
          });

          it('should update DOM when infoData signal changes (reactivity test)', () => {
               mockViewModel.setInfoData('Initial');
               fixture.detectChanges();

               let contentEl: HTMLElement = fixture.debugElement.query(By.css('.text-green-800 div')).nativeElement;
               expect(contentEl.innerHTML).toContain('Initial');

               // update signal
               mockViewModel.setInfoData('Updated');
               fixture.detectChanges();

               contentEl = fixture.debugElement.query(By.css('.text-green-800 div')).nativeElement;
               expect(contentEl.innerHTML).toContain('Updated');
          });

          it('should include icon component when rendered', () => {
               mockViewModel.setInfoData('With icon');
               fixture.detectChanges();

               const icon = fixture.debugElement.query(By.css('ng-icon'));
               expect(icon).not.toBeNull();
          });

          it('should apply correct CSS classes to container', () => {
               mockViewModel.setInfoData('Styled');
               fixture.detectChanges();

               const container: HTMLElement = fixture.debugElement.query(By.css('div.bg-green-50')).nativeElement;

               expect(container.classList).toContain('bg-green-50');
               expect(container.classList).toContain('border');
               expect(container.classList).toContain('rounded-2xl');
               expect(container.classList).toContain('flex');
          });

          it('should not break when infoData contains complex HTML', () => {
               const complexHtml = `
        <div>
          <span>Line 1</span>
          <ul><li>Item A</li><li>Item B</li></ul>
        </div>
      `;

               mockViewModel.setInfoData(complexHtml);
               fixture.detectChanges();

               const contentEl: HTMLElement = fixture.debugElement.query(By.css('.text-green-800 div')).nativeElement;

               expect(contentEl.innerHTML).toContain('Line 1');
               expect(contentEl.innerHTML).toContain('Item A');
               expect(contentEl.innerHTML).toContain('Item B');
          });

          // it('should handle empty string as truthy and still render container', () => {
          //      mockViewModel.setInfoData('');
          //      fixture.detectChanges();

          //      const container = fixture.debugElement.query(By.css('div.bg-green-50'));
          //      expect(container).not.toBeNull();
          // });

          it('should remove container when infoData becomes null after being set', () => {
               mockViewModel.setInfoData('Temporary');
               fixture.detectChanges();

               expect(fixture.debugElement.query(By.css('div.bg-green-50'))).not.toBeNull();

               mockViewModel.setInfoData(null);
               fixture.detectChanges();

               expect(fixture.debugElement.query(By.css('div.bg-green-50'))).toBeNull();
          });
     });
});
