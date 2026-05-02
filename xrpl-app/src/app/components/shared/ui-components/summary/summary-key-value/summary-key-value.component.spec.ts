import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { SummaryKeyValueComponent } from './summary-key-value.component';

@Component({
     standalone: true,
     imports: [SummaryKeyValueComponent],
     template: `
          <app-summary-key-value [label]="label">
               <span class="projected-content">Projected Value</span>
          </app-summary-key-value>
     `,
})
class HostComponent {
     label = 'Test Label';
}

describe('SummaryKeyValueComponent', () => {
     let fixture: ComponentFixture<HostComponent>;
     let host: HostComponent;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [HostComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(HostComponent);
          host = fixture.componentInstance;
          fixture.detectChanges();
     });

     function getComponent() {
          return fixture.debugElement.query(By.directive(SummaryKeyValueComponent));
     }

     it('should create', () => {
          expect(getComponent()).toBeTruthy();
     });

     it('should render label correctly', () => {
          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('Test Label');
     });

     it('should render projected content', () => {
          const projected = fixture.debugElement.query(By.css('.projected-content'));
          expect(projected).not.toBeNull();
          expect(projected.nativeElement.textContent).toContain('Projected Value');
     });

     it('should render label with colon formatting', () => {
          const el: HTMLElement = fixture.nativeElement;

          // verifies structural format: "Label:"
          expect(el.textContent).toContain('Test Label:');
     });

     it('should update label when host value changes', () => {
          host.label = 'Updated Label';
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          expect(el.textContent).toContain('Updated Label');
     });
});
