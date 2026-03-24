export const SIGN_TRANSACTION_TAB = ['sendXrp'] as const;
export type SendXrpTab = (typeof SIGN_TRANSACTION_TAB)[number];

export const SIGN_TRANSACTION_TX_TYPE_MAP = {
     send: 'PaymentXrp',
} as const;

export const SIGN_TRANSACTION_TX_TYPES = {
     SEND: 'sendXrp',
} as const;

export const SIGN_TRANSACTION_CONFIG_TX_DISPLAY_TYPES = {
     SEND: 'sendXrp',
} as const;

export type SendXrpTxType = (typeof SIGN_TRANSACTION_TX_TYPES)[keyof typeof SIGN_TRANSACTION_TX_TYPES];
export type SignTransactionConfigTxDisplayType = (typeof SIGN_TRANSACTION_CONFIG_TX_DISPLAY_TYPES)[keyof typeof SIGN_TRANSACTION_CONFIG_TX_DISPLAY_TYPES];

export const SIGN_TRANSACTION_VALIDATION_RULES: Record<SendXrpTxType, string> = {
     [SIGN_TRANSACTION_TX_TYPES.SEND]: 'PaymentXrp',
} as const;
