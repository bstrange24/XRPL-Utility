export const ACCOUNT_BALANCE_TAB = ['accountBalance'] as const;
export type AccountBalanceTab = (typeof ACCOUNT_BALANCE_TAB)[number];

export const ACCOUNT_BALANCE_TX_TYPE_MAP = {
     accountBalance: 'AccountBalance',
} as const;

export const ACCOUNT_BALANCE_TX_TYPES = {
     ACCOUNT_BALANCE: 'accountBalance',
} as const;

export const ACCOUNT_BALANCE_CONFIG_TX_DISPLAY_TYPES = {
     ACCOUNT_BALANCE: 'accountBalance',
} as const;

export type AccountBalanceTxType = (typeof ACCOUNT_BALANCE_TX_TYPES)[keyof typeof ACCOUNT_BALANCE_TX_TYPES];
export type AccountBalanceConfigTxDisplayType = (typeof ACCOUNT_BALANCE_CONFIG_TX_DISPLAY_TYPES)[keyof typeof ACCOUNT_BALANCE_CONFIG_TX_DISPLAY_TYPES];

export const ACCOUNT_BALANCE_VALIDATION_RULES: Record<AccountBalanceTxType, string> = {
     [ACCOUNT_BALANCE_TX_TYPES.ACCOUNT_BALANCE]: 'AccountBalance',
} as const;
