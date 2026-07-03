import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import * as xrpl from 'xrpl';
import { MptState } from '../../../services/mpt/mpt-store/mpt-store.service';
import { CurrencyState } from '../../../services/currency/constants/currency.types';
import { EscrowState } from '../../../services/escrow/escrow-store/escrow-store.service';
import { TrustlineState } from '../../trustlines/constants/trustline.types';
import { VaultState } from '../../../services/vault/vault-store/vault-store.service';

type IssuedCurrencyAmount = {
     currency: string;
     value: string;
};

type MptAmount = {
     mpt_issuance_id: string;
     value: string;
};

export type VaultActionTypes = 'createVault' | 'modifyVault' | 'depositVault' | 'withdrawlVault' | 'clawbackVault' | 'deleteVault';
export type VaultConfigTxDisplayType = 'createVault' | 'modifyVault' | 'depositVault' | 'clawbackVault' | 'deleteVault';

export type VaultTxType = 'createVault' | 'modifyVault' | 'depositVault' | 'withdrawlVault' | 'clawbackVault' | 'deleteVault';
export type VaultFlagKey = 'tfVaultPrivate' | 'tfVaultShareNonTransferable' | 'vaultStrategyFirstComeFirstServe';

type XrplAmount = string | IssuedCurrencyAmount | MptAmount;

export interface VaultFlags {
     tfVaultPrivate: boolean;
     tfVaultShareNonTransferable: boolean;
     vaultStrategyFirstComeFirstServe: boolean;
}

export interface VaultConfig {
     escrow?: EscrowState;
     account?: AccountConfiguratorState;
     trustline?: TrustlineState;
     currency?: CurrencyState;
     mpt?: MptState;
     vault?: VaultState;
     txOptions?: XrplTxOptionsState;
     wallet: Wallet;
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          ledgerInfo: any;
          wallet?: any;
     };
     extra?: Record<string, any>;
}

export interface VaultInfoData {
     walletName: string;
     vaultCount: number;
     vaultsToShow: AnyVaultDisplayItem[];
     links: string | null;
     activeTab: VaultActionTypes;
}

export interface AnyVaultDisplayItem {
     tab: VaultActionTypes;
     VaultSequence: number;
     Sequence?: number; // Add this
     amount: string;
     amountDisplay: string;
     currency?: string;
     issuer?: string;
     destination: string;
     sender: string;
     owner: string;
     id: string;
     data: string;
     shareMPTID: string;
     withdrawalPolicy: number;
     withdrawalPolicyName?: string;
     flags: any;
     asset: string;
     index: string;
     txHash: string;
     assetsMaximum?: any;
     Asset?: any; // Original Asset object from the ledger
     AssetsMaximum?: any; // Original AssetsMaximum from the ledger
     Shares?: any;
     AssetsAvailable?: any;
     AssetsTotal?: any;
     Scale?: any;
}

export interface VaultDataForUI {
     Account: string;
     Owner: string;
     Asset: string;
     Data: string;
     Flags: number;
     ShareMPTID: string;
     WithdrawalPolicy: number;
     index: string;
     Sequence: number | null;
     TxHash: string;
     amount?: string;
     currency?: string;
     issuer?: string;
     amountDisplay?: string;
}

export interface VaultInfoData {
     walletName: string;
     vaultCount: number;
     mpts: any;
     vaultsToShow: AnyVaultDisplayItem[];
     links: string | null;
     activeTab: VaultActionTypes;
}
