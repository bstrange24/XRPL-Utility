export const SEND_XRP_TAB = ['sendXrp'] as const;
export type SendXrpTab = (typeof SEND_XRP_TAB)[number];

export const SEND_XRP_TX_TYPE_MAP = {
     send: 'PaymentXrp',
} as const;

export const SEND_XRP_TX_TYPES = {
     SEND: 'sendXrp',
} as const;

export const SEND_XRP_CONFIG_TX_DISPLAY_TYPES = {
     SEND: 'sendXrp',
} as const;

export type SendXrpTxType = (typeof SEND_XRP_TX_TYPES)[keyof typeof SEND_XRP_TX_TYPES];
export type SendXrpConfigTxDisplayType = (typeof SEND_XRP_CONFIG_TX_DISPLAY_TYPES)[keyof typeof SEND_XRP_CONFIG_TX_DISPLAY_TYPES];

export const SEND_XRP_VALIDATION_RULES: Record<SendXrpTxType, string> = {
     [SEND_XRP_TX_TYPES.SEND]: 'PaymentXrp',
} as const;
