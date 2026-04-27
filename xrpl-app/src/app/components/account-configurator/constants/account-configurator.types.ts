import * as xrpl from 'xrpl';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { ACCOUNT_CONFIG_TX_TYPES } from './account-configurator.constants';

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

export interface AccountFlags {
     requireDest: boolean;
     requireAuthorization: boolean;
     disallowIncomingXRP: boolean;
     disableMasterKey: boolean;
     requireDestinationTag: boolean;
     noFreeze: boolean;
     globalFreeze: boolean;
     defaultRipple: boolean;
     depositAuth: boolean;
     asfAuthorizedNFTokenMinter: boolean;
     disallowIncomingNFTokenOffer: boolean;
     disallowIncomingCheck: boolean;
     disallowIncomingPayChan: boolean;
     disallowIncomingTrustline: boolean;
     allowTrustLineClawback: boolean;
     allowTrustLineLocking: boolean;
     passwordSpent: boolean;
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
     account: any;
     txOptions: any;
     wallet: Wallet;
     simulate?: boolean;
     amount?: string;
     nfTokenMinterAddress?: string;
     flagValue?: any;
     operation?: any;
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

export interface AccountConfiguratorState {
     account: any;
     txOptions: any;
     accountInfo: any;
     configurationType: 'holder' | 'exchanger' | 'issuer' | null;
     authorizeFlag: string;
     memoField: string;
     isMemoEnabled: boolean;
     isSimulateEnabled: boolean;
     useMultiSign: boolean;
     multiSignAddress: string;
     multiSignSeeds: string;
     multiSigningEnabled: boolean;
     enableMultiSignFlag: string;
     enableRegularKeyFlag: string;
     hasSignerList: boolean;
     operations: string;
     amount: string;
     destination: string;
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
     signerEntries: string; // was any → refine if possible (e.g. string | object)
     formattedSignerEntries: string; // same
     signerQuorum: number;
     SignerWeight: number;
     signers: any;
     masterKeyDisabled: boolean;
     depositAuthAddresses: any;
     depositAuthEnabled: boolean;
     isdepositAuthAddress: boolean;
     depositAuthAddress: string;
     depositAuthEntries: string; // typo? consider renaming
     formattedDepositAuthEntries: string;
     isNFTokenMinterEnabled: boolean;
     isAuthorizedNFTokenMinter: boolean;
     isUpdateMetaData: boolean;
     isHolderConfiguration: boolean;
     isExchangerConfiguration: boolean;
     isIssuerConfiguration: boolean;
     setFlags: number[];
     clearFlags: number[];
     flagValue?: any;
     operation?: any;
     walletTicketCount: number;
     url: string;
     suppressIndividualFeedback: string;
     totalFlagsValue: number;
     totalFlagsHex: string;
}

export type AccountConfigAction = (typeof ACCOUNT_CONFIG_TX_TYPES)[keyof typeof ACCOUNT_CONFIG_TX_TYPES];

export type AccountConfiguratorField = keyof AccountConfiguratorState;

// Single, fully-typed AccountConfig — replaces any prior loose definition in this file.
// export interface AccountConfig {
//      account: {
//           regularKeyAddress?: string;
//           regularKeySeed?: string;
//           multiSignAddress?: string;
//           multiSignSeeds?: string;
//           depositAuthAddresses?: Array<{ account: string }>;
//           depsositAuthEntries?: any;
//           authorizeFlag?: string;
//           formattedSignerEntries?: any;
//           signerQuorum?: any;
//           enableNftMinter?: string;
//           nfTokenMinterAddress?: string;
//           enableRegularKeyFlag?: string;
//           enableMultiSignFlag?: string;
//           setFlags?: any[];
//           clearFlags?: any[];
//           [key: string]: any;
//      };
//      txOptions: {
//           isSimulateEnabled?: boolean;
//           isRegularKeyAddress?: boolean;
//           useMultiSign?: boolean;
//           [key: string]: any;
//      };
//      wallet: import('../../../services/wallets/manager/wallet-manager.service').Wallet;
//      preFetchedEnv?: PrefetchedLedgerEnvironment;
//      operations?: [];
//      flagValue?: any;
//      operation?: any;
//      destinationAddress?: string;
//      [key: string]: any;
// }
