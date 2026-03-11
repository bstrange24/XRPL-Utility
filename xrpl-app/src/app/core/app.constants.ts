import { ECDSA, TrustSetFlags } from 'xrpl';
import * as xrpl from 'xrpl';

// app.constants.ts

export const BLOCKER_MAP: Record<string, { label: string; route: string; tab?: string }> = {
     RippleState: { label: 'Trust Lines', route: '/trustlines', tab: 'removeTrustline' },
     Offer: { label: 'DEX Offers', route: '/create-offer' },
     Escrow: { label: 'Escrows', route: '/time-escrow', tab: 'cancel' },
     Check: { label: 'Checks', route: '/checks', tab: 'cancel' },
     PayChannel: { label: 'Payment Channels', route: '/payment-channel' },
     Ticket: { label: 'Tickets', route: '/tickets', tab: 'delete' },
     SignerList: { label: 'Signer Lists', route: '/account-configurator', tab: 'modifySignerList' },
     RegularKey: { label: 'Regular Key', route: '/account-configurator', tab: 'modifyRegularKey' },
     NFTokenPage: { label: 'NFTs', route: '/create-nft' },
     PermissionedDomain: { label: 'Permissioned Domains', route: '/permissioned-domain', tab: 'delete' },
     // Credential: { label: 'Credentials', route: '/create-credentials', tab: 'delete' },
     // DID: { label: 'DID', route: '/did', tab: 'delete' },
};

export const AppConstants = {
     // XRPL Network Settings
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
               // URL: 'ws://192.168.1.226:6007/',
          },
          // XAHAUTESTNET: {
          //      NAME: 'XahauTest',
          //      URL: 'wss://xahau-test.net/',
          // },
     },

     XRPL_WIN_URL: {
          MAINNET: 'https://xrplwin.com/',
          TESTNET: 'https://testnet.xrplwin.com/',
          DEVNET: 'https://devnet.xrplwin.com/',
          // MAINNET_TX: 'https://xrplwin.com/tx/',
          // TESTNET_TX: 'https://testnet.xrplwin.com/tx/',
          // DEVNET_TX: 'https://devnet.xrplwin.com/tx/',
          TX: 'https://devnet.xrplwin.com/tx/',
          // MAINNET_ACCOUNT: 'https://xrplwin.com/account/',
          // TESTNET_ACCOUNT: 'https://testnet.xrplwin.com/account/',
          // DEVNET_ACCOUNT: 'https://devnet.xrplwin.com/account/',
          DEVNET_ACCOUNT: 'https://devnet.xrplwin.com/account/',
     },

     XRPL_EXPLORER_URL: {
          MAINNET: 'https://livenet.xrpl.org/',
          TESTNET: 'https://testnet.xrpl.org/',
          DEVNET: 'https://devnet.xrpl.org/',
          // MAINNET_TX: 'https://xrplwin.com/tx/',
          // TESTNET_TX: 'https://testnet.xrplwin.com/tx/',
          // DEVNET_TX: 'https://devnet.xrplwin.com/tx/',
          TX: 'https://devnet.xrplwin.com/tx/',
          // MAINNET_ACCOUNT: 'https://xrplwin.com/account/',
          // TESTNET_ACCOUNT: 'https://testnet.xrplwin.com/account/',
          // DEVNET_ACCOUNT: 'https://devnet.xrplwin.com/account/',
          DEVNET_ACCOUNT: 'https://devnet.xrplwin.com/account/',
     },

     CREDENTIAL_REGEX: /^[0-9A-F]{2,128}$/,
     LSF_ACCEPTED: 0x00010000,
     SKIP_THRESHOLD_MS: 60 * 1000,
     RIPPLE_EPOCH: Date.UTC(2000, 0, 1, 0, 0, 0),
     RIPPLE_EPOCH_START: new Date('2000-01-01T00:00:00Z').getTime() / 1000,
     RIPPLE_EPOCH_OFFSET: 946684800,

     // Encryption Algorithms
     ENCRYPTION: {
          ED25519: 'ed25519' as ECDSA,
          SECP256K1: 'secp256k1' as ECDSA,
     },

     TRANSACTION: {
          TES_SUCCESS: 'tesSUCCESS',
     },

     // Payment tx flags
     PAYMENT_FLAGS: {
          0x00010000: 'tfNoDirectRipple',
          0x00020000: 'tfPartialPayment',
          0x00040000: 'tfLimitQuality',
     },
     OFFER_CREATE_FLAGS: {
          0x00010000: 'tfPassive',
          0x00020000: 'tfImmediateOrCancel',
          0x00040000: 'tfFillOrKill',
          0x00080000: 'tfSell',
     },

     // TrustSet tx flags
     TRUST_SET_FLAGS: {
          0x00010000: 'tfSetAuth',
          0x00020000: 'tfSetNoRipple',
          0x00040000: 'tfClearNoRipple',
          0x00080000: 'tfSetFreeze',
          0x00100000: 'tfClearFreeze',
     },
     RIPPLE_STATE_FLAGS: {
          0x00010000: 'lsfLowReserve',
          0x00020000: 'lsfHighReserve',
          0x00040000: 'lsfLowNoRipple',
          0x00080000: 'lsfHighNoRipple',
          0x00100000: 'lsfLowFreeze',
          0x00200000: 'lsfHighFreeze',
     },

     // EscrowCreate tx flags
     ESCROW_CREATE_FLAGS: {
          0x00020000: 'tfFinishAfter',
          0x00040000: 'tfCancelAfter',
     },
     NFT_FLAGS: {
          Burnable: 1,
          OnlyXRP: 2,
          TrustLine: 4,
          Transferable: 8,
          Mutable: 16,
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
     ACCOUNT_FLAGS_CONFIG: [
          {
               key: 'asfRequireDest',
               title: 'Require Destination Tag',
               desc: 'Require a destination tag to send transactions to this account.',
          },
          {
               key: 'asfRequireAuth',
               title: 'Require Trust Line Auth',
               desc: 'Require authorization for users to hold balances issued by this address can only be enabled if the address has no trust lines connected to it.',
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
     ],

     // Account Flags (from your flagList in AccountComponent)
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
          { name: 'passwordSpent', label: 'Set Regular Key', value: 100, xrplName: 'passwordSpent', xrplEnum: '' },
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

     BLACK_LISTED_MEMES: ['USD', 'EUR', 'GBP', 'JPY', 'BTC', 'ETH', 'XRP', 'CNY', 'USDT', 'USDC', 'DAI', '666', 'GRD', 'coreum905c098732', 'RLUSD', 'ETH', 'USDC.axl'],

     INPUT_IDS: [
          'encryptionType',
          'createWallet',
          'account1name',
          'account2name',
          'account3name',
          'issuerName',
          'account1address',
          'account2address',
          'account3address',
          'issuerAddress',
          'account1seed',
          'account2seed',
          'account3seed',
          'issuerSeed',
          'account1encryptionAlgorithm',
          'account2encryptionAlgorithm',
          'issuerEncryptionAlgorithm',
          'account1mnemonic',
          'account2mnemonic',
          'account3mnemonic',
          'issuerMnemonic',
          'account1secretNumbers',
          'account2secretNumbers',
          'account3secretNumbers',
          'issuerSecretNumbers',
          'accountNameField',
          'accountAddressField',
          'accountSeedField',
          'xrpBalanceField',
          'amountField',
          'destinationField',
          'knownIssuers',
     ],

     TAB_ICON_SIZE: '20',
     TAB_META_INFO_ICON_SIZE: '27',
     XRP_CURRENCY: 'XRP',
     EMPTY_STRING: '',
     LAST_LEDGER_ADD_TIME: 20,
     SIGN_TX_LAST_LEDGER_ADD_TIME: 1000,
     MAX_FEE: '12',
     MIN_FEE: '10',
     MAX_ESCROW_FEE: '24',
     TOAST: {
          SUCCESS: 400000,
          ERROR: 400000,
          INFO: 4000,
     },

     TRUSTLINE: {
          FLAGS: {
               tfSetfAuth: false,
               tfSetNoRipple: false,
               tfClearNoRipple: false,
               tfSetFreeze: false,
               tfClearFreeze: false,
               tfSetDeepFreeze: false,
          },
          FLAG_LIST: [
               { key: 'tfSetfAuth', label: 'Require Authorization (tfSetfAuth)' },
               { key: 'tfSetNoRipple', label: 'Set No Ripple (tfSetNoRipple)' },
               { key: 'tfClearNoRipple', label: 'Clear No Ripple (tfClearNoRipple)' },
               { key: 'tfSetFreeze', label: 'Set Freeze (tfSetFreeze)' },
               { key: 'tfClearFreeze', label: 'Clear Freeze (tfClearFreeze)' },
               { key: 'tfSetDeepFreeze', label: 'Set Freeze (tfSetDeepFreeze)' },
          ],
          FLAG_MAP: {
               tfSetfAuth: TrustSetFlags.tfSetfAuth,
               tfSetNoRipple: TrustSetFlags.tfSetNoRipple,
               tfClearNoRipple: TrustSetFlags.tfClearNoRipple,
               tfSetFreeze: TrustSetFlags.tfSetFreeze,
               tfClearFreeze: TrustSetFlags.tfClearFreeze,
               tfSetDeepFreeze: TrustSetFlags.tfSetDeepFreeze,
          },
          // LEDGER_FLAG_MAP: {
          //      lsfLowAuth: 0x00010000,
          //      lsfNoRipple: 0x00020000, // ← shared flag
          //      lsfLowFreeze: 0x00100000,
          //      lsfHighFreeze: 0x00200000,
          //      lsfHighAuth: 0x00080000,
          // },
          // LEDGER_FLAG_MAP: {
          //      lsfLowReserve: 0x00010000, // Bit 16: Internal (low account reserve)
          //      lsfHighReserve: 0x00020000, // Bit 17: Internal (high account reserve)
          //      lsfLowAuth: 0x00040000, // Bit 18: Low side authorized high to hold its issuances
          //      lsfHighAuth: 0x00080000, // Bit 19: High side authorized low to hold its issuances
          //      lsfLowNoRipple: 0x00100000, // Bit 20: NoRipple enabled on low side
          //      lsfHighNoRipple: 0x00200000, // Bit 21: NoRipple enabled on high side
          //      lsfLowFreeze: 0x00400000, // Bit 22: Freeze enabled on low side
          //      lsfLowDeepFreeze: 0x00400000,
          //      lsfNoRipple: 0x00020000,
          //      lsfHighFreeze: 0x00800000, // Bit 23: Freeze enabled on high side
          //      lsfHighDeepFreeze: 0x00800000,
          // },
          LEDGER_FLAG_MAP: {
               lsfLowReserve: 0x00010000,
               lsfHighReserve: 0x00020000,

               lsfLowAuth: 0x00040000,
               lsfHighAuth: 0x00080000,

               lsfLowNoRipple: 0x00100000,
               lsfHighNoRipple: 0x00200000,

               lsfLowFreeze: 0x00400000,
               lsfHighFreeze: 0x00800000,

               lsfLowDeepFreeze: 0x01000000,
               lsfHighDeepFreeze: 0x02000000,
          },
          // LEDGER_FLAG_MAP: {
          //      lsfLowAuth: 0x00010000,
          //      lsfHighAuth: 0x00020000,
          //      lsfLowNoRipple: 0x00040000,
          //      lsfHighNoRipple: 0x00080000,
          //      lsfLowFreeze: 0x00100000,
          //      lsfHighFreeze: 0x00200000,
          //      lsfLowDeepFreeze: 0x00400000,
          //      lsfHighDeepFreeze: 0x00800000,
          //      lsfNoRipple: 0x00020000,
          // },
          // LEDGER_FLAG_MAP: {
          //      lsfLowAuth: 0x00010000,
          //      lsfHighAuth: 0x00040000,
          //      lsfNoRipple: 0x00020000,
          //      lsfLowFreeze: 0x00400000,
          //      lsfHighFreeze: 0x00800000,
          // },
          CONFLICTS: {
               tfSetNoRipple: ['tfClearNoRipple'],
               tfClearNoRipple: ['tfSetNoRipple'],
               tfSetFreeze: ['tfClearFreeze'],
               tfClearFreeze: ['tfSetFreeze'],
          } as { [key: string]: string[] },
     },

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
