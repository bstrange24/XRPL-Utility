import { ChangeDetectionStrategy, Component, computed, inject, input, output, ViewChild } from '@angular/core';
import { JsonEditorComponent } from '../../../shared/json-editor/json-editor.component';
import { CommonModule } from '@angular/common';
import { DidStoreService } from '../../../../services/did/did-store/did-store.service';
import { DidUtilService } from '../../../../services/did/did-util/did-util.service';
import { DidViewModelService } from '../../../../services/did/did-view-model/did-view-model.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-did-set',
     standalone: true,
     imports: [CommonModule, NgIcon, JsonEditorComponent],
     templateUrl: './did-set.component.html',
     styleUrl: './did-set.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidSetComponent {
     @ViewChild('didDataEditor') didDataEditor!: JsonEditorComponent;
     @ViewChild('didDocumentEditor') didDocumentEditor!: JsonEditorComponent;
     @ViewChild('uriEditor') uriEditor!: JsonEditorComponent;

     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly didStoreService = inject(DidStoreService);
     public readonly didUtilService = inject(DidUtilService);
     public readonly didViewModelService = inject(DidViewModelService);

     ngAfterViewInit() {
          // Register all three editors with the service
          if (this.didDataEditor) {
               this.didViewModelService.setDidDataEditor(this.didDataEditor);
          }
          if (this.didDocumentEditor) {
               this.didViewModelService.setDidDocumentEditor(this.didDocumentEditor);
          }
          if (this.uriEditor) {
               this.didViewModelService.setUriDataEditor(this.uriEditor);
          }
     }

     view = input.required<any>();
     canSubmit = input<boolean>(false);

     performAction = output<void>();
     clearFields = output<void>();

     hasNoExistingDid = computed(() => this.didStoreService.existingDid().length <= 0);
     byteLengthDidDocument = computed(() => this.didViewModelService.didDocumentDataByteLength());
     byteLengthUriData = computed(() => this.didViewModelService.uriDataByteLength());
     byteLengthDidData = computed(() => this.didViewModelService.didDataByteLength());
     validDidSchema = computed(() => this.didViewModelService.validDidSchema());
     hasJsonSyntaxError = computed(() => this.didViewModelService.hasJsonSyntaxError());
}
