import { Component, Input, computed, inject } from '@angular/core';
import { XrplSchemaService } from '../../../../services/core/xrpl-schema.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { NgIcon } from '@ng-icons/core';
import { JsonPipe } from '@angular/common';

@Component({
     selector: 'app-requirements-info',
     standalone: true,
     // imports: [NgIcon, JsonPipe],
     imports: [JsonPipe],
     templateUrl: './requirements-info.component.html',
})
export class RequirementsInfoComponent {
     private schemaService = inject(XrplSchemaService);
     private credentialUtilService = inject(CredentialUtilService);

     @Input({ required: true }) activeTab!: 'create' | 'accept' | 'delete' | 'verify';

     readonly schema = computed(() => {
          const txType = this.credentialUtilService.txTypeMap[this.activeTab];
          return this.schemaService.getSchema(txType);
     });
}
