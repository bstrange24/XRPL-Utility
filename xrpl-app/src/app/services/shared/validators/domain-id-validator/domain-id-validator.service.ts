import { computed, inject, Injectable } from '@angular/core';
import { PermissionedDomainStoreService } from '../../../permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';

@Injectable({
     providedIn: 'root',
})
export class DomainIdValidatorService {
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);

     isDomainIdValid = computed(() => {
          const domain = this.permissionedDomainStoreService.domainId()?.trim() ?? '';

          // Optional field
          if (!domain) return true;

          // Valid hex string (XRPL hex encoded domain)
          if (/^[0-9A-Fa-f]+$/.test(domain)) {
               return domain.length <= 512;
          }

          // Valid domain name
          const domainRegex = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$/;

          return domainRegex.test(domain);
     });

     hasInvalidDomainId = computed(() => {
          const domain = this.permissionedDomainStoreService.domainId()?.trim() ?? '';
          if (!domain) return false;
          return !this.isDomainIdValid();
     });
}
