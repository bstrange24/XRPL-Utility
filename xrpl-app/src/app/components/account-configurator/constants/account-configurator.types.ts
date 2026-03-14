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

export type IconType = 'ng-icon' | 'lucide-icon';

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
     currentLedger: number;
     wallet?: xrpl.Wallet;
}

/**
 * Main configuration interface
 */
export interface AccountConfig {
     wallet: Wallet;

     simulate?: boolean;
     multiSign?: boolean;

     setFlags?: Partial<XrplAccountFlags>;
     clearFlags?: Partial<XrplAccountFlags>;
     tickSize?: number;
     transferRate?: number;

     amountField?: string;
     destinationAddress?: string;
     nfTokenMinterAddress?: string;

     // setFlags?: Partial<XrplAccountFlags>;
     // clearFlags?: Partial<XrplAccountFlags>;

     // tickSize?: number;
     // transferRate?: number;

     publicKey?: string;
     domain?: string;

     isMessageKey?: boolean;
     enableNftMinter?: string;
     suppressIndividualFeedback?: string;

     extra?: Record<string, unknown>;

     preFetchedEnv?: PrefetchedLedgerEnvironment;
}

export interface AccountConfiguratorState {
     accountInfo: any;
     configurationType: 'holder' | 'exchanger' | 'issuer' | null;

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

     tickSize: number;
     transferRate: number;

     domain: string;
     isMessageKey: boolean;
     publicKey: string;

     regularKeyAddress: string;
     regularKeySeed: string;
     isRegularKeyAddress: boolean;
     regularKeySigningEnabled: boolean;

     signerQuorum: number;

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
