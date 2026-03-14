import { Injectable, signal, WritableSignal } from '@angular/core';
import { AccountConfiguratorField } from '../../../components/account-configurator/constants/account-configurator-constants';

@Injectable({
  providedIn: 'root',
})
export class AccountConfiguratorStoreService {
  /** Initial state (single source of truth) */
     private readonly initialState: Record<AccountConfiguratorField, any> = {
      amountField: '',
        destinationAddress: '',
        nfTokenMinterAddress: '',
        setFlags: [],
        clearFlags: [],
        tickSize: '',
        transferRate: '',
        publicKey: '',
        domain: '',
        isMessageKey: false,
        enableNftMinter: '',
        suppressIndividualFeedback: '',
     };

     /** Signal registry */
     private registry: Record<AccountConfiguratorField, WritableSignal<any>> = Object.keys(this.initialState).reduce(
          (acc, key) => {
               const field = key as AccountConfiguratorField;
               acc[field] = signal(structuredClone(this.initialState[field]));
               return acc;
          },
          {} as Record<AccountConfiguratorField, WritableSignal<any>>
     );

     /** Generic getter */
     get<K extends AccountConfiguratorField>(field: K) {
          return this.registry[field]();
     }

     /** Generic setter */
     set<K extends AccountConfiguratorField>(field: K, value: any) {
          this.registry[field].set(value);
     }

     /** Get raw signal (for template binding) */
     signal<K extends AccountConfiguratorField>(field: K): WritableSignal<any> {
          return this.registry[field];
     }

     /** Update existing value */
     update<K extends AccountConfiguratorField>(field: K, updater: (current: any) => any) {
          const current = this.registry[field]();
          this.registry[field].set(updater(current));
     }

     /** Reset entire store */
     resetAll() {
          for (const key of Object.keys(this.registry) as AccountConfiguratorField[]) {
               const value = this.initialState[key];
               this.registry[key].set(Array.isArray(value) || typeof value === 'object' ? structuredClone(value) : value);
          }
     }

     /** Computed expiration date */
    //  credentialSubjectExpirationDate = computed(() => this.registry['expirationDate']());

    //  setCredentialSubjectExpirationDate(value: string) {
    //       this.set('expirationDate', value);
    //  }

     /** Return full state snapshot */
     getAll(): Record<AccountConfiguratorField, any> {
          const values: Partial<Record<AccountConfiguratorField, any>> = {};
          for (const key of Object.keys(this.registry) as AccountConfiguratorField[]) {
               values[key] = this.registry[key]();
          }
          return values as Record<AccountConfiguratorField, any>;
     }

     /** Clear expiration */
     clearOptionalExpirationDate() {
          // this.set('expirationDate', '');
     }

     /** Reset dropdown-related fields */
     resetCredentialIdDropDown() {
          // this.set('credentialID', '');
          // this.set('credentialType', '');
          // this.set('credentialIssuer', '');
          // this.set('selectedCredentials', null);
     }

     /** Reset form fields */
     resetCredentailFields() {
          // this.resetCredentialIdDropDown();
          // this.clearOptionalExpirationDate();

          // this.set('credentialIDs', []);
          // this.set('subject', '');
          // this.set('credentialIdSearchQuery', '');
          // this.set('credentialIdSearchTerm', '');
          // this.set('uri', '');
     }
  
}
