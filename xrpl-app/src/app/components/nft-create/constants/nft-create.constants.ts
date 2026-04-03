export const NFT_CREATE_TAB = ['createNft', 'burnNft', 'updateNFTMetadata'] as const;
export type NftCreateTab = (typeof NFT_CREATE_TAB)[number];

export const NFT_CREATE_TX_TYPE_MAP = {
     createNft: 'createNft',
     burnNft: 'burnNft',
     updateNFTMetadata: 'updateNFTMetadata',
} as const;

export const NFT_CREATE_TX_TYPES = {
     CREATE: 'createNft',
     BURN: 'burnNft',
     UPDATE_METADATA: 'updateNFTMetadata',
} as const;

export const NFT_CREATE_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createNft',
     BURN: 'burnNft',
     UPDATE_METADATA: 'updateNFTMetadata',
};

export type NftCreateTxTypes = (typeof NFT_CREATE_TX_TYPES)[keyof typeof NFT_CREATE_TX_TYPES];
export type NftCreateConfigTxDisplayType = (typeof NFT_CREATE_CONFIG_TX_DISPLAY_TYPES)[keyof typeof NFT_CREATE_CONFIG_TX_DISPLAY_TYPES];

export const NFT_CREATE_VALIDATION_RULES: Record<NftCreateTxTypes, string> = {
     [NFT_CREATE_TX_TYPES.CREATE]: 'CreateNft',
     [NFT_CREATE_TX_TYPES.BURN]: 'BurnNft',
     [NFT_CREATE_TX_TYPES.UPDATE_METADATA]: 'UpdateNFTMetadata',
} as const;
