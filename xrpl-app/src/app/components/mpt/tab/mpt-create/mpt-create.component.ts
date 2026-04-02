import { Component, inject, input, ViewChild } from '@angular/core';
import { JsonEditorComponent } from '../../../json-editor/json-editor.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-mpt-create',
     standalone: true,
     imports: [CommonModule, FormsModule, JsonEditorComponent],
     templateUrl: './mpt-create.component.html',
     styleUrl: './mpt-create.component.css',
})
export class MptCreateComponent {
     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;

     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly mptUtil = inject(MptUtilService);

     // Pass these from parent if needed
     readonly metadataByteLength = input.required<number>();
     readonly metadataIsValid = input.required<boolean>();

     // Getters / Setters for cleaner template
     get assetScale() {
          return this.mptStoreService.assetScale();
     }
     set assetScale(value: number) {
          this.mptStoreService.setField('assetScale', value);
     }

     get tokenCount() {
          return this.mptStoreService.tokenCount();
     }
     set tokenCount(value: number) {
          this.mptStoreService.setField('tokenCount', value);
     }

     get transferFee() {
          return this.mptStoreService.transferFee();
     }
     set transferFee(value: number) {
          this.mptStoreService.setField('transferFee', value);
     }

     get metaData() {
          return this.mptStoreService.metaData();
     }
     set metaData(value: string) {
          this.mptStoreService.setField('metaData', value);
     }

     formatJson() {
          if (this.jsonEditor) {
               this.jsonEditor.format();
          }
     }
}
