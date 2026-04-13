export const DELEGATE_TAB = ['delegateCreate', 'delegateClear'] as const;
export type DelegateTab = (typeof DELEGATE_TAB)[number];

export const DELEGATE_TX_TYPE_MAP = {
     delegateCreate: 'delegateCreate',
     delegateClear: 'delegateClear',
} as const;

export const DELEGATE_TX_TYPES = {
     CREATE: 'delegateCreate',
     CLEAR: 'delegateClear',
} as const;

export const DELEGATE_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'delegateCreate',
     CLEAR: 'delegateClear',
} as const;

export type DelegateTxType = (typeof DELEGATE_TX_TYPES)[keyof typeof DELEGATE_TX_TYPES];
export type DelegateConfigTxDisplayType = (typeof DELEGATE_CONFIG_TX_DISPLAY_TYPES)[keyof typeof DELEGATE_CONFIG_TX_DISPLAY_TYPES];

export const DELEGATE_VALIDATION_RULES: Record<DelegateTxType, string> = {
     [DELEGATE_TX_TYPES.CREATE]: 'DelegateCreate',
     [DELEGATE_TX_TYPES.CLEAR]: 'DelegateClear',
} as const;
