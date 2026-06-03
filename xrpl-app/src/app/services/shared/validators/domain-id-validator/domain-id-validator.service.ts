import { computed, inject, Injectable } from '@angular/core';
import { PermissionedDomainStoreService } from '../../../permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';

@Injectable({
     providedIn: 'root',
})
export class DomainIdValidatorService {
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);

     isDomainIdValid = computed(() => {
          const domainId = this.permissionedDomainStoreService.domainId()?.trim() ?? '';

          if (!domainId) {
               return true; // optional field
          }

          return /^[0-9A-F]+$/i.test(domainId) && domainId.length % 2 === 0;
     });

     hasInvalidDomainId = computed(() => {
          const domain = this.permissionedDomainStoreService.domainId()?.trim() ?? '';

          return !!domain && !this.isDomainIdValid();
     });
}
