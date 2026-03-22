import { WalletGeneratorTxType, WalletGeneratorTxTypeFull } from './wallet-generator.types';

export const WALLET_GENERATOR_TAB = ['generate', 'deriveSeed', 'deriveMnemonic', 'deriveSecretNumbers', 'removeCustomWallets'] as const;
export type WalletGeneratorTab = (typeof WALLET_GENERATOR_TAB)[number];

// Transaction types
export const WALLET_GENERATOR_TX_TYPES = {
     GENERATE: 'generate',
     DERIVE_SEED: 'deriveSeed',
     DERIVE_MNEMONIC: 'deriveMnemonic',
     DERIVE_SECRET_NUMBERS: 'deriveSecretNumbers',
     REMOVE_CUSTOM_WALLETS: 'removeCustomWallets',
} as const;

// Full transaction types (for XRPL transactions)
export const WALLET_GENERATOR_TX_TYPES_FULL = {
     GENERATE: 'generate',
     DERIVE_SEED: 'deriveSeed',
     DERIVE_MNEMONIC: 'deriveMnemonic',
     DERIVE_SECRET_NUMBERS: 'deriveSecretNumbers',
     REMOVE_CUSTOM_WALLETS: 'removeCustomWallets',
} as const;

// Display types
export const WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES = {
     GENERATE: 'generate',
     DERIVE_SEED: 'deriveSeed',
     DERIVE_MNEMONIC: 'deriveMnemonic',
     DERIVE_SECRET_NUMBERS: 'deriveSecretNumbers',
     REMOVE_CUSTOM_WALLETS: 'removeCustomWallets',
} as const;

// Validation rule names
export const WALLET_GENERATOR_VALIDATION_RULES: Record<WalletGeneratorTxType, string> = {
     [WALLET_GENERATOR_TX_TYPES.GENERATE]: 'generate',
     [WALLET_GENERATOR_TX_TYPES.DERIVE_SEED]: 'deriveSeed',
     [WALLET_GENERATOR_TX_TYPES.DERIVE_MNEMONIC]: 'deriveMnemonic',
     [WALLET_GENERATOR_TX_TYPES.DERIVE_SECRET_NUMBERS]: 'deriveSecretNumbers',
     [WALLET_GENERATOR_TX_TYPES.REMOVE_CUSTOM_WALLETS]: 'removeCustomWallets',
} as const;

export const WALLET_GENERATOR_DEFAULTS = {
     CREDENTIAL_TYPE: '',
     CREDENTIAL_ISSUER: '',
     SUBJECT: '',
     DOMAIN_ID: '',
     SEARCH_QUERY: '',
} as const;

// Type utilities
export function getWalletGeneratorTxTypeFull(type: WalletGeneratorTxType): WalletGeneratorTxTypeFull {
     const map: Record<WalletGeneratorTxType, WalletGeneratorTxTypeFull> = {
          [WALLET_GENERATOR_TX_TYPES.GENERATE]: WALLET_GENERATOR_TX_TYPES_FULL.GENERATE,
          [WALLET_GENERATOR_TX_TYPES.DERIVE_SEED]: WALLET_GENERATOR_TX_TYPES_FULL.DERIVE_SEED,
          [WALLET_GENERATOR_TX_TYPES.DERIVE_MNEMONIC]: WALLET_GENERATOR_TX_TYPES_FULL.DERIVE_MNEMONIC,
          [WALLET_GENERATOR_TX_TYPES.DERIVE_SECRET_NUMBERS]: WALLET_GENERATOR_TX_TYPES_FULL.DERIVE_SECRET_NUMBERS,
          [WALLET_GENERATOR_TX_TYPES.REMOVE_CUSTOM_WALLETS]: WALLET_GENERATOR_TX_TYPES_FULL.REMOVE_CUSTOM_WALLETS,
     };
     return map[type];
}

export function isWalletGeneratorTab(value: string): value is WalletGeneratorTab {
     return value === WALLET_GENERATOR_TX_TYPES.GENERATE || value === WALLET_GENERATOR_TX_TYPES.DERIVE_SEED || value === WALLET_GENERATOR_TX_TYPES.DERIVE_MNEMONIC || value === WALLET_GENERATOR_TX_TYPES.DERIVE_SECRET_NUMBERS || value === WALLET_GENERATOR_TX_TYPES.REMOVE_CUSTOM_WALLETS;
}

// Types derived from constants
export type WalletGeneratorTxTypeFromConst = (typeof WALLET_GENERATOR_TX_TYPES)[keyof typeof WALLET_GENERATOR_TX_TYPES];
export type WalletGeneratorTxTypeFullFromConst = (typeof WALLET_GENERATOR_TX_TYPES_FULL)[keyof typeof WALLET_GENERATOR_TX_TYPES_FULL];
export type WalletGeneratorConfigTxDisplayTypeFromConst = (typeof WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES)[keyof typeof WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES];
