import { Injectable, signal, WritableSignal } from '@angular/core';
import { PermissionedDomainField } from '../../../components/permissioned-domain/constants/permissioned-domain.constants';

@Injectable({
     providedIn: 'root',
})
export class PermissionedDomainStoreService {
     /** Initial state (single source of truth) */
     private readonly initialState: Record<PermissionedDomainField, any> = {
          createdPermissionedDomains: [],
          createdDomains: [],
          selectedDomainId: '',
          credentialType: '',
          credentialIssuer: '',
          subject: '',
          credentialIdSearchQuery: '',
          regularKeySigningEnabled: false,
     };

     /** Signal registry */
     private registry: Record<PermissionedDomainField, WritableSignal<any>> = Object.keys(this.initialState).reduce(
          (acc, key) => {
               const field = key as PermissionedDomainField;
               acc[field] = signal(structuredClone(this.initialState[field]));
               return acc;
          },
          {} as Record<PermissionedDomainField, WritableSignal<any>>
     );

     /** Generic getter */
     get<K extends PermissionedDomainField>(field: K) {
          return this.registry[field]();
     }

     /** Generic setter */
     set<K extends PermissionedDomainField>(field: K, value: any) {
          this.registry[field].set(value);
     }

     /** Get raw signal (for template binding) */
     signal<K extends PermissionedDomainField>(field: K): WritableSignal<any> {
          return this.registry[field];
     }

     /** Update existing value */
     update<K extends PermissionedDomainField>(field: K, updater: (current: any) => any) {
          const current = this.registry[field]();
          this.registry[field].set(updater(current));
     }

     /** Reset entire store */
     resetAll() {
          for (const key of Object.keys(this.registry) as PermissionedDomainField[]) {
               const value = this.initialState[key];
               this.registry[key].set(Array.isArray(value) || typeof value === 'object' ? structuredClone(value) : value);
          }
     }

     /** Return full state snapshot */
     getAll(): Record<PermissionedDomainField, any> {
          const values: Partial<Record<PermissionedDomainField, any>> = {};
          for (const key of Object.keys(this.registry) as PermissionedDomainField[]) {
               values[key] = this.registry[key]();
          }
          return values as Record<PermissionedDomainField, any>;
     }

     /** Reset dropdown-related fields */
     resetDomainDropDown() {
          this.set('selectedDomainId', '');
     }

     /** Reset form fields */
     resetDomainFields() {
          this.resetDomainDropDown();
          this.set('credentialType', '');
     }
}
