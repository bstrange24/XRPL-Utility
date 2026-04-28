import { FlagOption } from '../../shared/flag-selector/flag-selector.component';
import { NftFlagKey } from './nft-create.types';

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

export const NFT_FLAGS_CONFIG: FlagOption<NftFlagKey>[] = [
     { key: 'burnableNft', label: 'Burnable', hex: '0x00000001 tfBurnable', description: 'The minted token may be burned by the issuer or current holder.' },
     { key: 'onlyXrpNft', label: 'OnlyXRP', hex: '0x00000002 tfOnlyXRP', description: 'Indicates that the token may only be offered or sold for XRP.' },
     { key: 'transferableNft', label: 'Transferable', hex: '0x00000008 tfTransferable', description: 'Indicates that this NFT can be transferred.' },
     { key: 'mutableNft', label: 'Mutable', hex: '0x00000010 tfMutable', description: `Indicates that this NFT's URI can be modified after minting.` },
];
