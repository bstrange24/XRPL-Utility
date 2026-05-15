import { computed } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { PaymentChannelFlagState, PaymentChannelFlagValueState } from '../../../components/payment-channel/constants/payment-channel.types';

export interface PaymentChannelState {
     channelIDField: string;
     settleDelay: string;
     destination: string;
     publicKeyField: string;
     amount: string;
     paymentChannelIdSearchQuery: string;
     paymentChannelIdSearchTerm: string;
     channelClaimSignatureField: string;
     authorizedWalletAddress: string;
     paymentChannelCancelAfterTimeField: string;
     authorizedWallets: { name?: string; address: string }[];
     isCreatorMode: boolean;
     isPaymentChannelOwner: boolean;
     isCollapsed: boolean;
     walletPaymentChannelCount: number;
     existingPaymentChannels: any[];
     receivablePaymentChannels: any[];
     closablePaymentChannels: any[];
     totalFlagsValue: number;
     totalFlagsHex: string;
     flags: PaymentChannelFlagState;
     flagValues: PaymentChannelFlagValueState;
}

const initialState: PaymentChannelState = {
     channelIDField: '',
     settleDelay: '',
     destination: '',
     publicKeyField: '',
     amount: '',
     paymentChannelIdSearchQuery: '',
     paymentChannelIdSearchTerm: '',
     channelClaimSignatureField: '',
     authorizedWalletAddress: '',
     paymentChannelCancelAfterTimeField: '',
     isCreatorMode: false,
     isPaymentChannelOwner: false,
     isCollapsed: false,
     walletPaymentChannelCount: 0,
     authorizedWallets: [],
     existingPaymentChannels: [],
     receivablePaymentChannels: [],
     closablePaymentChannels: [],
     totalFlagsValue: 0,
     totalFlagsHex: '0x0',
     flags: {
          renew: false,
          close: true,
          claimAndClose: false,
     },
     flagValues: {
          renew: 0x00010000,
          close: 0x00020000,
     },
};

export const PaymentChannelStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withComputed(store => ({
          credentialSubjectExpirationDate: computed(() => store.paymentChannelCancelAfterTimeField()),
     })),

     withMethods(store => ({
          /** Generic setter */
          setField<K extends keyof PaymentChannelState>(field: K, value: PaymentChannelState[K]) {
               patchState(store, { [field]: value });
          },

          setPaymentChannelCancelAfterTime(value: string) {
               patchState(store, { paymentChannelCancelAfterTimeField: value });
          },

          /** Generic updater */
          updateField<K extends keyof PaymentChannelState>(field: K, updater: (current: PaymentChannelState[K]) => PaymentChannelState[K]) {
               patchState(store, state => ({
                    [field]: updater(state[field]),
               }));
          },

          /** Reset entire store */
          resetAll() {
               patchState(store, structuredClone(initialState));
          },

          /** Clear expiration */
          clearOptionalExpirationDate() {
               patchState(store, { paymentChannelCancelAfterTimeField: '' });
          },

          /** Reset fields that don't contain existing payment channels */
          resetChannelData() {
               patchState(store, {
                    channelIDField: '',
                    settleDelay: '',
                    destination: '',
                    publicKeyField: '',
                    amount: '',
                    paymentChannelIdSearchQuery: '',
                    paymentChannelIdSearchTerm: '',
                    channelClaimSignatureField: '',
                    authorizedWalletAddress: '',
                    paymentChannelCancelAfterTimeField: '',
                    isCreatorMode: false,
                    isPaymentChannelOwner: false,
                    isCollapsed: false,
                    walletPaymentChannelCount: 0,
               });
          },

          /** Reset dropdown-related fields */
          resetChannelIdSelection() {
               patchState(store, {
                    channelIDField: '',
                    channelClaimSignatureField: '',
                    amount: '',
               });
          },

          /** Reset authorizedWalletAddress form fields */
          resetCredentailFields() {
               patchState(store, {
                    channelIDField: '',
                    settleDelay: '',
                    publicKeyField: '',
                    paymentChannelCancelAfterTimeField: '',
                    // credentialIDs: [],
                    destination: '',
                    paymentChannelIdSearchQuery: '',
                    paymentChannelIdSearchTerm: '',
                    channelClaimSignatureField: '',
                    walletPaymentChannelCount: 0,
                    authorizedWallets: [],
                    existingPaymentChannels: [],
                    receivablePaymentChannels: [],
                    closablePaymentChannels: [],
                    flags: {
                         renew: false,
                         close: true,
                         claimAndClose: false,
                    },
                    flagValues: {
                         renew: 0x00010000,
                         close: 0x00020000,
                    },
               });
          },

          /** Snapshot */
          getAll(): PaymentChannelState {
               const snapshot: any = {};
               for (const [key, value] of Object.entries(store)) {
                    if (typeof value === 'function') {
                         try {
                              snapshot[key] = value();
                         } catch {
                              // ignore non-signal functions (methods)
                         }
                    }
               }
               return snapshot as PaymentChannelState;
          },
     }))
);
