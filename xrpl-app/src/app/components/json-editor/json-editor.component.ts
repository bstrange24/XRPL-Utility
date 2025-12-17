import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, signal } from '@angular/core';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { vscodeLight } from '@uiw/codemirror-theme-vscode';
// import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from '@codemirror/basic-setup'; // optional, but recommended
import { linter, lintGutter } from '@codemirror/lint';

@Component({
     selector: 'app-json-editor',
     imports: [],
     templateUrl: './json-editor.component.html',
     styleUrl: './json-editor.component.css',
})
export class JsonEditorComponent {
     @Input() value = '';
     @Output() valueChange = new EventEmitter<string>();

     @ViewChild('editor') editorRef!: ElementRef;

     private view!: EditorView;
     private languageConf = new Compartment(); // For dynamic language/theme if needed

     jsonError = signal<string>('');

     ngAfterViewInit() {
          setTimeout(() => {
               this.view = new EditorView({
                    state: EditorState.create({
                         doc: this.value,
                         extensions: [
                              // oneDark,
                              vscodeLight,
                              json(),
                              lintGutter(), // Shows markers in the left gutter
                              linter(jsonParseLinter()), // Basic JSON syntax linting
                              lineNumbers(),
                              keymap.of([...defaultKeymap, indentWithTab]),
                              this.languageConf.of([]),
                              // This removes extra bottom padding and makes content fill the height
                              EditorView.theme({
                                   '&': {
                                        height: '100%',
                                   },
                                   '.cm-scroller': {
                                        overflow: 'auto',
                                   },
                                   '.cm-content': {
                                        minHeight: '100%',
                                        paddingBottom: '50px', // Small buffer so cursor isn't at very bottom
                                   },
                              }),

                              EditorView.updateListener.of((update: ViewUpdate) => {
                                   if (update.docChanged) {
                                        const newValue = update.state.doc.toString();
                                        this.valueChange.emit(newValue);
                                        this.validateJson(newValue);
                                   }
                              }),
                         ],
                    }),
                    parent: this.editorRef.nativeElement,
               });
          }, 0);
     }

     private validateJson(content: string) {
          if (!content.trim()) {
               this.jsonError.set('');
               return;
          }

          try {
               JSON.parse(content);
               this.jsonError.set(''); // Valid
          } catch (e: any) {
               this.jsonError.set(e.message || 'Invalid JSON');
          }
     }

     // Public method for the Format button
     format() {
          const current = this.view.state.doc.toString();
          if (!current.trim()) return;

          try {
               const obj = JSON.parse(current);
               const formatted = JSON.stringify(obj, null, 2);
               this.view.dispatch({
                    changes: { from: 0, to: current.length, insert: formatted },
               });
               this.jsonError.set('');
          } catch (e) {
               this.jsonError.set('Invalid JSON – cannot format');
          }
     }

     ngOnDestroy() {
          if (this.view) {
               this.view.destroy();
          }
     }
}
