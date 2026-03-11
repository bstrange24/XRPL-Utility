import { Injectable, signal, computed } from '@angular/core';
import { CredentialData, CredentialItem } from '../../../models/interface-items.model';

@Injectable({ providedIn: 'root' })
export class CredentialStore {
     credentialID = signal<string>('');
     credentialType = signal<string>('');
     credentialIssuer = signal<string>('');

     credential = signal<CredentialData>({
          version: '1.0',
          credential_type: 'KYCCredential',
          issuer: '',
          subject: {
               full_name: '',
               destinationAddress: '',
               dob: '',
               country: '',
               id_type: '',
               id_number: '',
               expirationDate: '',
          },
          verification: { method: '', verified_at: '', verifier: '' },
          hash: '',
          uri: '',
     });

     existingCredentials = signal<CredentialItem[]>([]);
     subjectCredentials = signal<CredentialItem[]>([]);
     selectedCredentials = signal<CredentialItem | null>(null);

     credentialIdSearchQuery = signal<string>('');
     credentialIdSearchTerm = signal<string>('');

     credentialSubjectExpirationDate = computed(() => this.credential().subject.expirationDate);

     setCredentialSubjectExpirationDate(value: string) {
          this.credential.update(c => ({
               ...c,
               subject: {
                    ...c.subject,
                    expirationDate: value,
               },
          }));
     }

     resetSelection() {
          this.selectedCredentials.set(null);
          this.credentialID.set('');
          this.credentialType.set('');
          this.credentialIssuer.set('');
     }
}
