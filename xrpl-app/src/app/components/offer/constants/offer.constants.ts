export const OFFER_TX_TYPES = {
     CREATE_OFFER: 'createOffer',
     GET_ORDER_BOOK: 'getOrderBook',
     CANCEL_OFFER: 'cancelOffer',
} as const;

export type OfferTxTypes = (typeof OFFER_TX_TYPES)[keyof typeof OFFER_TX_TYPES];

export const OFFER_TAB = ['createOffer', 'getOrderBook', 'cancelOffer'] as const;

export const OFFER_VALIDATION_RULES: Partial<Record<OfferTxTypes, string>> = {
     [OFFER_TX_TYPES.CREATE_OFFER]: 'OfferCreate',
     [OFFER_TX_TYPES.CANCEL_OFFER]: 'OfferCancel',
} as const;
