import { CheckTxType } from './checks.types';

export const CHECK_TAB = ['createCheck', 'cashCheck', 'cancelCheck'] as const;
export type CheckTab = (typeof CHECK_TAB)[number];

export const CHECK_TX_TYPE_MAP = {
     createCheck: 'createCheck',
     cashCheck: 'cashCheck',
     cancelCheck: 'cancelCheck',
} as const;

export const CHECK_TX_TYPES = {
     CREATE: 'createCheck',
     CASH: 'cashCheck',
     CANCEL: 'cancelCheck',
} as const;

export const CHECK_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createCheck',
     CASH: 'cashCheck',
     CANCEL: 'cancelCheck',
} as const;

export type CredentialTxType = (typeof CHECK_TX_TYPES)[keyof typeof CHECK_TX_TYPES];
export type CredentialConfigTxDisplayType = (typeof CHECK_CONFIG_TX_DISPLAY_TYPES)[keyof typeof CHECK_CONFIG_TX_DISPLAY_TYPES];

export const CHECK_VALIDATION_RULES: Record<CheckTxType, string> = {
     [CHECK_TX_TYPES.CREATE]: 'CreateCheck',
     [CHECK_TX_TYPES.CASH]: 'CashCheck',
     [CHECK_TX_TYPES.CANCEL]: 'CancelCheck',
} as const;
