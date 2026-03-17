import { Injectable, signal, WritableSignal } from '@angular/core';
import { DeleteAccountField } from '../../../components/delete-account/constants/delete-account.types';

@Injectable({
     providedIn: 'root',
})
export class DeleteAccountStoreService {
     /** Initial state (single source of truth) */
     private readonly initialState: Record<DeleteAccountField, any> = {
          accountInfo: [],
          accountObjects: [],
          serverInfo: [],
          blockingObjects: [],
          savedTxJson: [],
          savedTxResult: [],
          regularKeySigningEnabled: false,
     };

     /** Signal registry */
     private readonly registry: Record<DeleteAccountField, WritableSignal<any>> = Object.keys(this.initialState).reduce(
          (acc, key) => {
               const field = key as DeleteAccountField;
               acc[field] = signal(structuredClone(this.initialState[field]));
               return acc;
          },
          {} as Record<DeleteAccountField, WritableSignal<any>>
     );

     /** Generic getter */
     get<K extends DeleteAccountField>(field: K): any {
          return this.registry[field]();
     }

     /** Generic setter */
     set<K extends DeleteAccountField>(field: K, value: any) {
          this.registry[field].set(value);
     }

     /** Get raw signal (for template binding) */
     signal<K extends DeleteAccountField>(field: K): WritableSignal<any> {
          return this.registry[field];
     }

     /** Update existing value */
     update<K extends DeleteAccountField>(field: K, updater: (current: any) => any) {
          const current = this.registry[field]();
          this.registry[field].set(updater(current));
     }

     /** Reset entire store */
     resetAll() {
          for (const key of Object.keys(this.registry) as DeleteAccountField[]) {
               const value = this.initialState[key];
               this.registry[key].set(Array.isArray(value) || typeof value === 'object' ? structuredClone(value) : value);
          }
     }

     /** Return full state snapshot */
     getAll(): Record<DeleteAccountField, any> {
          const values: Partial<Record<DeleteAccountField, any>> = {};
          for (const key of Object.keys(this.registry) as DeleteAccountField[]) {
               values[key] = this.registry[key]();
          }
          return values as Record<DeleteAccountField, any>;
     }

     /** Reset form fields */
     resetFields() {
          this.set('blockingObjects', []);
     }
}
