import { Injectable, signal, WritableSignal } from '@angular/core';
import { UiSignerEntry } from '../../../models/interface-items.model';
import { AccountConfiguratorField } from '../../../components/account-configurator/constants/account-configurator.types';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorStoreService {
     /** Initial state (single source of truth) */
     private readonly initialState: Record<AccountConfiguratorField, any> = {
          accountInfo: '',
          configurationType: '',
          memoField: '',
          isMemoEnabled: false,
          isSimulateEnabled: false,
          useMultiSign: false,
          multiSignAddress: '',
          multiSignSeeds: '',
          multiSigningEnabled: false,
          hasSignerList: false,
          operations: '',
          amountField: '',
          nfTokenMinterAddress: '',
          authorizeFlag: '',
          enableMultiSignFlag: '',
          enableRegularKeyFlag: '',
          enableNftMinter: '',
          tickSize: '',
          transferRate: '',
          domain: '',
          isMessageKey: false,
          publicKey: '',
          regularKeyAddress: '',
          regularKeySeed: 'JOE',
          isRegularKeyAddress: false,
          regularKeySigningEnabled: false,
          signerQuorum: 0,
          SignerWeight: 0,
          signers: [{ Account: '', seed: '', SignerWeight: 1 }] as UiSignerEntry[],
          depositAuthAddresses: [{ Account: '', seed: '', SignerWeight: 1 }] as UiSignerEntry[],
          masterKeyDisabled: false,
          depositAuthEnabled: false,
          isdepositAuthAddress: false,
          depositAuthAddress: '',
          depsositAuthEntries: '',
          formattedDepsositAuthEntries: '',
          signerEntries: '',
          formattedSignerEntries: '',
          isNFTokenMinterEnabled: false,
          isAuthorizedNFTokenMinter: false,
          isUpdateMetaData: false,
          isHolderConfiguration: false,
          isExchangerConfiguration: false,
          isIssuerConfiguration: false,
          setFlags: [] as number[],
          clearFlags: [] as number[],
          walletTicketCount: 0,
          url: '',
          suppressIndividualFeedback: '',
     };

     /** Signal registry */
     private readonly registry: Record<AccountConfiguratorField, WritableSignal<any>> = Object.keys(this.initialState).reduce(
          (acc, key) => {
               const field = key as AccountConfiguratorField;
               acc[field] = signal(structuredClone(this.initialState[field]));
               return acc;
          },
          {} as Record<AccountConfiguratorField, WritableSignal<any>>
     );

     /** Generic getter */
     get<K extends AccountConfiguratorField>(field: K): any {
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

     /** Return full state snapshot */
     getAll(): Record<AccountConfiguratorField, any> {
          const values: Partial<Record<AccountConfiguratorField, any>> = {};
          for (const key of Object.keys(this.registry) as AccountConfiguratorField[]) {
               values[key] = this.registry[key]();
          }
          return values as Record<AccountConfiguratorField, any>;
     }

     // Convenience methods for signers (multi-sign list)
     addSigner(signer: UiSignerEntry) {
          this.update('signers', (current: UiSignerEntry[]) => [...current, signer]);
     }

     removeSigner(index: number) {
          this.update('signers', (current: UiSignerEntry[]) => current.filter((_, i) => i !== index));
     }

     clearSigners() {
          this.set('signers', [{ Account: '', seed: '', SignerWeight: 1 }]);
     }

     // Convenience methods for deposit authorization addresses
     addDepositAuthAddress(entry: UiSignerEntry) {
          this.update('depositAuthAddresses', (current: UiSignerEntry[]) => [...current, entry]);
     }

     removeDepositAuthAddress(index: number) {
          this.update('depositAuthAddresses', (current: UiSignerEntry[]) => current.filter((_, i) => i !== index));
     }

     clearDepositAuthAddresses() {
          this.set('depositAuthAddresses', [{ account: '' }]);
     }

     // in AccountConfiguratorStoreService
     updateSigner(index: number, field: keyof UiSignerEntry, value: any) {
          this.update('signers', (current: UiSignerEntry[]) => {
               const copy = [...current];
               copy[index] = { ...copy[index], [field]: value };
               return copy;
          });
     }

     updateDepositAuthAddress(index: number, field: 'account', value: string) {
          // only 'account' for now
          this.update('depositAuthAddresses', (current: any[]) => {
               const copy = [...current];
               copy[index] = { ...copy[index], [field]: value };
               return copy;
          });
     }
}
