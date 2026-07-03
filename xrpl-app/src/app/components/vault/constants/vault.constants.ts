import { FlagOption } from '../../shared/flag-selector/flag-selector.component';
import { VaultFlagKey } from './vault.types';

export const VAULT_TAB = ['createVault', 'modifyVault', 'depositVault', 'withdrawlVault', 'clawbackVault', 'deleteVault'] as const;
export type ValutTab = (typeof VAULT_TAB)[number];

export const VALUT_TX_TYPE_MAP = {
     createVault: 'createVault',
     modifyVault: 'modifyVault',
     depositVault: 'depositVault',
     withdrawlVault: 'withdrawlVault',
     clawbackVault: 'clawbackVault',
     deleteVault: 'deleteVault',
} as const;

export const VAULT_TX_TYPES = {
     CREATE: 'createVault',
     MODIFY: 'modifyVault',
     DEPOSIT: 'depositVault',
     WITHDRAW: 'withdrawlVault',
     CLAWBACK: 'clawbackVault',
     DELETE: 'deleteVault',
} as const;

export const VAULT_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createVault',
     MODIFY: 'modifyVault',
     DEPOSIT: 'depositVault',
     WITHDRAW: 'withdrawlVault',
     CLAWBACK: 'clawbackVault',
     DELETE: 'deleteVault',
} as const;

export type VaultTxTypes = (typeof VAULT_TX_TYPES)[keyof typeof VAULT_TX_TYPES];
export type VaultConfigTxDisplayType = (typeof VAULT_CONFIG_TX_DISPLAY_TYPES)[keyof typeof VAULT_CONFIG_TX_DISPLAY_TYPES];

export const VAULT_FLAGS_CONFIG: FlagOption<VaultFlagKey>[] = [
     { key: 'tfVaultPrivate', label: 'VaultPrivate', hex: '0x00010000', description: 'The vault will only be private.' },
     { key: 'tfVaultShareNonTransferable', label: 'VaultShareNonTransferable', hex: '0x00020000', description: 'Individual share of the vault cannot be transferred.' },
     { key: 'vaultStrategyFirstComeFirstServe', label: 'vaultStrategyFirstComeFirstServe', hex: '0x0001', description: 'Requests are processed on a first-come-first-serve basis.' },
];
