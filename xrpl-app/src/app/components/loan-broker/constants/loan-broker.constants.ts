export const LOAN_BROKER_TAB = ['createBroker', 'modifyBroker', 'deleteBroker', 'coverWithdraw', 'coverDeposit', 'coverClawback', 'modifyLoan', 'impairLoan', 'unimpairLoan', 'defaultLoan'] as const;
export type LoanBrokerTab = (typeof LOAN_BROKER_TAB)[number];

export const LOAN_BROKER_TX_TYPE_MAP = {
     createBroker: 'createBroker',
     modifyBroker: 'modifyBroker',
     deleteBroker: 'deleteBroker',
     coverWithdraw: 'coverWithdraw',
     coverDeposit: 'coverDeposit',
     coverClawback: 'coverClawback',
     modifyLoan: 'modifyLoan',
     impairLoan: 'impairLoan',
     unimpairLoan: 'unimpairLoan',
     defaultLoan: 'defaultLoan',
} as const;

export const LOAN_BROKER_TX_TYPES = {
     CREATE: 'createBroker',
     MODIFY: 'modifyBroker',
     DELETE: 'deleteBroker',
     WITHDRAW: 'coverWithdraw',
     DEPOSIT: 'coverDeposit',
     CLAWBACK: 'coverClawback',
     MODIFY_LOAN: 'modifyLoan',
     IMPAIR: 'impairLoan',
     UNIMPAIR: 'unimpairLoan',
     DEFAULT: 'defaultLoan',
} as const;

export const LOAN_BROKER_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createBroker',
     MODIFY: 'modifyBroker',
     DELETE: 'deleteBroker',
     WITHDRAW: 'coverWithdraw',
     DEPOSIT: 'coverDeposit',
     CLAWBACK: 'coverClawback',
     MODIFY_LOAN: 'modifyLoan',
     IMPAIR: 'impairLoan',
     UNIMPAIR: 'unimpairLoan',
     DEFAULT: 'defaultLoan',
} as const;

export type LoanBrokerTxTypes = (typeof LOAN_BROKER_TX_TYPES)[keyof typeof LOAN_BROKER_TX_TYPES];
export type LoanBrokerConfigTxDisplayType = (typeof LOAN_BROKER_CONFIG_TX_DISPLAY_TYPES)[keyof typeof LOAN_BROKER_CONFIG_TX_DISPLAY_TYPES];

export const MAX_DATA_LENGTH = 512;
export const MAX_MANAGEMENT_FEE_RATE = 10000;
export const MAX_COVER_RATE_MINIMUM = 100000;
export const MAX_COVER_RATE_LIQUIDATION = 100000;
