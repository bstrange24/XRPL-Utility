import { Injectable, signal, WritableSignal } from '@angular/core';
import { DidField } from '../../../components/did/constants/did.constants';

@Injectable({
     providedIn: 'root',
})
export class DidStoreService {
     /** Initial state (single source of truth) */
     private readonly initialState: Record<DidField, any> = {
          didData: '',
          uriData: '',
          didDocumentData: '',
          createdDids: false,
          existingDid: [],
     };

     /** Signal registry */
     private registry: Record<DidField, WritableSignal<any>> = Object.keys(this.initialState).reduce(
          (acc, key) => {
               const field = key as DidField;
               acc[field] = signal(structuredClone(this.initialState[field]));
               return acc;
          },
          {} as Record<DidField, WritableSignal<any>>
     );

     /** Generic getter */
     get<K extends DidField>(field: K) {
          return this.registry[field]();
     }

     /** Generic setter */
     set<K extends DidField>(field: K, value: any) {
          this.registry[field].set(value);
     }

     /** Get raw signal (for template binding) */
     signal<K extends DidField>(field: K): WritableSignal<any> {
          return this.registry[field];
     }

     /** Update existing value */
     update<K extends DidField>(field: K, updater: (current: any) => any) {
          const current = this.registry[field]();
          this.registry[field].set(updater(current));
     }

     /** Reset entire store */
     resetAll() {
          for (const key of Object.keys(this.registry) as DidField[]) {
               const value = this.initialState[key];
               this.registry[key].set(Array.isArray(value) || typeof value === 'object' ? structuredClone(value) : value);
          }
     }

     /** Return full state snapshot */
     getAll(): Record<DidField, any> {
          const values: Partial<Record<DidField, any>> = {};
          for (const key of Object.keys(this.registry) as DidField[]) {
               values[key] = this.registry[key]();
          }
          return values as Record<DidField, any>;
     }

     /** Reset form fields */
     clearDidFields() {
          this.set('didData', '');
          this.set('uriData', '');
          this.set('didDocumentData', '');
     }
}
