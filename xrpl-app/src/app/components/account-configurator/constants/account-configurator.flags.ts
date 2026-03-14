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
          desc: 'Require authorization for users to hold balances issued by this address. Can only be enabled if the address has no trust lines connected to it.',
     },
     {
          key: 'asfDisallowXRP',
          title: 'Disallow XRP',
          desc: 'XRP should not be sent to this account.',
     },
     {
          key: 'asfDisableMaster',
          title: 'Disable Master Key',
          desc: 'Disallow use of the master key pair. Can only be enabled if the account has configured another way to sign transactions, such as a Regular Key or a Signer List.',
     },
     {
          key: 'asfNoFreeze',
          title: 'No Freeze',
          desc: 'Permanently give up the ability to freeze individual trust lines or disable Global Freeze. This flag can never be disabled after being enabled.',
     },
     {
          key: 'asfGlobalFreeze',
          title: 'Global Freeze',
          desc: 'Freeze all assets issued by this account.',
     },
     {
          key: 'asfDefaultRipple',
          title: 'Default Ripple',
          desc: "Enable rippling on this account's trust lines by default.",
     },
     {
          key: 'asfDepositAuth',
          title: 'Deposit Authorization',
          desc: 'Enable Deposit Authorization on this account.',
     },
     {
          key: 'asfAuthorizedNFTokenMinter',
          title: 'Authorized NFToken Minter',
          desc: 'Allow another account to mint and burn tokens on behalf of this account.',
     },
     {
          key: 'asfDisallowIncomingNFTokenOffer',
          title: 'Disallow Incoming NFToken Offer',
          desc: 'Disallow other accounts from creating incoming NFTOffers.',
     },
     {
          key: 'asfDisallowIncomingCheck',
          title: 'Disallow Incoming Check',
          desc: 'Disallow other accounts from creating incoming Checks.',
     },
     {
          key: 'asfDisallowIncomingPayChan',
          title: 'Disallow Incoming Payment Channel',
          desc: 'Disallow other accounts from creating incoming PayChannels.',
     },
     {
          key: 'asfDisallowIncomingTrustline',
          title: 'Disallow Incoming Trustline',
          desc: 'Disallow other accounts from creating incoming Trustlines.',
     },
     {
          key: 'asfAllowTrustLineClawback',
          title: 'Allow TrustLine Clawback',
          desc: 'Permanently gain the ability to claw back issued IOUs.',
     },
     {
          key: 'asfAllowTrustLineLocking',
          title: 'Allow TrustLine Locking',
          desc: 'Issuers allow their IOUs to be used as escrow amounts.',
     },
];
