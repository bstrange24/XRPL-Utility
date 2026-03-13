import { Injectable, signal, computed, WritableSignal } from '@angular/core';

export type CredentialField = 'credentialIDs' | 'credentialID' | 'credentialType' | 'subject' | 'credential' | 'uri' | 'expirationDate' | 'credentialIssuer' | 'credentialIdSearchQuery' | 'credentialIdSearchTerm' | 'existingCredentials' | 'selectedCredentials' | 'subjectCredentials' | 'domainId';

@Injectable({ providedIn: 'root' })
export class CredentialStore {
     /** Initial state (single source of truth) */
     private readonly initialState: Record<CredentialField, any> = {
          credentialIDs: [],
          credentialID: '',
          credentialType: '',
          subject: '',
          credentialIssuer: '',
          credentialIdSearchQuery: '',
          credentialIdSearchTerm: '',
          existingCredentials: [],
          selectedCredentials: null,
          subjectCredentials: [],
          uri: '',
          expirationDate: '',
          credential: null,
          domainId: '',
     };

     /** Signal registry */
     private registry: Record<CredentialField, WritableSignal<any>> = Object.keys(this.initialState).reduce(
          (acc, key) => {
               const field = key as CredentialField;
               acc[field] = signal(structuredClone(this.initialState[field]));
               return acc;
          },
          {} as Record<CredentialField, WritableSignal<any>>
     );

     /** Generic getter */
     get<K extends CredentialField>(field: K) {
          return this.registry[field]();
     }

     /** Generic setter */
     set<K extends CredentialField>(field: K, value: any) {
          this.registry[field].set(value);
     }

     /** Get raw signal (for template binding) */
     signal<K extends CredentialField>(field: K): WritableSignal<any> {
          return this.registry[field];
     }

     /** Update existing value */
     update<K extends CredentialField>(field: K, updater: (current: any) => any) {
          const current = this.registry[field]();
          this.registry[field].set(updater(current));
     }

     /** Reset entire store */
     resetAll() {
          for (const key of Object.keys(this.registry) as CredentialField[]) {
               const value = this.initialState[key];
               this.registry[key].set(Array.isArray(value) || typeof value === 'object' ? structuredClone(value) : value);
          }
     }

     /** Computed expiration date */
     credentialSubjectExpirationDate = computed(() => this.registry['expirationDate']());

     setCredentialSubjectExpirationDate(value: string) {
          this.set('expirationDate', value);
     }

     /** Return full state snapshot */
     getAll(): Record<CredentialField, any> {
          const values: Partial<Record<CredentialField, any>> = {};
          for (const key of Object.keys(this.registry) as CredentialField[]) {
               values[key] = this.registry[key]();
          }
          return values as Record<CredentialField, any>;
     }

     /** Clear expiration */
     clearOptionalExpirationDate() {
          this.set('expirationDate', '');
     }

     /** Reset dropdown-related fields */
     resetCredentialIdDropDown() {
          this.set('credentialID', '');
          this.set('credentialType', '');
          this.set('credentialIssuer', '');
          this.set('selectedCredentials', null);
     }

     /** Reset form fields */
     resetCredentailFields() {
          this.resetCredentialIdDropDown();
          this.clearOptionalExpirationDate();

          this.set('credentialIDs', []);
          this.set('subject', '');
          this.set('credentialIdSearchQuery', '');
          this.set('credentialIdSearchTerm', '');
          this.set('uri', '');
     }
}
