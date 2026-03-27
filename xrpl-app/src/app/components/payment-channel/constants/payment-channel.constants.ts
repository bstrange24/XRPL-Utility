export const PAYMENT_CHANNEL_TAB = ['createPaymentChannel', 'fundPaymentChannel', 'claimPaymentChannel', 'renewPaymentChannel', 'closePaymentChannel'] as const;
export type PaymentChannelTxType = 'createPaymentChannel' | 'fundPaymentChannel' | 'claimPaymentChannel' | 'renewPaymentChannel' | 'closePaymentChannel';
export type PaymentChannelTab = (typeof PAYMENT_CHANNEL_TAB)[number];

export const PAYMENT_CHANNEL_TX_TYPE_MAP = {
     createPaymentChannel: 'PaymentChannelCreate',
     fundPaymentChannel: 'PaymentChannelFund',
     claimPaymentChannel: 'PaymentChannelClaim',
     renewPaymentChannel: 'PaymentChannelRenew',
     closePaymentChannel: 'PaymentChannelClose',
} as const;

export const PAYMENT_CHANNEL = {
     CREATE: 'createPaymentChannel',
     FUND: 'fundPaymentChannel',
     CLAIM: 'claimPaymentChannel',
     RENEW: 'renewPaymentChannel',
     CLOSE: 'closePaymentChannel',
} as const;

export const PAYMENT_CHANNEL_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createPaymentChannel',
     FUND: 'fundPaymentChannel',
     CLAIM: 'claimPaymentChannel',
     RENEW: 'renewPaymentChannel',
     CLOSE: 'closePaymentChannel',
} as const;

export type PaymentChannelConfigTxDisplayType = (typeof PAYMENT_CHANNEL_CONFIG_TX_DISPLAY_TYPES)[keyof typeof PAYMENT_CHANNEL_CONFIG_TX_DISPLAY_TYPES];

export const PAYMENT_CHANNEL_VALIDATION_RULES: Record<PaymentChannelTxType, string> = {
     [PAYMENT_CHANNEL.CREATE]: 'PaymentChannelCreate',
     [PAYMENT_CHANNEL.FUND]: 'PaymentChannelFund',
     [PAYMENT_CHANNEL.CLAIM]: 'PaymentChannelClaim',
     [PAYMENT_CHANNEL.RENEW]: 'PaymentChannelRenew',
     [PAYMENT_CHANNEL.CLOSE]: 'PaymentChannelClose',
} as const;
