import { Injectable, signal, computed, WritableSignal } from '@angular/core';

export type CredentialField = 'credentialIDs' | 'credentialID' | 'credentialType' | 'subject' | 'credential' | 'uri' | 'expirationDate' | 'credentialIssuer' | 'credentialIdSearchQuery' | 'credentialIdSearchTerm' | 'existingCredentials' | 'selectedCredentials' | 'subjectCredentials';

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

// import { Injectable, signal, computed, WritableSignal } from '@angular/core';
// import { CredentialItem } from '../../../models/interface-items.model';

// export type CredentialField = 'credentialIDs' | 'credentialID' | 'credentialType' | 'subject' | 'credential' | 'uri' | 'expirationDate' | 'credentialIssuer' | 'credentialIdSearchQuery' | 'credentialIdSearchTerm' | 'existingCredentials' | 'selectedCredentials' | 'subjectCredentials';

// @Injectable({ providedIn: 'root' })
// export class CredentialStore {
//      private registry: Record<CredentialField, WritableSignal<any>> = {} as any;
//      private initialValues: Record<CredentialField, any> = {} as any;

//      constructor() {
//           this.initSignals();
//      }

//      private initSignals() {
//           // Primitive signals
//           this.registry['credentialIDs'] = signal<string[]>([]);
//           this.initialValues['credentialIDs'] = [];

//           this.registry['credentialID'] = signal<string>('');
//           this.initialValues['credentialID'] = '';

//           this.registry['credentialType'] = signal<string>('');
//           this.initialValues['credentialType'] = '';

//           this.registry['subject'] = signal<string>('');
//           this.initialValues['subject'] = '';

//           this.registry['credentialIssuer'] = signal<string>('');
//           this.initialValues['credentialIssuer'] = '';

//           this.registry['credentialIdSearchQuery'] = signal<string>('');
//           this.initialValues['credentialIdSearchQuery'] = '';

//           this.registry['credentialIdSearchTerm'] = signal<string>('');
//           this.initialValues['credentialIdSearchTerm'] = '';

//           this.registry['existingCredentials'] = signal<CredentialItem[]>([]);
//           this.initialValues['existingCredentials'] = [];

//           this.registry['selectedCredentials'] = signal<CredentialItem | null>(null);
//           this.initialValues['selectedCredentials'] = null;

//           this.registry['subjectCredentials'] = signal<CredentialItem[]>([]);
//           this.initialValues['subjectCredentials'] = [];

//           this.registry['uri'] = signal<string>('');
//           this.initialValues['uri'] = '';

//           this.registry['expirationDate'] = signal<string>('');
//           this.initialValues['expirationDate'] = '';

//           // Nested CredentialData signal
//           // const initialCredential: CredentialData = {
//           //      version: '1.0',
//           //      credential_type: 'KYCCredential',
//           //      issuer: '',
//           //      subject: {
//           //           full_name: '',
//           //           destinationAddress: '',
//           //           dob: '',
//           //           country: '',
//           //           id_type: '',
//           //           id_number: '',
//           //           expirationDate: '',
//           //      },
//           //      verification: { method: '', verified_at: '', verifier: '' },
//           //      hash: '',
//           //      uri: '',
//           // };
//           // this.registry['credential'] = signal<CredentialData>(initialCredential);
//           // this.initialValues['credential'] = structuredClone(initialCredential);
//      }

//      /** Generic getter */
//      get<K extends CredentialField>(field: K): ReturnType<WritableSignal<any>> {
//           return this.registry[field]();
//      }

//      /** Generic setter */
//      set<K extends CredentialField>(field: K, value: any) {
//           this.registry[field].set(value);
//      }

//      /** Get the raw signal (for binding) */
//      signal<K extends CredentialField>(field: K): WritableSignal<any> {
//           return this.registry[field];
//      }

//      /** Update a nested value */
//      update<K extends CredentialField>(key: K, updater: (current: any) => any) {
//           const currentValue = this.registry[key]();
//           this.registry[key].set(updater(currentValue));
//      }

//      /** Reset all fields to initial values */
//      resetAll() {
//           for (const key in this.registry) {
//                const field = key as CredentialField;
//                const value = this.initialValues[field];
//                this.registry[field].set(Array.isArray(value) || typeof value === 'object' ? structuredClone(value) : value);
//           }
//      }

//      /** Computed expiration date */
//      credentialSubjectExpirationDate = computed(() => this.registry['expirationDate']());

//      setCredentialSubjectExpirationDate(value: string) {
//           this.set('expirationDate', value);
//      }

//      /** Convenience: get all values */
//      getAll(): Record<CredentialField, any> {
//           const values: Partial<Record<CredentialField, any>> = {};
//           for (const key in this.registry) {
//                values[key as CredentialField] = this.registry[key as CredentialField]();
//           }
//           return values as Record<CredentialField, any>;
//      }

//      /** Clear optional expiration */
//      clearOptionalExpirationDate() {
//           this.set('expirationDate', '');
//      }

//      /** Reset selection fields */
//      resetCredentialIdDropDown() {
//           this.set('credentialID', '');
//           this.set('credentialType', '');
//           this.set('credentialIssuer', '');
//           this.set('selectedCredentials', null);
//      }

//      resetCredentailFields() {
//           this.resetCredentialIdDropDown();
//           this.clearOptionalExpirationDate();
//           this.set('credentialIDs', '');
//           this.set('subject', '');
//           this.set('credentialIdSearchQuery', '');
//           this.set('credentialIdSearchTerm', '');
//           this.set('uri', '');
//      }
// }
