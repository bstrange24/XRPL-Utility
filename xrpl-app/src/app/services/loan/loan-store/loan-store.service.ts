import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { LoanDisplayItem } from '../../../components/loan/constants/loan.types';

export interface LoanState {
     loanBrokerId: string;
     principalRequested: string;
     counterparty: string;
     counterpartySeed: string;
     data: string;
     loanOriginationFee: string;
     loanServiceFee: string;
     latePaymentFee: string;
     closePaymentFee: string;
     overpaymentFee: number | null;
     interestRate: number | null;
     lateInterestRate: number | null;
     closeInterestRate: number | null;
     overpaymentInterestRate: number | null;
     paymentTotal: number | null;
     paymentInterval: number | null;
     gracePeriod: number | null;
     tfLoanOverpayment: boolean;
     tfLoanFullPayment: boolean;
     tfLoanLatePayment: boolean;
     existingLoans: LoanDisplayItem[];
     selectedLoanId: string | null;
     loanIdSearchQuery: string;
     manuallyFetchedLoan: LoanDisplayItem | null;
     tfLoanDefault: boolean;
     tfLoanImpair: boolean;
     tfLoanUnimpair: boolean;
     paymentAmount: string;
     assetType: string;
     vault: any;
}

const initialState: LoanState = {
     loanBrokerId: '',
     principalRequested: '',
     counterparty: '',
     counterpartySeed: '',
     data: '',
     loanOriginationFee: '',
     loanServiceFee: '',
     latePaymentFee: '',
     closePaymentFee: '',
     overpaymentFee: null,
     interestRate: null,
     lateInterestRate: null,
     closeInterestRate: null,
     overpaymentInterestRate: null,
     paymentTotal: null,
     paymentInterval: null,
     gracePeriod: null,
     tfLoanOverpayment: false,
     tfLoanFullPayment: false,
     tfLoanLatePayment: false,
     existingLoans: [],
     selectedLoanId: null,
     loanIdSearchQuery: '',
     manuallyFetchedLoan: null,
     tfLoanDefault: false,
     tfLoanImpair: false,
     tfLoanUnimpair: false,
     paymentAmount: '',
     assetType: '',
     vault: null,
};

export const LoanStoreService = signalStore(
     { providedIn: 'root' },

     withState(initialState),

     withMethods(store => ({
          setField<K extends keyof LoanState>(field: K, value: LoanState[K]) {
               patchState(store, { [field]: value });
          },

          resetAll() {
               patchState(store, {
                    ...structuredClone(initialState),
               });
          },

          resetFormFields() {
               patchState(store, {
                    loanBrokerId: '',
                    principalRequested: '',
                    counterparty: '',
                    counterpartySeed: '',
                    data: '',
                    loanOriginationFee: '',
                    loanServiceFee: '',
                    latePaymentFee: '',
                    closePaymentFee: '',
                    overpaymentFee: null,
                    interestRate: null,
                    lateInterestRate: null,
                    closeInterestRate: null,
                    overpaymentInterestRate: null,
                    paymentTotal: null,
                    paymentInterval: null,
                    gracePeriod: null,
                    tfLoanOverpayment: false,
                    tfLoanFullPayment: false,
                    tfLoanLatePayment: false,
                    loanIdSearchQuery: '',
                    tfLoanDefault: false,
                    tfLoanImpair: false,
                    tfLoanUnimpair: false,
                    paymentAmount: '',
                    assetType: '',
                    vault: null,
               });
          },

          getAll(): LoanState {
               const snapshot: any = {};
               for (const [key, value] of Object.entries(store)) {
                    if (typeof value === 'function') {
                         try {
                              snapshot[key] = value();
                         } catch {
                              // ignore non-signal methods
                         }
                    }
               }
               return snapshot as LoanState;
          },
     }))
);
