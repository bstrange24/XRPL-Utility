export const NFT_OFFERS_TAB = ['buyNft', 'sellNft', 'buyNftOffer', 'sellNftOffer', 'cancelNftOffer'] as const;
export type NftOffersTab = (typeof NFT_OFFERS_TAB)[number];

export const NFT_OFFERS_TX_TYPE_MAP = {
     buyNft: 'buyNft',
     sellNft: 'sellNft',
     buyNftOffer: 'buyNftOffer',
     sellNftOffer: 'sellNftOffer',
     cancelNftOffer: 'cancelNftOffer',
} as const;

export const NFT_OFFERS_TX_TYPES = {
     BUY_NFT: 'buyNft',
     SELL_NFT: 'sellNft',
     BUY_NFT_OFFER: 'buyNftOffer',
     SELL_NFT_OFFER: 'sellNftOffer',
     CANCEL_NFT_OFFER: 'cancelNftOffer',
} as const;

export const NFT_OFFERS_CONFIG_TX_DISPLAY_TYPES = {
     BUY_NFT: 'buyNft',
     SELL_NFT: 'sellNft',
     BUY_NFT_OFFER: 'buyNftOffer',
     SELL_NFT_OFFER: 'sellNftOffer',
     CANCEL_NFT_OFFER: 'cancelNftOffer',
};

export type NftOffersTxTypes = (typeof NFT_OFFERS_TX_TYPES)[keyof typeof NFT_OFFERS_TX_TYPES];
export type NftOffersConfigTxDisplayType = (typeof NFT_OFFERS_CONFIG_TX_DISPLAY_TYPES)[keyof typeof NFT_OFFERS_CONFIG_TX_DISPLAY_TYPES];

export const NFT_OFFERS_VALIDATION_RULES: Record<NftOffersTxTypes, string> = {
     [NFT_OFFERS_TX_TYPES.BUY_NFT]: 'BuyNft',
     [NFT_OFFERS_TX_TYPES.SELL_NFT]: 'SellNft',
     [NFT_OFFERS_TX_TYPES.BUY_NFT_OFFER]: 'BuyNftOffer',
     [NFT_OFFERS_TX_TYPES.SELL_NFT_OFFER]: 'SellNftOffer',
     [NFT_OFFERS_TX_TYPES.CANCEL_NFT_OFFER]: 'CancelNftOffer',
} as const;

export const NFT_FLAGS = {
     Burnable: 1,
     OnlyXRP: 2,
     TrustLine: 4,
     Transferable: 8,
     Mutable: 16,
} as const;
