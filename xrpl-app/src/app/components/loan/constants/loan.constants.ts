export const LOAN_TAB = ['createLoan', 'payLoan', 'deleteLoan'] as const;
export type LoanTab = (typeof LOAN_TAB)[number];

export const LOAN_TX_TYPE_MAP = {
     createLoan: 'createLoan',

     payLoan: 'payLoan',
     deleteLoan: 'deleteLoan',
} as const;

export const LOAN_TX_TYPES = ['createLoan', 'payLoan', 'deleteLoan'] as const;
export type LoanTxTypes = (typeof LOAN_TX_TYPES)[number];

export const LOAN_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createLoan',

     PAY: 'payLoan',
     DELETE: 'deleteLoan',
} as const;

export type LoanConfigTxDisplayType = (typeof LOAN_CONFIG_TX_DISPLAY_TYPES)[keyof typeof LOAN_CONFIG_TX_DISPLAY_TYPES];

export const LOAN_BROKER_ID_LENGTH = 64;
export const MAX_DATA_LENGTH = 512;
export const MAX_OVER_PAYMENT_FEE_RATE = 100000;
export const MAX_INTEREST_RATE = 100000;
export const MAX_LATE_INTEREST_RATE = 100000;
export const MAX_CLOSE_INTEREST_RATE = 100000;
export const MAX_OVER_PAYMENT_INTEREST_RATE = 100000;
export const MIN_PAYMENT_INTERVAL = 60;

export const LOAN_FLAGS_CONFIG = [
     {
          key: 'tfLoanOverpayment' as const,
          title: 'Loan Overpayment',
          label: 'tfLoanOverpayment',
          hex: '0x00010000',
          desc: 'Indicates that the loan supports over payments.',
     },
] as const;

export const LOAN_PAY_FLAGS_CONFIG = [
     {
          key: 'tfLoanOverpayment' as const,
          title: 'Overpayment',
          label: 'tfLoanOverpayment',
          hex: '0x00010000',
          desc: 'Indicates that remaining payment amount should be treated as an overpayment.',
     },
     {
          key: 'tfLoanFullPayment' as const,
          title: 'Full Payment',
          label: 'tfLoanFullPayment',
          hex: '0x00020000',
          desc: 'Indicates that the borrower is making a full early repayment.',
     },
     {
          key: 'tfLoanLatePayment' as const,
          title: 'Late Payment',
          label: 'tfLoanLatePayment',
          hex: '0x00040000',
          desc: 'Indicates that the borrower is making a late loan payment.',
     },
] as const;

export const LOAN_MANAGE_FLAGS_CONFIG = [
     {
          key: 'tfLoanDefault' as const,
          title: 'Default Loan',
          label: 'tfLoanDefault',
          hex: '0x00010000',
          desc: 'Indicates that the Loan should be defaulted.',
     },
     {
          key: 'tfLoanImpair' as const,
          title: 'Impair Loan',
          label: 'tfLoanImpair',
          hex: '0x00020000',
          desc: 'Indicates that the Loan should be impaired.',
     },
     {
          key: 'tfLoanUnimpair' as const,
          title: 'Unimpair Loan',
          label: 'tfLoanUnimpair',
          hex: '0x00040000',
          desc: 'Indicates that the Loan should be un-impaired.',
     },
] as const;
