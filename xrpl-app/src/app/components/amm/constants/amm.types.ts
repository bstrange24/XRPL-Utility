import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import * as xrpl from 'xrpl';
import { CurrencyState } from '../../../services/currency/constants/currency.types';
import { AmmState } from '../../../services/amm/amm-store/amm-store.service';

export type AmmActionTypes = 'createAMM' | 'depositToAMM' | 'withdrawlTokenFromAMM' | 'clawbackFromAMM' | 'swapViaAMM' | 'deleteAMM';
export type AmmConfigTxDisplayType = 'createAMM' | 'depositToAMM' | 'withdrawlTokenFromAMM' | 'clawbackFromAMM' | 'swapViaAMM' | 'deleteAMM';

export type AmmTxType = 'createAMM' | 'depositToAMM' | 'withdrawlTokenFromAMM' | 'clawbackFromAMM' | 'swapViaAMM' | 'deleteAMM';
export type AmmFlagKey = 'createAMM' | 'depositToAMM' | 'withdrawlTokenFromAMM' | 'clawbackFromAMM' | 'swapViaAMM' | 'deleteAMM';

export interface AmmTxConfig {
     amm: AmmState;
     currency?: CurrencyState;
     account?: AccountConfiguratorState;
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

export interface NftFlags {
     burnableNft: boolean;
     onlyXrpNft: boolean;
     trustLine: boolean;
     transferableNft: boolean;
     mutableNft: boolean;
}

export interface BatchFlags {
     canLock: boolean;
     canClawback: boolean;
     isRequireAuth: boolean;
     canTransfer: boolean;
     canTrade: boolean;
     canEscrow: boolean;
}

export interface AccountFlags {
     asfRequireDest: boolean;
     asfRequireAuth: boolean;
     asfDisallowXRP: boolean;
     asfDisableMaster: boolean;
     asfNoFreeze: boolean;
     asfGlobalFreeze: boolean;
     asfDefaultRipple: boolean;
     asfDepositAuth: boolean;
     asfAllowTrustLineClawback: boolean;
     asfDisallowIncomingNFTokenOffer: boolean;
     asfDisallowIncomingCheck: boolean;
     asfDisallowIncomingPayChan: boolean;
     asfDisallowIncomingTrustline: boolean;
     asfAllowTrustLineLocking: boolean;
}

export interface XRPLCurrency {
     currency: string;
     issuer?: string;
}

export interface CurrencyAmountXRP {
     currency: 'XRP';
     value: string;
}

export interface CurrencyAmountToken {
     currency: string;
     issuer: string;
     value: string;
}

export interface SectionContent {
     key: string;
     value: string;
}

export interface SectionSubItem {
     key: string;
     openByDefault: boolean;
     content: SectionContent[];
}

export interface Section {
     title: string;
     openByDefault: boolean;
     content?: SectionContent[];
     subItems?: SectionSubItem[];
}

export type CurrencyAmount = CurrencyAmountXRP | CurrencyAmountToken;

export interface IssuerItem {
     name: string;
     address: string;
}

export type PoolOptions = {
     bothPools: boolean;
     firstPoolOnly: boolean;
     secondPoolOnly: boolean;
};
