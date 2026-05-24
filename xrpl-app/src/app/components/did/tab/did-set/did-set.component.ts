import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, ViewChild } from '@angular/core';
import { JsonEditorComponent } from '../../../shared/json-editor/json-editor.component';
import { CommonModule } from '@angular/common';
import { DidStoreService } from '../../../../services/did/did-store/did-store.service';
import { DidUtilService } from '../../../../services/did/did-util/did-util.service';
import { DidViewModelService } from '../../../../services/did/did-view-model/did-view-model.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { NgIcon } from '@ng-icons/core';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-did-set',
     standalone: true,
     imports: [CommonModule, NgIcon, FieldHelperComponent, JsonEditorComponent],
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

     // Helper Items
     readonly didDocumentHelperItems = AppConstants.DID_DOCUMENT_HELPER_ITEMS;
     readonly uriDataHelperItems = AppConstants.URI_DATA_HELPER_ITEMS;
     readonly didDataHelperItems = AppConstants.DID_DATA_HELPER_ITEMS;

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

     // UI Signals
     showDidDocumentHelper = signal(false);
     showUriDataHelper = signal(false);
     showDidDataHelper = signal(false);

     hasNoExistingDid = computed(() => this.didStoreService.existingDid().length <= 0);
     byteLengthDidDocument = computed(() => this.didViewModelService.didDocumentDataByteLength());
     byteLengthUriData = computed(() => this.didViewModelService.uriDataByteLength());
     byteLengthDidData = computed(() => this.didViewModelService.didDataByteLength());
     validDidSchema = computed(() => this.didViewModelService.validDidSchema());
     hasJsonSyntaxError = computed(() => this.didViewModelService.hasJsonSyntaxError());

     // For DID Document
     didDocumentError = computed(() => this.didViewModelService.getJsonObjectError(this.didStoreService.didDocumentData(), 'DID Document'));

     // For URI Data
     uriDataError = computed(() => this.didViewModelService.getJsonObjectError(this.didStoreService.uriData(), 'URI Data'));

     // For DID Data
     didDataError = computed(() => this.didViewModelService.getJsonObjectError(this.didStoreService.didData(), 'DID Data'));

     // Toggle Methods
     toggleDidDocumentHelper() {
          this.showDidDocumentHelper.set(!this.showDidDocumentHelper());
     }

     toggleUriDataHelper() {
          this.showUriDataHelper.set(!this.showUriDataHelper());
     }

     toggleDidDataHelper() {
          this.showDidDataHelper.set(!this.showDidDataHelper());
     }
}
