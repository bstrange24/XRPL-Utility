import { Component, computed, inject, input, output } from '@angular/core';
import { JsonEditorComponent } from '../../../shared/json-editor/json-editor.component';
import { CommonModule } from '@angular/common';
import { DidStoreService } from '../../../../services/did/did-store/did-store.service';
import { DidUtilService } from '../../../../services/did/did-util/did-util.service';
import { DidViewModelService } from '../../../../services/did/did-view-model/did-view-model.service';
import { ConnectionGuardService } from '../../../../services/connection-guard/connection-guard.service';

@Component({
     selector: 'app-did-set',
     standalone: true,
     imports: [CommonModule, JsonEditorComponent],
     templateUrl: './did-set.component.html',
     styleUrl: './did-set.component.css',
})
export class DidSetComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     didStoreService = inject(DidStoreService); // assume you have this
     didUtilService = inject(DidUtilService);
     didViewModelService = inject(DidViewModelService); // if needed for computed

     view = input.required<any>(); // for button class/label
     canSubmit = input<boolean>(false);

     performAction = output<void>();
     clearFields = output<void>();

     // Convenience computed for template
     hasNoExistingDid = computed(() => this.didStoreService.existingDid().length <= 0);

     byteLengthDidDocument = computed(() => this.didViewModelService.didDocumentDataByteLength());
     byteLengthUriData = computed(() => this.didViewModelService.uriDataByteLength());
     byteLengthDidData = computed(() => this.didViewModelService.didDataByteLength());

     validDidSchema = computed(() => this.didViewModelService.validDidSchema());
     hasJsonSyntaxError = computed(() => this.didViewModelService.hasJsonSyntaxError());
}
