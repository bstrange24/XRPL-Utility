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

// Define this in your service or a constants file
export const FLAG_LABELS: Record<string, string> = {
     disableMasterKey: 'Disable Master Key',
     noFreeze: 'Prevent Freezing Trust Lines',
     allowTrustLineClawback: 'Allow Trust Line Clawback',
     defaultRipple: 'Enable Rippling',
     depositAuth: 'Require Deposit Auth',
     requireDestinationTag: 'Require Destination Tag',
     requireAuthorization: 'Require Trust Line Auth',
     disallowIncomingXRP: 'Disallow XRP Payments',
     globalFreeze: 'Freeze All Trust Lines',
     disallowIncomingNFTokenOffer: 'Block NFT Offers',
     disallowIncomingCheck: 'Block Checks',
     disallowIncomingPayChan: 'Block Payment Channels',
     disallowIncomingTrustline: 'Block Trust Lines',
     allowTrustLineLocking: 'Allow Trust Line Locking',
     // passwordSpent: 'Set Regular Key',
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
          desc: 'Prevents XRP from being sent to this account (other assets can still be sent)',
     },
     {
          key: 'asfDisableMaster',
          title: 'Disable Master Key',
          desc: 'Permanently disables the master key. Can only be enabled if a Regular Key or Signer List is configured.',
     },
     {
          key: 'asfNoFreeze',
          title: 'No Freeze',
          desc: 'Permanently give up the ability to freeze individual trust lines or disable Global Freeze. This flag can never be disabled after being enabled.',
     },
     {
          key: 'asfGlobalFreeze',
          title: 'Global Freeze',
          desc: 'Freezes all trust lines connected to this account, preventing transfers of issued assets.',
     },
     {
          key: 'asfDefaultRipple',
          title: 'Default Ripple',
          desc: 'Allow trust lines to ripple (gateway/currency exchange behavior) by default.',
     },
     {
          key: 'asfDepositAuth',
          title: 'Deposit Authorization',
          desc: 'Requires explicit pre-authorization before others can send payments to this account.',
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
          desc: `Allows the issuer to claw back (reverse) IOUs after they've been sent. This flag cannot be disabled once enabled.`,
     },
     {
          key: 'asfAllowTrustLineLocking',
          title: 'Allow TrustLine Locking',
          desc: 'Allows trust lines to be locked, enabling IOUs to be used as collateral or escrow amounts.',
     },
];
