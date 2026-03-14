import * as xrpl from 'xrpl';
import { XrplAccountFlagKey, XrplAccountFlags } from './account-configurator.types';

/**
 * XRPL AccountSet flag numeric values
 */
export const XRPL_ACCOUNT_FLAG_VALUES = xrpl.AccountSetAsfFlags;

/**
 * Default UI flag state
 */
export const XRPL_ACCOUNT_DEFAULT_FLAGS: Readonly<XrplAccountFlags> = {
     asfRequireDest: false,
     asfRequireAuth: false,
     asfDisallowXRP: false,
     asfDisableMaster: false,
     asfNoFreeze: false,
     asfGlobalFreeze: false,
     asfDefaultRipple: false,
     asfDepositAuth: false,
     asfAuthorizedNFTokenMinter: false,
     asfDisallowIncomingNFTokenOffer: false,
     asfDisallowIncomingCheck: false,
     asfDisallowIncomingPayChan: false,
     asfDisallowIncomingTrustline: false,
     asfAllowTrustLineClawback: false,
     asfAllowTrustLineLocking: false,
};

/**
 * UI configuration for displaying flags
 */
export const XRPL_ACCOUNT_FLAGS_CONFIG: {
     key: XrplAccountFlagKey;
     title: string;
     desc: string;
}[] = [
     {
          key: 'asfRequireDest',
          title: 'Require Destination Tag',
          desc: 'Require a destination tag to send transactions to this account.',
     },
     {
          key: 'asfRequireAuth',
          title: 'Require Trust Line Auth',
          desc: 'Require authorization for users to hold balances issued by this address.',
     },
     {
          key: 'asfDisallowXRP',
          title: 'Disallow XRP',
          desc: 'XRP should not be sent to this account.',
     },
     {
          key: 'asfDisableMaster',
          title: 'Disable Master Key',
          desc: 'Disable the master key pair.',
     },
     {
          key: 'asfNoFreeze',
          title: 'No Freeze',
          desc: 'Give up the ability to freeze trust lines.',
     },
     {
          key: 'asfGlobalFreeze',
          title: 'Global Freeze',
          desc: 'Freeze all issued assets.',
     },
     {
          key: 'asfDefaultRipple',
          title: 'Default Ripple',
          desc: 'Enable rippling on trust lines.',
     },
     {
          key: 'asfDepositAuth',
          title: 'Deposit Authorization',
          desc: 'Require deposit authorization.',
     },
];
