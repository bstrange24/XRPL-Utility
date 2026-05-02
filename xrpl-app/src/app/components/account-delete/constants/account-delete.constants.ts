export const ACCOUNT_DELETE_TX_TYPES = 'AccountDelete';

export const ACCOUNT_DELETE_CONFIG_TX_DISPLAY_TYPES = {
     SEND: 'deleteAccount',
} as const;

export const ACCOUNT_DELETE_VALIDATION_RULES = {
     ACCOUNT_DELETE: 'AccountDelete',
} as const;

export type AccountDeleteTxType = (typeof ACCOUNT_DELETE_TX_TYPES)[keyof typeof ACCOUNT_DELETE_TX_TYPES];
export type AccountDeleteConfigTxDisplayType = (typeof ACCOUNT_DELETE_CONFIG_TX_DISPLAY_TYPES)[keyof typeof ACCOUNT_DELETE_CONFIG_TX_DISPLAY_TYPES];
