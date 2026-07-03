import { BaseTransaction, GlobalFlagsInterface, XRPLNumber } from 'xrpl/dist/npm/models/transactions/common';

// export type LoanActionTypes = 'createLoan' | 'modifyLoan' | 'payLoan' | 'deleteLoan' | 'impairLoan' | 'unimpairLoan' | 'defaultLoan';
// export const LOAN_TAB = ['createLoan', 'modifyLoan', 'payLoan', 'deleteLoan', 'impairLoan', 'unimpairLoan', 'defaultLoan'] as const;

export type LoanActionTypes = 'createLoan' | 'payLoan' | 'deleteLoan';
export const LOAN_TAB = ['createLoan', 'payLoan', 'deleteLoan'] as const;

export interface LoanManageFlagsInterface extends GlobalFlagsInterface {
     tfLoanDefault?: boolean;
     tfLoanImpair?: boolean;
     tfLoanUnimpair?: boolean;
}

export interface LoanManage extends BaseTransaction {
     TransactionType: 'LoanManage';
     LoanID: string;
     Flags?: number | LoanManageFlagsInterface;
}

export interface LoanSetFlagsInterface {
     tfLoanOverpayment?: boolean;
}

export interface CounterpartySignature {
     SigningPubKey?: string;
     TxnSignature?: string;
     Signers?: any[];
}

export interface LoanSet {
     TransactionType: 'LoanSet';
     Account: string;
     LoanBrokerID: string;
     PrincipalRequested: string | XRPLNumber;
     CounterpartySignature?: CounterpartySignature;
     Counterparty?: string;
     Data?: string;
     LoanOriginationFee?: string | XRPLNumber;
     LoanServiceFee?: string | XRPLNumber;
     LatePaymentFee?: string | XRPLNumber;
     ClosePaymentFee?: string | XRPLNumber;
     OverpaymentFee?: number;
     InterestRate?: number;
     LateInterestRate?: number;
     CloseInterestRate?: number;
     OverpaymentInterestRate?: number;
     PaymentTotal?: number;
     PaymentInterval?: number;
     GracePeriod?: number;
     Flags?: number | LoanSetFlagsInterface;
     Fee?: string;
     LastLedgerSequence?: number;
}

export interface LoanDisplayItem {
     tab: LoanActionTypes;
     id?: string;
     index?: string;
     Borrower: string;
     LoanBrokerID: string;
     PrincipalRequested: string;
     Counterparty?: string;
     Data?: string;
     LoanOriginationFee?: string;
     LoanServiceFee?: string;
     LatePaymentFee?: string;
     ClosePaymentFee?: string;
     OverpaymentFee?: number;
     InterestRate?: number;
     LateInterestRate?: number;
     CloseInterestRate?: number;
     OverpaymentInterestRate?: number;
     PaymentTotal?: number;
     PaymentInterval?: number;
     GracePeriod?: number;
     Flags?: number | LoanSetFlagsInterface;
     owner?: string;
     Account?: string;
     amountDisplay?: string;
     display?: string;
     isOwned?: boolean;
     isParticipating?: boolean;
     status?: 'active' | 'defaulted' | 'closed' | 'pending' | 'impaired';
     remainingBalance?: string;
     isImpaired?: boolean;
     isDefaulted?: boolean;
     LoanSequence: number;
     NextPaymentDueDate: number;
     PaymentRemaining: number;
     PeriodicPayment: number;
     PrincipalOutstanding: string;
     StartDate: number;
     TotalValueOutstanding: number;
}

export interface LoanInfoData {
     walletName: string;
     loanCount: number;
     loansToShow: LoanDisplayItem[];
     links: string | null;
     activeTab: LoanActionTypes;
}

export interface LoanConfig {
     loan: any;
     account: any;
     currency: any;
     txOptions: any;
     wallet: any;
     preFetchedEnv?: any;
     paymentAmount?: any;
     vault?: any;
     loanBroker?: any;
     extra?: Record<string, any>;
}
