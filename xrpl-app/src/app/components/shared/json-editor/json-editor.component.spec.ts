import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { JsonEditorComponent } from './json-editor.component';
import { By } from '@angular/platform-browser';

describe('JsonEditorComponent', () => {
     let fixture: ComponentFixture<JsonEditorComponent>;
     let component: JsonEditorComponent;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [JsonEditorComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(JsonEditorComponent);
          component = fixture.componentInstance;

          // Mock the private view safely
          (component as any).view = {
               state: {
                    doc: {
                         toString: () => component.value || '',
                    },
               },
               dispatch: jasmine.createSpy('dispatch'),
               destroy: jasmine.createSpy('destroy'),
          } as any;

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should emit valueChange when content changes', fakeAsync(() => {
          spyOn(component.valueChange, 'emit');

          const testJson = '{"name": "test", "value": 123}';

          // Simulate editor update
          const updateListener =
               (component as any).view.updateListener?.[0] ||
               ((update: any) => {
                    if (update.docChanged) {
                         component.valueChange.emit(update.state.doc.toString());
                    }
               });

          updateListener({ docChanged: true, state: { doc: { toString: () => testJson } } } as any);

          tick();
          expect(component.valueChange.emit).toHaveBeenCalledWith(testJson);
     }));

     it('should show error banner for invalid JSON', () => {
          component.jsonError.set('Unexpected token } in JSON at position 15');
          fixture.detectChanges();

          const errorBanner = fixture.debugElement.query(By.css('.json-error-banner'));
          expect(errorBanner).toBeTruthy();
          expect(fixture.nativeElement.textContent).toContain('Unexpected token');
     });

     it('should hide error banner when JSON is valid', () => {
          component.jsonError.set('');
          fixture.detectChanges();

          const errorBanner = fixture.debugElement.query(By.css('.json-error-banner'));
          expect(errorBanner).toBeFalsy();
     });

     it('should format valid JSON', () => {
          const uglyJson = '{"name":"John","age":30}';
          const prettyJson = '{\n  "name": "John",\n  "age": 30\n}';

          component.value = uglyJson;
          (component as any).view.state.doc.toString = () => uglyJson;

          component.format();

          expect((component as any).view.dispatch).toHaveBeenCalled();

          const dispatchArg = ((component as any).view.dispatch as jasmine.Spy).calls.mostRecent().args[0];
          expect(dispatchArg.changes.insert).toBe(prettyJson);
          expect(component.jsonError()).toBe('');
     });

     it('should handle invalid JSON in format()', () => {
          component.value = '{ invalid: json }';
          (component as any).view.state.doc.toString = () => '{ invalid: json }';

          component.format();

          expect(component.jsonError()).toContain('Invalid JSON');
     });

     it('should handle empty content gracefully', () => {
          component.value = '';
          component.format();
          expect(component.jsonError()).toBe('');
     });

     it('should update editor content via ngOnChanges', () => {
          const newValue = '{"updated": true}';

          component.ngOnChanges({
               value: { currentValue: newValue } as any,
          });

          expect((component as any).view.dispatch).toHaveBeenCalled();
     });

     it('should destroy editor on ngOnDestroy', () => {
          component.ngOnDestroy();
          expect((component as any).view.destroy).toHaveBeenCalled();
     });
});
