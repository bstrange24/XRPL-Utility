import { computed, inject, Injectable } from '@angular/core';
import { CredentialStore } from '../../../credentials/credential-store/credential-store.service';

@Injectable({
     providedIn: 'root',
})
export class UriValidatorService {
     public readonly credentialStore = inject(CredentialStore);

     isUriValid = computed(() => {
          const uri = this.credentialStore.uri()?.trim() ?? '';
          if (!uri) return true; // Optional field

          // Check length
          if (uri.length > 256) return false;

          // Basic URL validation (if it looks like a URL)
          // This is optional - URIs can be other formats too
          try {
               // If it starts with http:// or https://, validate as URL
               if (uri.startsWith('http://') || uri.startsWith('https://')) {
                    new URL(uri); // This will throw if invalid
               }
               return true;
          } catch {
               // If it's not a URL format, still allow if it's a valid format
               // (could be a URN, custom scheme, etc.)
               return /^[a-zA-Z][a-zA-Z0-9+\-.]+:/.test(uri) || /^[a-zA-Z0-9\-_]+$/.test(uri);
          }
     });

     hasInvalidUri = computed(() => {
          const uri = this.credentialStore.uri()?.trim() ?? '';
          if (!uri) return false;
          return !this.isUriValid();
     });
}
