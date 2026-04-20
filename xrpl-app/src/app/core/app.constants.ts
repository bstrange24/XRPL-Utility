import { ECDSA } from 'xrpl';
import * as xrpl from 'xrpl';

export interface TabConfig {
     key: string;
     label: string;
     icon: string;
     iconType: 'ng-icon' | 'lucide-icon';
     iconSize?: string;
     color?: string;
}

export interface TabMetaInfo {
     icon: string;
     colorClass: string;
     title: string;
     desc: string;
     color?: string;
     iconSize?: string;
     iconType?: 'ng-icon' | 'lucide-icon';
}

export type IconType = 'ng-icon' | 'lucide-icon';

export const AppConstants = {
     NETWORKS: {
          MAINNET: {
               NAME: 'mainnet',
               URL: 'wss://s1.ripple.com',
          },
          TESTNET: {
               NAME: 'testnet',
               URL: 'wss://s.altnet.rippletest.net:51233',
          },
          DEVNET: {
               NAME: 'devnet',
               URL: 'wss://s.devnet.rippletest.net:51233',
          },
     },

     XRPL_WIN_URL: {
          MAINNET: 'https://xrplwin.com/',
          TESTNET: 'https://testnet.xrplwin.com/',
          DEVNET: 'https://devnet.xrplwin.com/',
          TX: 'https://devnet.xrplwin.com/tx/',
     },

     XRPL_EXPLORER_URL: {
          MAINNET: 'https://livenet.xrpl.org/',
          TESTNET: 'https://testnet.xrpl.org/',
          DEVNET: 'https://devnet.xrpl.org/',
          TX: 'https://devnet.xrplwin.com/tx/',
     },

     INSUFFICIENT_XRP_BALANCE: 'Insufficient XRP to complete transaction',
     INSUFFICIENT_IOU_BALANCE: 'Insufficent IOU balance for this transaction',
     LSF_ACCEPTED: 0x00010000,
     RIPPLE_EPOCH: Date.UTC(2000, 0, 1, 0, 0, 0),
     RIPPLE_EPOCH_START: new Date('2000-01-01T00:00:00Z').getTime() / 1000,
     RIPPLE_EPOCH_OFFSET: 946684800,
     TAB_ICON_SIZE: '20',
     TAB_META_INFO_ICON_SIZE: '27',
     XRP_CURRENCY: 'XRP',
     LAST_LEDGER_ADD_TIME: 20,
     SIGN_TX_LAST_LEDGER_ADD_TIME: 1000,
     MAX_FEE: '12',
     MIN_FEE: '10',
     TOAST: {
          CONNECTION: 2000,
          SUCCESS: 4000,
          ERROR: 4000,
          INFO: 2000,
          WARN: 3000,
     },

     ENCRYPTION: {
          ED25519: 'ed25519' as ECDSA,
          SECP256K1: 'secp256k1' as ECDSA,
     },

     TRANSACTION: {
          TES_SUCCESS: 'tesSUCCESS',
     },

     TF_INNER_BATCH_TXN: {
          BATCH_TXN: 1073741824, // 262144 in decimal
     },

     BATCH_FLAGS: {
          ALL_OR_NOTHING: 65536,
          ONLY_ONE: 131072,
          UNTIL_FAILURE: 262144,
          INDEPENDENT: 524288,
     },

     FLAGS: [
          { name: 'asfRequireDest', label: 'Require Destination Tag', value: 1, xrplName: 'requireDestinationTag', xrplEnum: xrpl.AccountSetAsfFlags.asfRequireDest },
          { name: 'asfRequireAuth', label: 'Require Trust Line Auth', value: 2, xrplName: 'requireAuthorization', xrplEnum: xrpl.AccountSetAsfFlags.asfRequireAuth },
          { name: 'asfDisallowXRP', label: 'Disallow XRP Payments', value: 3, xrplName: 'disallowIncomingXRP', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowXRP },
          { name: 'asfDisableMaster', label: 'Disable Master Key', value: 4, xrplName: 'disableMasterKey', xrplEnum: xrpl.AccountSetAsfFlags.asfDisableMaster },
          // { name: 'asfAccountTxnID', label: 'Account Txn ID', value: 5, xrplName: 'accountTxnID', xrplEnum: xrpl.AccountSetAsfFlags.asfAccountTxnID },
          { name: 'asfNoFreeze', label: 'Prevent Freezing Trust Lines', value: 6, xrplName: 'noFreeze', xrplEnum: xrpl.AccountSetAsfFlags.asfNoFreeze },
          { name: 'asfGlobalFreeze', label: 'Freeze All Trust Lines', value: 7, xrplName: 'globalFreeze', xrplEnum: xrpl.AccountSetAsfFlags.asfGlobalFreeze },
          { name: 'asfDefaultRipple', label: 'Enable Rippling', value: 8, xrplName: 'defaultRipple', xrplEnum: xrpl.AccountSetAsfFlags.asfDefaultRipple },
          { name: 'asfDepositAuth', label: 'Require Deposit Auth', value: 9, xrplName: 'depositAuth', xrplEnum: xrpl.AccountSetAsfFlags.asfDepositAuth },
          // { name: 'asfAuthorizedNFTokenMinter', label: 'Require Deposit Auth', value: 10, xrplName: 'authorizedNFTokenMinter', xrplEnum: xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter },
          { name: 'asfDisallowIncomingNFTokenOffer', label: 'Block NFT Offers', value: 12, xrplName: 'disallowIncomingNFTokenOffer', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowIncomingNFTokenOffer },
          { name: 'asfDisallowIncomingCheck', label: 'Block Checks', value: 13, xrplName: 'disallowIncomingCheck', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowIncomingCheck },
          { name: 'asfDisallowIncomingPayChan', label: 'Block Payment Channels', value: 14, xrplName: 'disallowIncomingPayChan', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowIncomingPayChan },
          { name: 'asfDisallowIncomingTrustline', label: 'Block Trust Lines', value: 15, xrplName: 'disallowIncomingTrustline', xrplEnum: xrpl.AccountSetAsfFlags.asfDisallowIncomingTrustline },
          { name: 'asfAllowTrustLineClawback', label: 'Allow Trust Line Clawback', value: 16, xrplName: 'allowTrustLineClawback', xrplEnum: xrpl.AccountSetAsfFlags.asfAllowTrustLineClawback },
          { name: 'asfAllowTrustLineLocking', label: 'Allow Trust Line Locking', value: 17, xrplName: 'allowTrustLineLocking', xrplEnum: xrpl.AccountSetAsfFlags.asfAllowTrustLineLocking },
          // { name: 'passwordSpent', label: 'Set Regular Key', value: 100, xrplName: 'passwordSpent', xrplEnum: '' },
     ],

     FLAGMAP: {
          asfRequireDest: 'requireDestinationTag',
          asfRequireAuth: 'requireAuthorization',
          asfDisallowXRP: 'disallowIncomingXRP',
          asfDisableMaster: 'disableMasterKey',
          // asfAccountTxnID: 'accountTxnID',
          asfNoFreeze: 'noFreeze',
          asfGlobalFreeze: 'globalFreeze',
          asfDefaultRipple: 'defaultRipple',
          asfDepositAuth: 'depositAuth',
          // asfAuthorizedNFTokenMinter: 'authorizedNFTokenMinter',
          asfDisallowIncomingNFTokenOffer: 'disallowIncomingNFTokenOffer',
          asfDisallowIncomingCheck: 'disallowIncomingCheck',
          asfDisallowIncomingPayChan: 'disallowIncomingPayChan',
          asfDisallowIncomingTrustline: 'disallowIncomingTrustline',
          asfAllowTrustLineClawback: 'allowTrustLineClawback',
          asfAllowTrustLineLocking: 'allowTrustLineLocking',
     },

     DELEGATE_ACTIONS: [
          { id: 65537, key: 'TrustlineAuthorize', txType: 'Trustline Authorize', description: 'Can authorize individual trust lines.' },
          { id: 65538, key: 'TrustlineFreeze', txType: 'Trustline Freeze', description: 'Can freeze individual trust lines.' },
          { id: 65539, key: 'TrustlineUnfreeze', txType: 'Trustline Unfreeze', description: 'Can unfreeze individual trust lines.' },
          { id: 65540, key: 'AccountDomainSet', txType: 'Account Domain Set', description: 'Can set the Domain field of the account.' },
          { id: 65541, key: 'AccountEmailHashSet', txType: 'Account Email Hash Set', description: 'Can set the EmailHash field of the account.' },
          { id: 65542, key: 'AccountMessageKeySet', txType: 'Account Message Key Set', description: 'Can set the MessageKey field of the account.' },
          { id: 65543, key: 'AccountTransferRateSet', txType: 'Account Transfer Rate Set', description: 'Can set the transfer fee of fungible tokens.' },
          { id: 65544, key: 'AccountTickSizeSet', txType: 'Account TickSize Set', description: 'Can set the tick size of fungible tokens.' },
          { id: 65545, key: 'PaymentMint', txType: 'Payment Mint', description: 'Can send payments that mint fungible tokens or MPTs.' },
          { id: 65546, key: 'PaymentBurn', txType: 'Payment Burn', description: 'Can send payments that burn fungible tokens or MPTs.' },
          { id: 65547, key: 'MPTokenIssuanceLock', txType: 'MPToken Issuance Lock', description: 'Can lock balances of a particular MPT.' },
          { id: 65548, key: 'MPTokenIssuanceUnlock', txType: 'MPToken Issuance Unlock', description: 'Can unlock balances of a particular MPT.' },
     ],

     // Transaction labels
     SIGN_TRANSACTION_LABEL_MAP: {
          batch: 'Batch',
          sendXrp: 'Send XRP',
          setTrustline: 'Set Trustline',
          removeTrustline: 'Remove Trustline',
          accountFlagSet: 'Account Flag Set',
          issueCurrency: 'Issue Currency',
          accountFlagClear: 'Account Flag Clear',
          createTimeEscrow: 'Create Time Escrow',
          finishTimeEscrow: 'Finish Time Escrow',
          createConditionEscrow: 'Create Condition Escrow',
          finishConditionEscrow: 'Finish Condition Escrow',
          cancelEscrow: 'Cancel Escrow',
          createTimeEscrowToken: 'Create Token Time Escrow',
          finishTimeEscrowToken: 'Finish Token Time Escrow',
          createConditionEscrowToken: 'Create Token Condition Escrow',
          finishConditionEscrowToken: 'Finish Token Condition Escrow',
          cancelEscrowToken: 'Cancel Token Escrow',
          createCheck: 'Check Create',
          cashCheck: 'Check Cash',
          cancelCheck: 'Check Cancel',
          createCheckToken: 'Check Token Create',
          cashCheckToken: 'Check Token Cash',
          cancelCheckToken: 'Check Token Cancel',
          createMPT: 'MPT Create',
          authorizeMPT: 'Authorize MPT',
          unauthorizeMPT: 'Unauthorize MPT',
          sendMPT: 'Send MPT',
          lockMPT: 'Lock MPT',
          unlockMPT: 'Unlock MPT',
          destroyMPT: 'Destroy MPT',
     },
};
