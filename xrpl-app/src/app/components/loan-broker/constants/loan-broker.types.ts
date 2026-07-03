export type LoanBrokerActionTypes = 'createBroker' | 'modifyBroker' | 'deleteBroker' | 'coverWithdraw' | 'coverDeposit' | 'coverClawback' | 'modifyLoan' | 'impairLoan' | 'unimpairLoan' | 'defaultLoan';
export const LOAN_BROKER_TAB = ['createBroker', 'modifyBroker', 'deleteBroker', 'coverWithdraw', 'coverDeposit', 'coverClawback', 'modifyLoan', 'impairLoan', 'unimpairLoan', 'defaultLoan'] as const;

export type LoanBrokerTxType = 'createBroker' | 'modifyBroker' | 'deleteBroker' | 'coverWithdraw' | 'coverDeposit' | 'coverClawback' | 'modifyLoan' | 'impairLoan' | 'unimpairLoan' | 'defaultLoan';

export interface LoanBrokerSet {
     TransactionType: 'LoanBrokerSet';
     Account: string;
     VaultID: string;
     LoanBrokerID?: string;
     Data?: string;
     ManagementFeeRate?: number;
     DebtMaximum?: string | number;
     CoverRateMinimum?: number;
     CoverRateLiquidation?: number;
     Fee?: string;
     LastLedgerSequence?: number;
}

export interface LoanBrokerDisplayItem {
     tab: LoanBrokerActionTypes;
     id?: string;
     index?: string;
     VaultID: string;
     Sequence?: number;
     LoanBrokerID?: string;
     Data?: string;
     ManagementFeeRate?: number;
     CoverAvailable?: number;
     CoverRateLiquidation?: number;
     CoverRateMinimum?: number;
     CoverBalance?: number;
     DebtMaximum?: string;
     DebtTotal?: string;
     LoanSequence?: string;
     owner?: string;
     Account?: string;
     display?: string;
     isOwned?: boolean;
}

export interface LoanBrokerInfoData {
     walletName: string;
     brokerCount: number;
     brokersToShow: LoanBrokerDisplayItem[];
     links: string | null;
     activeTab: LoanBrokerActionTypes;
}

export interface LoanBrokerConfig {
     broker: any;
     loan?: any;
     account: any;
     wallet: any;
     txOptions?: any;
     preFetchedEnv?: any;
     extra?: Record<string, any>;
}
