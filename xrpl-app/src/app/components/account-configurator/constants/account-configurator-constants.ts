// import { AppConstants } from '../../../core/app.constants';
// import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
// import * as xrpl from 'xrpl';

// export interface AccountConfig {
//      wallet: Wallet;
//      simulate?: boolean;
//      multiSign?: boolean;
//      amountField?: string;
//      destinationAddress?: string;
//      nfTokenMinterAddress?: string;
//      setFlags?: any;
//      clearFlags?: any;
//      tickSize?: any;
//      transferRate?: any;
//      publicKey?: string;
//      domain?: string;
//      isMessageKey?: boolean;
//      enableNftMinter?: string;
//      suppressIndividualFeedback?: string;
//      extra?: Record<string, any>;
//      preFetchedEnv?: {
//           client: xrpl.Client;
//           accountInfo: any;
//           accountObjects?: any;
//           fee: string;
//           currentLedger: number;
//           destinationAccountInfo?: any;
//           escrowObjects?: any;
//           escrowObjectsBySequenceId?: any;
//           wallet?: any;
//      };
// }

// type IconType = 'ng-icon' | 'lucide-icon';
// export type AccountConfigTxDisplayType = 'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey';
// export type AccountConfigTxType = 'modifyAccountSetFlags' | 'modifyAccountFlags' | 'updateMetaData' | 'modifyDepositAuth' | 'modifyMetaData' | 'modifyMultiSigners' | 'modifyRegularKey';
// export type AccountConfigTabType = 'modifyAccountFlags' | 'modifyDepositAuth' | 'modifyMetaData' | 'modifyMultiSigners' | 'modifyRegularKey';
// export type AccountConfiguratorField =
//      | 'accountInfo'
//      | 'amountField'
//      | 'setFlags'
//      | 'clearFlags'
//      | 'nfTokenMinterAddress'
//      | 'tickSize'
//      | 'transferRate'
//      | 'publicKey'
//      | 'domain'
//      | 'isMessageKey'
//      | 'enableNftMinter'
//      | 'multiSignAddress'
//      | 'multiSignSeeds'
//      | 'signerQuorum'
//      | 'regularKeyAddress'
//      | 'regularKeySeed'
//      | 'suppressIndividualFeedback'
//      | 'isRegularKeyAddress'
//      | 'regularKeySigningEnabled'
//      | 'multiSigningEnabled'
//      | 'signers'
//      | 'depositAuthAddresses'
//      | 'walletTicketCount'
//      | 'isSimulateEnabled'
//      | 'masterKeyDisabled'
//      | 'depositAuthEnabled'
//      | 'isdepositAuthAddress'
//      | 'isNFTokenMinterEnabled'
//      | 'isUpdateMetaData'
//      | 'isHolderConfiguration'
//      | 'isExchangerConfiguration'
//      | 'isIssuerConfiguration'
//      | 'isAuthorizedNFTokenMinter'
//      | 'depositAuthAddress'
//      | 'url'
//      | 'isMemoEnabled'
//      | 'memoField'
//      | 'useMultiSign'
//      | 'configurationType'
//      | 'hasSignerList';

// export interface XrplAccountFlags {
//      asfRequireDest: boolean;
//      asfRequireAuth: boolean;
//      asfDisallowXRP: boolean;
//      asfDisableMaster: boolean;
//      asfNoFreeze: boolean;
//      asfGlobalFreeze: boolean;
//      asfDefaultRipple: boolean;
//      asfDepositAuth: boolean;
//      asfAuthorizedNFTokenMinter: boolean;
//      asfDisallowIncomingNFTokenOffer: boolean;
//      asfDisallowIncomingCheck: boolean;
//      asfDisallowIncomingPayChan: boolean;
//      asfDisallowIncomingTrustline: boolean;
//      asfAllowTrustLineClawback: boolean;
//      asfAllowTrustLineLocking: boolean;
// }

// /**
//  * XRPL AccountSet flag numeric values
//  */
// export const XRPL_ACCOUNT_FLAG_VALUES = xrpl.AccountSetAsfFlags;

// /**
//  * Default flag state for UI
//  */
// export const XRPL_ACCOUNT_DEFAULT_FLAGS = {
//      asfRequireDest: false,
//      asfRequireAuth: false,
//      asfDisallowXRP: false,
//      asfDisableMaster: false,
//      asfNoFreeze: false,
//      asfGlobalFreeze: false,
//      asfDefaultRipple: false,
//      asfDepositAuth: false,
//      asfAuthorizedNFTokenMinter: false,
//      asfDisallowIncomingNFTokenOffer: false,
//      asfDisallowIncomingCheck: false,
//      asfDisallowIncomingPayChan: false,
//      asfDisallowIncomingTrustline: false,
//      asfAllowTrustLineClawback: false,
//      asfAllowTrustLineLocking: false,
// } as const;

// export const ACCOUNT_CONFIGURATOR_VALIDATION_TYPES = {
//      MODIFY_ACCOUNT_FLAGS: 'modifyAccountFlags',
//      MODIFY_DEPOSIT_AUTH: 'modifyDepositAuth',
//      MODIFY_MULTI_SIGNERS: 'modifyMultiSigners',
//      MODIFY_REGULAR_KEY: 'modifyRegularKey',
//      MODIFY_META_DATA: 'modifyMetaData',
//      UPDATE_META_DATA: 'updateMetaData',
//      MODIFY_ACCOUNT_SET_FLAGS: 'modifyAccountSetFlags',
// } as const;

// export const ACCOUNT_CONFIGURATOR_VALIDATION_RULES: Record<AccountConfigTxType, string> = {
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_ACCOUNT_FLAGS]: 'UpdateAccountFlags',
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_DEPOSIT_AUTH]: 'SetDepositAuthAccounts',
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_MULTI_SIGNERS]: 'SetMultiSign',
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_REGULAR_KEY]: 'SetRegularKey',
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_META_DATA]: 'SetNftMinterAddress',
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.UPDATE_META_DATA]: 'UpdateMetaData',
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_ACCOUNT_SET_FLAGS]: 'UpdateAccountFlags',
// } as const;

// /**
//  * Account flag configuration used for UI display
//  */
// export const XRPL_ACCOUNT_FLAGS_CONFIG = [
//      {
//           key: 'asfRequireDest',
//           title: 'Require Destination Tag',
//           desc: 'Require a destination tag to send transactions to this account.',
//      },
//      {
//           key: 'asfRequireAuth',
//           title: 'Require Trust Line Auth',
//           desc: 'Require authorization for users to hold balances issued by this address. Can only be enabled if the address has no trust lines connected to it.',
//      },
//      {
//           key: 'asfDisallowXRP',
//           title: 'Disallow XRP',
//           desc: 'XRP should not be sent to this account.',
//      },
//      {
//           key: 'asfDisableMaster',
//           title: 'Disable Master Key',
//           desc: 'Disallow use of the master key pair. Can only be enabled if the account has configured another way to sign transactions, such as a Regular Key or a Signer List.',
//      },
//      {
//           key: 'asfNoFreeze',
//           title: 'No Freeze',
//           desc: 'Permanently give up the ability to freeze individual trust lines or disable Global Freeze. This flag can never be disabled after being enabled.',
//      },
//      {
//           key: 'asfGlobalFreeze',
//           title: 'Global Freeze',
//           desc: 'Freeze all assets issued by this account.',
//      },
//      {
//           key: 'asfDefaultRipple',
//           title: 'Default Ripple',
//           desc: "Enable rippling on this account's trust lines by default.",
//      },
//      {
//           key: 'asfDepositAuth',
//           title: 'Deposit Authorization',
//           desc: 'Enable Deposit Authorization on this account.',
//      },
//      {
//           key: 'asfAuthorizedNFTokenMinter',
//           title: 'Authorized NFToken Minter',
//           desc: 'Allow another account to mint and burn tokens on behalf of this account.',
//      },
//      {
//           key: 'asfDisallowIncomingNFTokenOffer',
//           title: 'Disallow Incoming NFToken Offer',
//           desc: 'Disallow other accounts from creating incoming NFTOffers.',
//      },
//      {
//           key: 'asfDisallowIncomingCheck',
//           title: 'Disallow Incoming Check',
//           desc: 'Disallow other accounts from creating incoming Checks.',
//      },
//      {
//           key: 'asfDisallowIncomingPayChan',
//           title: 'Disallow Incoming Payment Channel',
//           desc: 'Disallow other accounts from creating incoming PayChannels.',
//      },
//      {
//           key: 'asfDisallowIncomingTrustline',
//           title: 'Disallow Incoming Trustline',
//           desc: 'Disallow other accounts from creating incoming Trustlines.',
//      },
//      {
//           key: 'asfAllowTrustLineClawback',
//           title: 'Allow TrustLine Clawback',
//           desc: 'Permanently gain the ability to claw back issued IOUs.',
//      },
//      {
//           key: 'asfAllowTrustLineLocking',
//           title: 'Allow TrustLine Locking',
//           desc: 'Issuers allow their IOUs to be used as escrow amounts.',
//      },
// ] as const;

// // export type AccountConfigTxDisplayType = 'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey';
// // export type AccountConfigTxType = 'modifyAccountSetFlags' | 'modifyAccountFlags' | 'updateMetaData' | 'modifyDepositAuth' | 'modifyMetaData' | 'modifyMultiSigners' | 'modifyRegularKey';
// // export type AccountConfigTabType = 'modifyAccountFlags' | 'modifyDepositAuth' | 'modifyMetaData' | 'modifyMultiSigners' | 'modifyRegularKey';
// // export type AccountConfiguratorField =

// /**
//  * Account configuration tabs
//  */
// export const ACCOUNT_CONFIG_TABS: {
//      key: AccountConfigTxDisplayType;
//      label: string;
//      icon: string;
//      iconType: IconType;
//      color: string;
//      iconSize: string;
// }[] = [
//      {
//           key: ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_ACCOUNT_FLAGS,
//           label: 'Account Flags',
//           icon: 'heroArrowPath',
//           iconType: 'ng-icon',
//           color: 'green',
//           iconSize: AppConstants.TAB_ICON_SIZE,
//      },
//      {
//           key: ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_META_DATA,
//           label: 'Meta Data',
//           icon: 'heroArrowPath',
//           iconType: 'ng-icon',
//           color: 'green',
//           iconSize: AppConstants.TAB_ICON_SIZE,
//      },
//      {
//           key: ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_DEPOSIT_AUTH,
//           label: 'Deposit Auth',
//           icon: 'heroArrowPath',
//           iconType: 'ng-icon',
//           color: 'green',
//           iconSize: AppConstants.TAB_ICON_SIZE,
//      },
//      {
//           key: ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_MULTI_SIGNERS,
//           label: 'Multi-Sign',
//           icon: 'heroPlusCircle',
//           iconType: 'ng-icon',
//           color: 'green',
//           iconSize: AppConstants.TAB_ICON_SIZE,
//      },
//      {
//           key: ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_REGULAR_KEY,
//           label: 'Regular Key',
//           icon: 'heroPlusCircle',
//           iconType: 'ng-icon',
//           color: 'green',
//           iconSize: AppConstants.TAB_ICON_SIZE,
//      },
// ] as const;

// /**
//  * Metadata for each tab
//  */
// export const ACCOUNT_CONFIG_TAB_META: Record<
//      AccountConfigTxDisplayType,
//      {
//           icon: string;
//           colorClass: string;
//           title: string;
//           desc: string;
//           color: string;
//           iconSize: string;
//      }
// > = {
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_ACCOUNT_FLAGS]: {
//           icon: 'heroArrowPath',
//           colorClass: 'white-button-submenu',
//           title: 'Modify Account Flags',
//           desc: 'Set or Clear account level flags.',
//           color: 'green',
//           iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
//      },
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_META_DATA]: {
//           icon: 'heroArrowPath',
//           colorClass: 'white-button-submenu',
//           title: 'Modify Account Meta Data',
//           desc: 'Modify the account Meta Data.',
//           color: 'green',
//           iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
//      },
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_DEPOSIT_AUTH]: {
//           icon: 'heroArrowPath',
//           colorClass: 'white-button-submenu',
//           title: 'Modify Account Deposit Auth',
//           desc: 'Modify the account Deposit Authorization Addresses.',
//           color: 'green',
//           iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
//      },
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_MULTI_SIGNERS]: {
//           icon: 'heroPlusCircle',
//           colorClass: 'blue-button-submenu',
//           title: 'Modify Multi Sign',
//           desc: 'Modify Multi Signers for signing transactions.',
//           color: '',
//           iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
//      },
//      [ACCOUNT_CONFIGURATOR_VALIDATION_TYPES.MODIFY_REGULAR_KEY]: {
//           icon: 'heroPlusCircle',
//           colorClass: 'blue-button-submenu',
//           title: 'Modify Regular Key Address',
//           desc: 'Modify Regular Key address for signing transactions.',
//           color: '',
//           iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
//      },
// } as const;
