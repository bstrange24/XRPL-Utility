import * as xrpl from 'xrpl';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { UiSignerEntry } from '../../../models/interface-items.model';

/**
 * Single source of truth for all account configuration actions
 */
export const ACCOUNT_CONFIG_ACTIONS = {
     MODIFY_ACCOUNT_FLAGS: 'modifyAccountFlags',
     MODIFY_ACCOUNT_SET_FLAGS: 'modifyAccountSetFlags',
     MODIFY_META_DATA: 'modifyMetaData',
     UPDATE_META_DATA: 'updateMetaData',
     MODIFY_DEPOSIT_AUTH: 'modifyDepositAuth',
     MODIFY_MULTI_SIGNERS: 'modifyMultiSigners',
     MODIFY_REGULAR_KEY: 'modifyRegularKey',
} as const;

export type AccountConfigAction = (typeof ACCOUNT_CONFIG_ACTIONS)[keyof typeof ACCOUNT_CONFIG_ACTIONS];

/**
 * XRPL Account Flags
 */
export interface XrplAccountFlags {
     asfRequireDest: boolean;
     asfRequireAuth: boolean;
     asfDisallowXRP: boolean;
     asfDisableMaster: boolean;
     asfNoFreeze: boolean;
     asfGlobalFreeze: boolean;
     asfDefaultRipple: boolean;
     asfDepositAuth: boolean;
     asfAuthorizedNFTokenMinter: boolean;
     asfDisallowIncomingNFTokenOffer: boolean;
     asfDisallowIncomingCheck: boolean;
     asfDisallowIncomingPayChan: boolean;
     asfDisallowIncomingTrustline: boolean;
     asfAllowTrustLineClawback: boolean;
     asfAllowTrustLineLocking: boolean;
}

export type XrplAccountFlagKey = keyof XrplAccountFlags;

/**
 * Prefetched ledger environment used when building transactions
 */
export interface PrefetchedLedgerEnvironment {
     client: xrpl.Client;
     accountInfo: xrpl.AccountInfoResponse;
     accountObjects?: xrpl.AccountObjectsResponse;
     destinationAccountInfo?: xrpl.AccountInfoResponse;
     fee: string;
     ledgerInfo: any;
     currentLedger: number;
     wallet?: Wallet;
}

/**
 * Main configuration interface
 */
export interface AccountConfig {
     wallet: Wallet;
     simulate?: boolean;
     amountField?: string;
     nfTokenMinterAddress?: string;
     setFlags?: number[];
     clearFlags?: number[];
     tickSize?: number;
     transferRate?: number;
     publicKey?: string;
     domain?: string;
     isMessageKey?: boolean;
     depositAuthAddresses?: any;
     signerQuorum?: number;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     isRegularKeyAddress?: any;
     depsositAuthEntries?: any;
     formattedDepsositAuthEntries?: any;
     signerEntries: any;
     formattedSignerEntries: any;
     multiSignAddress?: any;
     multiSignSeeds?: any;
     authorizeFlag?: string;
     enableRegularKeyFlag?: string;
     enableMultiSignFlag?: string;
     enableNftMinter?: string;
     multiSign?: boolean;
     destinationAddress?: string;
     SignerWeight?: number;
     useMultiSign?: any;
     suppressIndividualFeedback?: string;
     operations?: any;
     preFetchedEnv?: PrefetchedLedgerEnvironment;
     extra?: Record<string, unknown>;
}

export type AccountConfiguratorField =
     | 'accountInfo'
     | 'operations'
     | 'amountField'
     | 'setFlags'
     | 'clearFlags'
     | 'nfTokenMinterAddress'
     | 'tickSize'
     | 'transferRate'
     | 'publicKey'
     | 'domain'
     | 'isMessageKey'
     | 'enableNftMinter'
     | 'multiSignAddress'
     | 'multiSignSeeds'
     | 'signerQuorum'
     | 'SignerWeight'
     | 'regularKeyAddress'
     | 'regularKeySeed'
     | 'suppressIndividualFeedback'
     | 'isRegularKeyAddress'
     | 'regularKeySigningEnabled'
     | 'multiSigningEnabled'
     | 'signers'
     | 'depositAuthAddresses'
     | 'walletTicketCount'
     | 'isSimulateEnabled'
     | 'masterKeyDisabled'
     | 'depositAuthEnabled'
     | 'isdepositAuthAddress'
     | 'isNFTokenMinterEnabled'
     | 'isUpdateMetaData'
     | 'isHolderConfiguration'
     | 'isExchangerConfiguration'
     | 'isIssuerConfiguration'
     | 'isAuthorizedNFTokenMinter'
     | 'depositAuthAddress'
     | 'url'
     | 'isMemoEnabled'
     | 'authorizeFlag'
     | 'enableMultiSignFlag'
     | 'enableRegularKeyFlag'
     | 'memoField'
     | 'useMultiSign'
     | 'configurationType'
     | 'hasSignerList'
     | 'depsositAuthEntries'
     | 'formattedDepsositAuthEntries'
     | 'signerEntries'
     | 'formattedSignerEntries';

export interface AccountConfiguratorState {
     accountInfo: any;
     configurationType: 'holder' | 'exchanger' | 'issuer' | null;

     authorizeFlag: any;
     memoField: string;
     isMemoEnabled: boolean;

     isSimulateEnabled: boolean;
     useMultiSign: boolean;

     multiSignAddress: string;
     multiSignSeeds: string;
     multiSigningEnabled: boolean;
     hasSignerList: boolean;

     amountField: string;
     nfTokenMinterAddress: string;

     enableNftMinter: string;

     tickSize: string;
     transferRate: string;

     domain: string;
     isMessageKey: boolean;
     publicKey: string;

     regularKeyAddress: string;
     regularKeySeed: string;
     isRegularKeyAddress: boolean;
     regularKeySigningEnabled: boolean;

     signerEntries: any;
     formattedSignerEntries: any;
     signerQuorum: number;
     SignerWeight: number;

     signers: UiSignerEntry[];
     depositAuthAddresses: UiSignerEntry[];

     masterKeyDisabled: boolean;
     depositAuthEnabled: boolean;

     isdepositAuthAddress: boolean;
     depositAuthAddress: string;

     isNFTokenMinterEnabled: boolean;
     isAuthorizedNFTokenMinter: boolean;

     isUpdateMetaData: boolean;
     isHolderConfiguration: boolean;
     isExchangerConfiguration: boolean;
     isIssuerConfiguration: boolean;

     setFlags: number[];
     clearFlags: number[];

     walletTicketCount: number;
     url: string;

     suppressIndividualFeedback: string;
}
