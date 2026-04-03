import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import * as xrpl from 'xrpl';
import { NFtState } from '../../../services/nft/nft-store/nft-store.service';

export type NftCreateActionTypes = 'createNft' | 'burnNft' | 'updateNFTMetadata';
export type NftCreateConfigTxDisplayType = 'createNft' | 'burnNft' | 'updateNFTMetadata';

export type NftCreateTxType = 'createNft' | 'burnNft' | 'updateNFTMetadata';
export type NftCreateFlagKey = 'createNft' | 'burnNft' | 'updateNFTMetadata';

export interface NftCreateTxConfig {
     nft: NFtState;
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

export interface BactchFlags {
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
