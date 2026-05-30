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
     // LSF_ACCEPTED: 0x00010000,
     LSF_ACCEPTED: 65536,
     RIPPLE_EPOCH: Date.UTC(2000, 0, 1, 0, 0, 0),
     RIPPLE_EPOCH_START: new Date('2000-01-01T00:00:00Z').getTime() / 1000,
     RIPPLE_EPOCH_OFFSET: 946684800,
     TAB_ICON_SIZE: '20',
     TAB_META_INFO_ICON_SIZE: '25',
     XRP_CURRENCY: 'XRP',
     LAST_LEDGER_ADD_TIME: 20,
     SIGN_TX_LAST_LEDGER_ADD_TIME: 1000,
     MAX_TOKEN_COUNT: 10_000_000_000_000_000n, // An arbitray large number - 10 quadrillion
     MAX_FEE: '12',
     MIN_FEE: '10',
     TOAST: {
          CONNECTION: 1000,
          SUCCESS: 4000,
          ERROR: 3000,
          INFO: 2000,
          WARN: 3000,
     },
     MPT_ID_EXAMPLES: ['0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF', '000000000000000000000000000000000000000000000000'],
     MPT_META_DATA_HELPER: [
          'Must be a valid JSON object',
          'Immutable after MPT issuance — you cannot change it later',
          'Recommended fields: <code>name</code>, <code>description</code>, <code>image</code>, <code>decimals</code>',
          'Maximum size: <strong>1024 bytes</strong> (after UTF-8 encoding)',
          'Follows the <a href="https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0089-multi-purpose-token-metadata-schema" target="_blank" class="text-blue-600 hover:underline">XLS-89 Metadata Schema</a>',
     ],
     MPT_MAX_TOKEN_HELPER: ['This is the hard cap on total tokens that can ever be issued', 'Once reached, no more tokens can be minted', 'Must be a positive integer (no decimals)', 'Common values: 1,000 / 10,000 / 100,000 / 1,000,000 / 1,000,000,000', 'Set a high number (e.g. 10<sup>15</sup>) if you want effectively unlimited supply'],
     TRANSFER_FEE_HELPER_ITEMS: ['0 = 0% fee (no fee)', '500 = 0.5% fee', '5000 = 5% fee', '50000 = 50% fee (maximum)'],
     URI_HELPER_ITEMS: ['Must be a valid URI (usually starts with <code>https://</code>)', 'Will be automatically converted to hex by the client', 'Maximum 256 bytes after hex encoding', 'Common use: link to JSON metadata (IPFS, Arweave, HTTP, etc.)'],
     MINTER_HELPER_ITEMS: ['Optional field', 'If set, only this account can mint this NFT', 'Useful for royalty enforcement or delegated minting', 'Leave empty to allow anyone with minting rights'],
     ASSET_SCALE_HELPER_ITEMS: ['Scale 0: 1 token (no decimals)', 'Scale 2: 0.01 token precision', 'Scale 6: 0.000001 token precision (XRP standard)', 'Scale 8: 0.00000001 token precision', 'Scale 15: Maximum precision (0.000000000000001)'],

     NFT_OWNER_HELPER_ITEMS: ['Optional field', 'If set, the current owner of the NFT must match this address to modify the NFT', 'Useful for ensuring only the owner can update metadata or burn the NFT', 'Leave empty to allow any holder to modify (if they have the rights based on flags)'],
     TAXON_HELPER_ITEMS: ['A number chosen by the minter to group or categorize NFTs', 'Commonly used to identify collections or series', 'Value can be any integer from <strong>0</strong> to <strong>4,294,967,295</strong>', 'Most minters use small numbers like 0, 1, 10, 100, etc.', 'The combination of <strong>Issuer + Taxon</strong> helps wallets and marketplaces group NFTs'],
     NFT_ID_HELPER_ITEMS: ['Exactly 64 characters in length', 'Only hexadecimal characters (0-9, A-F, a-f)'],
     NFT_OFFER_INDEX_HELPER_ITEMS: ['Exactly 64 characters in length', 'Only hexadecimal characters (0-9, A-F, a-f)', 'The offer index is returned when you create an NFT offer'],
     NFT_SELECT_HELPER_ITEMS: ['Select an NFT you currently own from the dropdown', 'You must own the NFT to create a Sell Offer or other actions', 'Search by NFT ID (hex) or by metadata URI', 'If no NFTs appear, make sure you are connected with the correct wallet'],
     NFT_OFFER_SELECT_HELPER_ITEMS: ['Select an NFT you currently own from the dropdown', 'You must own the NFT to create a Sell Offer or other actions', 'Search by NFT ID (hex) or by Offer ID', 'If no NFTs appear, make sure you are connected with the correct wallet'],
     UPDATE_NFT_HELPER_ITEMS: ['Select an NFT you currently own that you want to update', 'Only NFTs you own with mutable metadata will be available', 'Search by NFT ID or URI', 'Updating metadata is only possible if the NFT was minted with mutable flags', 'This action will create an NFT metadata update transaction'],

     SUBJECT_HELPER_ITEMS: [`This is the holder's account that needs authorization`, 'Must be a valid XRPL address (starts with r...)', 'The issuer account (your current wallet) will grant or revoke authorization'],
     CREDENTIAL_TYPE_HELPER_ITEMS: [`This identifies the type/category of credential being authorized`, 'Must match the credential type defined by the issuer', 'Used to determine which credentials the holder can receive or use'],
     DESTINATION_HELPER_ITEMS: ['The unique address of the account receiving the token', 'Must be a valid XRPL address (starts with r...)', 'If sending to an exchange, make sure to include the correct destination tag if required by the exchange'],
     MPT_ISSUANCE_ID_HELPER_ITEMS: ['The unique identifier of the MPT issuance you want to send', 'Must be a valid MPT Issuance ID (64-character hexadecimal string)', 'You can find this ID in your wallet or on the transaction that created the MPT issuance'],
     MPT_ACTION_HELPER_ITEMS: ['Authorize: Grant permission for the holder to use this MPT', 'Unauthorize: Revoke permission for the holder to use this MPT', 'Some MPTs require both Issuer and Holder authorization'],
     MPT_DESTINATION_HELPER_ITEMS: ['The holder’s account that needs authorization for this MPT', 'Must be a valid XRPL address (starts with r...)', 'This is usually the account that will hold/receive the MPT'],
     MPT_AMOUNT_HELPER_ITEMS: ['The amount of tokens to send', 'Must be a positive number', 'If the token has decimals (scale), you can include up to that many decimal places', 'Example: If the token has scale 6, you can send 0.000001 tokens (1 microtoken) or more'],
     MPT_SEND_SELECT_HELPER_ITEMS: ['Select an MPT that you currently hold in your wallet', 'Only MPTs with a positive balance are shown', 'The selected MPT will be sent to the destination address'],
     MPT_ISSUANCE_ID_SEND_HELPER_ITEMS: ['Unique 48-character hexadecimal identifier of the MPTokenIssuance', 'This identifies exactly which MPT you are sending', 'Usually auto-filled when you select an MPT from the dropdown'],
     MPT_DESTINATION_SEND_HELPER_ITEMS: ['The destination address that will receive the MPT', 'Must be a valid XRPL address (starts with r...)', 'The destination may need authorization to hold this MPT'],
     MPT_AMOUNT_SEND_HELPER_ITEMS: ['Amount of the selected MPT to send', 'Cannot exceed your available balance', "Precision is determined by the MPT's AssetScale"],
     // === MPT Lock / Unlock Page Helpers ===
     MPT_LOCK_ACTION_HELPER_ITEMS: ['Lock: Prevents the MPT from being transferred or used', 'Unlock: Allows the MPT to be transferred or used again', 'Some MPTs may have transfer restrictions that require locking/unlocking'],
     MPT_DESTINATION_LOCK_UNLOCK_HELPER_ITEMS: ['The holder’s account that will have its MPT lock status changed', 'Must be a valid XRPL address (starts with r...)', 'This is usually the account that currently holds the MPT'],
     MPT_ISSUANCE_ID_LOCK_UNLOCK_HELPER_ITEMS: ['Unique 48-character hexadecimal identifier of the MPTokenIssuance', 'This specifies exactly which MPT you want to lock or unlock', 'You can find this ID in your MPT holdings'],
     // === MPT Clawback Page Helpers ===
     MPT_CLAWBACK_SELECT_HELPER_ITEMS: ['Select an MPT you issued that you want to clawback from a holder', 'Only MPTs you have issued and that holders currently possess are shown', 'Clawback is only possible if the MPT has the Clawback flag enabled'],
     MPT_ISSUANCE_ID_CLAWBACK_HELPER_ITEMS: ['Unique 48-character hexadecimal identifier of the MPTokenIssuance', 'This identifies exactly which MPT you want to clawback'],
     MPT_HOLDER_HELPER_ITEMS: ['The address of the account currently holding the MPT you want to clawback', 'Must be a valid XRPL address (starts with r...)', 'You can only clawback tokens from holders of your issued MPT'],
     MPT_CLAWBACK_AMOUNT_HELPER_ITEMS: ['Amount of the MPT to clawback from the holder', 'Cannot exceed the amount the holder currently possesses', 'The tokens will be returned to your issuer account'],
     CURRENCY_CODE_HELPER_ITEMS: [
          '<code>XRP</code> is the native currency of the XRPL and does not require an issuer',
          'User-created currencies are issued by XRPL accounts and are identified by both the currency code and issuer address',
          'Common currency codes: <code>USD</code>, <code>EUR</code>, <code>BTC</code>, <code>RLUSD</code>',
          'Standard currency codes are typically 3–20 characters long',
          'Currency codes are case-sensitive (<code>usd</code> and <code>USD</code> are different)',
          'Non-standard currency codes may appear as 160-bit hexadecimal values',
          'Receiving issued currencies requires a trust line to the issuer',
          'Always verify the issuer address to avoid counterfeit or scam tokens',
     ],
     // === Issue Currency / Send IOU Helpers ===
     IOU_DESTINATION_HELPER_ITEMS: ['The destination address that will receive the issued tokens', 'Must be a valid XRPL address (starts with r...)', 'The destination must have a trustline with you as the issuer'],
     IOU_DESTINATION_TAG_HELPER_ITEMS: ['Destination Tag helps identify the recipient on shared or exchange addresses', 'Commonly required when sending to centralized exchanges or custodians', 'Optional for direct wallet-to-wallet transfers'],
     // === MPT Destroy Page Helpers ===
     MPT_DESTROY_SELECT_HELPER_ITEMS: ['Select an MPT you want to permanently destroy', 'The MPT must have zero outstanding tokens (all must be clawed back first)', 'Destroying an MPT is irreversible'],

     MPT_DESTROY_ISSUANCE_ID_HELPER_ITEMS: ['Unique 48-character hexadecimal identifier of the MPTokenIssuance', 'This is the on-chain ID of the MPT you are destroying', 'Read-only field - automatically filled when you select an MPT'],
     AMOUNT_HELPER_ITEMS: ['For XRP, amounts are entered in whole XRP units (not drops)', 'Issued token amounts may contain decimal values', 'Must be greater than 0', 'Very small XRP amounts may fail because of reserve or fee requirements', 'Examples: <code>1</code>, <code>10.5</code>, <code>2500</code>, <code>0.001</code>', 'Scientific notation (for example <code>1e6</code>) is not recommended', 'Large issued currency amounts may lose precision if too many decimal places are used'],
     CREDENTIAL_ISSUER_HELPER_ITEMS: [`This is the account issuing and managing the credential`, 'Must be a valid XRPL address (starts with r...)', 'Only the issuer account can grant, revoke, or update credential authorizations'],
     ISSUER_HELPER_ITEMS: ['The issuer is the XRPL account that created and controls the currency', 'The combination of currency code + issuer uniquely identifies a token', 'Different issuers may create tokens with the same currency code', 'Always verify the issuer address before sending or accepting tokens', 'XRP does not have or require an issuer', 'Receiving issued currencies requires a trust line to the issuer account', 'Some issuers may freeze tokens or enforce transfer restrictions'],

     // Credential
     CREDENTIAL_SELECTOR_HELPER_ITEMS: ['Select a credential that has been issued to your account', 'Only credentials attached to your current wallet are shown', 'You can search by credential type or ID'],
     CREDENTIAL_TYPE_ACCEPT_HELPER_ITEMS: ['The type/category of the credential (e.g. KYC-Level2, MEMBER, VERIFIED)', 'Defined by the issuer when the credential was created', 'Used to identify the purpose and rules of the credential'],
     CREDENTIAL_ID_HELPER_ITEMS: ['Unique identifier (ledger hash) of the credential', 'This is the on-chain reference used when accepting or using the credential', 'Read-only field for verification'],
     CREDENTIAL_VERIFY_SELECTOR_HELPER_ITEMS: ['Select a credential that has been issued to your account', 'You can search by credential type or ID', 'Only credentials attached to your current wallet are shown'],
     CREDENTIAL_DELETE_SELECTOR_HELPER_ITEMS: ['Select the credential you want to delete', 'You can only delete credentials that were issued to your current wallet', 'Deleting a credential removes it permanently from your account'],
     CREDENTIAL_ISSUER_DELETE_HELPER_ITEMS: ['The account that originally issued this credential', 'Usually a trusted authority or organization'],
     CREDENTIAL_SUBJECT_DELETE_HELPER_ITEMS: ['The account that currently owns / holds this credential', 'This should match your current wallet address'],
     CREDENTIAL_ID_DELETE_HELPER_ITEMS: ['Unique on-chain identifier (ledger hash) of the credential', 'This ID is used to reference the credential on the XRPL ledger'],
     // Credential

     // Account Configurator
     CONFIG_TEMPLATES_HELPER_ITEMS: ['Quickly configure your account based on its intended purpose', 'Holder: Best for accounts that mainly receive and hold assets', 'Exchanger: Optimized for trading, liquidity providing, and frequent transactions', 'Issuer: Designed for accounts that will issue custom tokens'],
     ACCOUNT_FLAGS_HELPER_ITEMS: [
          'Account Flags control core behaviors of your XRPL account',
          'Default Ripple: Automatically accept incoming trust lines',
          'Require Destination Tag: Forces senders to include a destination tag',
          'Disallow XRP: Prevents the account from receiving XRP (useful for pure token accounts)',
          'Global Freeze: Freezes all issued tokens (issuer only)',
          'No Freeze: Prevents the issuer from freezing trust lines',
          'These flags are stored on-chain and affect how others can interact with your account',
     ],
     TRANSFER_SETTINGS_HELPER_ITEMS: ['Transfer Rate: Fee taken when someone transfers your issued tokens (e.g. 0.1 = 0.1%)', 'Tick Size: Controls price precision for order books involving your issued currency', 'These settings only apply if you issue your own tokens'],
     NFT_MINTER_HELPER_ITEMS: ['Allows another account (the minter) to mint NFTs on your behalf without needing your secret key', 'Commonly used by NFT marketplaces or automated minting services', 'You can remove the minter later using the red "Remove" button'],
     DOMAIN_HELPER_ITEMS: ['Public domain associated with your account (e.g. myproject.com)', 'Stored on the ledger as hex (maximum 256 bytes)', 'Used by wallets and explorers to show a human-readable link'],
     MESSAGE_KEY_HELPER_ITEMS: ['Enables encrypted messaging to your account', 'The public key is stored on-chain so others can send you secure messages', 'Recommended for accounts that want to receive private communications'],
     DEPOSIT_AUTH_HELPER_ITEMS: ['Deposit Authorization (DepositAuth) restricts who can send you XRP or tokens', 'Only addresses listed here can send funds to your account when the feature is enabled', 'You can add multiple authorized addresses', 'This is a security feature to prevent unwanted incoming transfers', 'Commonly used by exchanges, custodians, or high-security accounts'],
     MULTI_SIGN_HELPER_ITEMS: ['Multi-Signature allows multiple accounts to collectively authorize transactions for enhanced security', 'Each signer has an Account, Seed (secret), and Weight', 'Quorum = Minimum total weight needed to approve any transaction', 'Best practice: Use different devices or people for each signer', 'Warning: Losing all signer secrets means permanent loss of control over the account', 'You can enable or disable multi-signing using the green/red buttons at the bottom'],
     REGULAR_KEY_HELPER_ITEMS: ['A Regular Key is a secondary keypair that can sign transactions on behalf of your account', 'This allows you to keep your Master Key offline / cold while using a hot key for daily transactions', 'You must provide both a valid Regular Key Address and its corresponding Seed', 'Security best practice: Use a different device or wallet for the regular key', 'You can remove the regular key later using the red button'],
     // Account Configurator

     // Delete Account
     DELETE_DESTINATION_HELPER_ITEMS: ['When deleting an account, any remaining XRP (minus the deletion fee) must be sent to another address', 'You cannot send the remaining XRP to the account being deleted', 'Choose a destination you control and have access to', 'The destination must be a valid activated XRP Ledger account'],
     // OPTIONAL_FIELDS_HELPER_ITEMS: ['Destination Tag: Often required by exchanges or services', 'Source Tag: Can be used to identify the sender', 'These fields are optional but recommended when sending to centralized services'],
     // Delete Account

     // Transaction Options
     OPTIONAL_FIELDS_HELPER_ITEMS: ['These are optional XRPL transaction fields that provide extra metadata', 'They do not affect the core transaction but can be important for exchanges and services', 'All fields here are optional - you can leave them blank'],
     CREDENTIAL_OPTIONS_HELPER_ITEMS: ['URI: Link or reference to the actual credential document', 'Expiration: When this credential becomes invalid'],
     PAYMENT_CHANNEL_HELPER_ITEMS: ['Destination Tag: Required by many exchanges', 'Expiration: When the payment channel automatically closes'],
     PAYMENT_OPTIONS_HELPER_ITEMS: ['Destination Tag: Helps identify recipient on shared addresses', 'Source Tag: Identifies the sender or purpose', 'Invoice ID: Unique identifier for the payment', 'Credential IDs: Used for permissioned/credential-based payments'],
     DELETE_OPTIONS_HELPER_ITEMS: ['Tags help identify the purpose of the final XRP transfer during account deletion', 'Useful when sending remaining XRP to an exchange or custodian'],
     // Transaction Options

     // Permission Domain
     PDOMAIN_DELETE_SELECTOR_HELPER_ITEMS: ['Select a Permissioned Domain that you previously created', 'You can only delete domains that belong to your current wallet', 'Deleting a Permissioned Domain is permanent'],
     PDOMAIN_ID_HELPER_ITEMS: ['Unique ledger identifier (hash) of the Permissioned Domain', 'This ID is required when submitting a delete transaction', 'Read-only field for verification'],
     // Permission Domain

     // DID
     DID_DOCUMENT_HELPER_ITEMS: ['Main DID document following W3C DID specification', 'Must contain at least @context, id, and verificationMethod', 'Maximum size is 256 bytes when stored on ledger'],
     URI_DATA_HELPER_ITEMS: ['Additional data referenced by URI in the DID document', 'Can contain metadata, service endpoints, or external links', 'Stored separately from the main DID document'],
     DID_DATA_HELPER_ITEMS: ['Core DID properties and custom attributes', 'Can include custom fields beyond the standard DID spec', 'Maximum combined size for all DID fields is 256 bytes'],
     // DID

     // Send XRP
     SEND_XRP_DESTINATION_HELPER_ITEMS: ['The destination must be a valid activated XRP Ledger account address (starts with "r")', 'You cannot send XRP to your own currently active wallet address', 'Double-check the address before sending - XRP transactions are irreversible'],
     SEND_XRP_AMOUNT_HELPER_ITEMS: ['Amount is in XRP with up to 6 decimal places (drops precision)', 'You must have enough XRP in your account to cover the amount + the transaction fee (~0.00001 XRP)', 'Reserve requirements: Your account must stay above the minimum reserve after sending'],
     // Send XRP

     // Signed TX
     SIGN_TRANSACTION_DETAILS_HELPER_ITEMS: ['This page allows you to manually construct, sign, and submit any XRPL transaction', 'You can either build the transaction JSON manually or use other tools to generate it', 'After signing, you will get a signed blob that can be submitted to the ledger', 'Supports Multi-Sign and Regular Key signing modes', 'Warning: Always double-check the transaction JSON before signing'],
     // Signed TX

     // Payment Channel
     CHANNEL_SELECTOR_HELPER_ITEMS: ['Select an existing Payment Channel that you created', 'You can only fund channels where you are the Source account', 'The Channel ID will be automatically filled once selected', 'You must have sufficient XRP balance to fund the channel'],
     PAYMENT_CHANNEL_DETAILS_HELPER_ITEMS: ['Payment Channels allow you to send XRP that can be claimed incrementally over time', 'Useful for recurring payments, streaming, or escrow-like functionality', 'The XRP is locked until the channel is closed or expires'],
     PAYMENT_CHANNEL_AMOUNT_HELPER_ITEMS: ['This is the maximum amount of XRP that can be claimed through this channel', 'You can claim less than this amount over time', 'The full amount is reserved from your account until the channel is closed'],
     SETTLE_DELAY_HELPER_ITEMS: ['How long the sender must wait before they can close the channel and reclaim unspent XRP', 'Higher values increase security for the recipient', 'Common values: 1 hour (3600), 1 day (86400), 7 days (604800)'],
     PAYMENT_CHANNEL_DESTINATION_HELPER_ITEMS: ['The destination address that can claim XRP from this payment channel', 'Only this address can create claims against the channel', 'You cannot set your own active wallet as the destination'],
     FUND_PAYMENT_CHANNEL_DETAILS_HELPER_ITEMS: ['Funding a payment channel adds more XRP to an existing open channel', 'You can only fund channels that you originally created', 'The added amount increases the total XRP available to be claimed by the destination'],
     PAYMENT_CHANNEL_ID_HELPER_ITEMS: ['Unique identifier for the payment channel (64-character hex)', 'This is automatically filled when you select a channel from the dropdown', 'You cannot change this field manually'],
     FUND_PAYMENT_CHANNEL_AMOUNT_HELPER_ITEMS: ['Additional XRP to add to the payment channel', 'This increases the maximum amount that can be claimed through the channel', 'The XRP is reserved from your account balance until the channel is closed'],
     CLOSE_PAYMENT_CHANNEL_DETAILS_HELPER_ITEMS: ['Closing a payment channel releases any unclaimed XRP back to the source account', 'You can only close channels that you created, unless the channel has expired', 'After closing, the channel is removed from the ledger and cannot be reopened', 'Any XRP still available in the channel will be returned to the creator'],
     RENEW_PAYMENT_CHANNEL_DETAILS_HELPER_ITEMS: ['Renewing a payment channel extends its expiration time', 'Only the channel creator can renew a payment channel', 'This updates the CancelAfter field, giving the channel more time before it expires', 'The channel must not have already expired to be renewed', 'Renewing does not add or remove XRP — it only extends the validity period'],
     // Payment Channel.

     // Escrow Create Page Helpers
     ESCROW_CURRENCY_CODE_HELPER_ITEMS: ['Currency code of the asset being escrowed (e.g. XRP, USD, EUR, or custom token)', 'For XRP, no issuer is needed', 'For issued tokens, both Currency Code and Issuer must be specified'],
     ESCROW_AMOUNT_HELPER_ITEMS: ['Amount of the asset to lock in the escrow', 'Must be greater than 0', 'For XRP, precision goes up to 6 decimal places (drops)', 'Must not exceed remaining balance', 'This amount will be reserved from your account until the escrow is finished or cancelled'],
     ESCROW_ISSUER_HELPER_ITEMS: ['The account that issues this currency/token', 'Required when using issued assets (non-XRP)', 'Must be a valid XRPL address'],
     ESCROW_MPT_HELPER_ITEMS: ['Multi-Purpose Token (MPT) you want to escrow', 'Select from the tokens currently held by your account', 'The MPT Issuance ID will be automatically filled'],
     ESCROW_DESTINATION_HELPER_ITEMS: ['The account that will eventually receive the escrowed funds', 'You cannot escrow to your own currently active wallet', 'The destination must be a valid activated XRPL account'],
     ESCROW_DEST_TAG_HELPER_ITEMS: ['Destination Tag helps identify the recipient on shared or exchange addresses', 'Commonly required when sending to centralized exchanges or custodians', 'Optional for most direct wallet-to-wallet transfers'],
     ESCROW_CONDITION_HELPER_ITEMS: ['Optional: A PREIMAGE-SHA-256 crypto-condition that locks the escrow', 'If provided, the escrow can only be finished by providing the matching fulfillment', 'The condition must be a valid hex string (64-128 characters)', 'Fulfillment is NOT required when creating the escrow'],
     ESCROW_FULFILLMENT_HELPER_ITEMS: ['The secret/preimage that fulfills the Condition', 'This is not needed for creating the escrow. It is needed when finishing the escrow.', 'Must be a valid hex string that matches the Condition'],
     ESCROW_SELECTOR_HELPER_ITEMS: ['Select an existing escrow that you created or have permission to finish/cancel', 'You can search by amount, destination address, or sequence number', 'Only active escrows can be finished or cancelled'],
     ESCROW_SEQUENCE_HELPER_ITEMS: ['The sequence number of the original EscrowCreate transaction', 'This uniquely identifies the escrow on the XRPL ledger', 'Required when submitting Finish or Cancel transactions'],
     ESCROW_AMOUNT_FINISH_HELPER_ITEMS: ['The amount of XRP or token currently held in this escrow', 'This amount will be released to the destination (if finishing) or returned to the creator (if cancelling)'],
     ESCROW_CREATOR_HELPER_ITEMS: ['The account that originally created this escrow', 'Only the creator can cancel the escrow (unless it has expired)'],
     ESCROW_DESTINATION_FINISH_HELPER_ITEMS: ['The account that will receive the escrowed funds when finished', 'The destination can finish the escrow if a FinishAfter time has passed'],
     ESCROW_FINISH_SELECTOR_HELPER_ITEMS: ['Select the escrow you want to finish', 'Only escrows where you are the destination (or have the fulfillment) can be finished', 'The escrow must not have expired'],
     ESCROW_OWNER_HELPER_ITEMS: ['The account that created and owns this escrow', 'Usually the sender of the escrowed funds'],
     // Escrows

     // Checks
     CHECK_CURRENCY_CODE_HELPER_ITEMS: ['The currency code of the asset being sent via this check (XRP or issued token)', 'For XRP, no issuer is required', 'For issued currencies, you must also specify the Issuer'],
     CHECK_AMOUNT_HELPER_ITEMS: ['The amount of the asset to send via this check', 'The check can be cashed for up to this amount', 'Must be greater than zero'],
     CHECK_ISSUER_HELPER_ITEMS: ['The account that issues this currency', 'Required when sending issued assets (non-XRP)', 'Must be a valid XRPL address'],
     CHECK_DESTINATION_HELPER_ITEMS: ['The address that will receive this check', 'The recipient can cash the check later', 'You cannot send a check to your own currently active wallet'],
     CHECK_CURRENCY_BALANCE_HELPER_ITEMS: ['This shows your current balance of the selected issued currency', 'This is read-only and for your reference only', 'The check amount cannot exceed your available balance', 'Balance is updated in real-time from the XRPL ledger'],
     CHECK_CANCEL_SELECTOR_HELPER_ITEMS: ['Select the check you want to cancel', 'You can only cancel checks that you created', 'Expired checks can also be canceled'],
     CHECK_DESTINATION_CANCEL_HELPER_ITEMS: ['The recipient address for this check', 'This is the account that would normally cash the check'],
     CHECK_ISSUER_CANCEL_HELPER_ITEMS: ['The issuer of the token being sent via this check', 'Only shown for issued currency (IOU) checks'],
     CHECK_ID_HELPER_ITEMS: ['Unique identifier of the Check on the XRPL ledger', 'This is the CheckIndex used in transactions', 'Required when submitting a CheckCancel transaction'],
     CHECK_AMOUNT_CANCEL_HELPER_ITEMS: ['The amount that was authorized to be delivered by this check', 'This amount will be returned to the sender when the check is canceled'],
     // === Cash Check Page Helpers ===
     CHECK_CASH_SELECTOR_HELPER_ITEMS: ['Select a check that was sent to you', 'You can only cash checks where you are the destination', 'The check must not have expired'],
     CHECK_CREATOR_HELPER_ITEMS: ['The account that created and sent this check', 'This is the sender of the funds'],
     CHECK_ISSUER_CASH_HELPER_ITEMS: ['The issuer of the token being sent via this check', 'Only shown for issued currency checks'],
     CHECK_ORIGINAL_AMOUNT_HELPER_ITEMS: ['The maximum amount authorized by this check', 'You can cash any amount up to this value'],
     CHECK_INDEX_HELPER_ITEMS: ['Unique identifier of the Check on the XRPL ledger', 'This CheckIndex is required when cashing the check'],
     CASH_AMOUNT_HELPER_ITEMS: ['The amount you want to cash from this check', 'Must be less than or equal to the original check amount', 'Use the arrows for precise 0.000001 increments'],
     DELIVER_MIN_HELPER_ITEMS: ['DeliverMin ensures you receive at least this amount (protects against partial payments)', 'Useful when cashing checks involving issued currencies with transfer fees'],
     // Checks

     // Tickets
     TICKET_COUNT_HELPER_ITEMS: ['Number of tickets to create for the current account', 'Each ticket can be used later as a Sequence number for transactions', 'Creating multiple tickets at once is more efficient than creating them one by one', 'Tickets are useful for multi-signing, regular key accounts, or high-frequency trading', 'Maximum allowed per account, at any one time, is 250'],
     DELETE_TICKET_HELPER_ITEMS: ['Select one or more tickets you want to delete', 'Tickets are sequence numbers reserved for future transactions', 'Deleting tickets frees up the reserved sequence numbers', 'You can only delete tickets that belong to your account', 'This action cannot be undone'],
     // Tickets

     // === Currency Form Section Helpers ===
     CURRENCY_FORM_CODE_HELPER_ITEMS: ['The code that identifies this currency (e.g. USD, EUR, or custom token)', 'For XRP, use "XRP" (no issuer needed)', 'For issued currencies, combine with Issuer address'],
     CURRENCY_FORM_ISSUER_HELPER_ITEMS: ['The XRPL account that issues and controls this currency', 'Required for all non-XRP tokens', 'Must be a valid XRPL address'],
     CURRENCY_FORM_AMOUNT_HELPER_ITEMS: ['Amount of the selected currency', 'Precision depends on context (trustline limit, issuance, clawback, etc.)'],
     CURRENCY_FORM_CURRENCY_BALANCE_HELPER_ITEMS: ['Current balance of this currency for the selected issuer', 'Read-only information for your reference', 'Helps you understand available funds before issuing or clawing back'],
     // === Trustline Clawback Page Helpers ===
     CLAWBACK_DESTINATION_HELPER_ITEMS: ['The account from which tokens will be clawed back', 'Must be a valid XRPL address (starts with r...)', 'You can only clawback tokens from holders of your issued currency', 'The destination must have a trustline with you as the issuer'],
     // === Currency Form Section Helpers ===

     // === Add / Remove Currency & Issuer Helpers ===
     NEW_CURRENCY_CODE_HELPER_ITEMS: ['Unique currency code for the new token (e.g. USDC, MYTOKEN)', 'Must be 3–40 characters long', 'Alphanumeric and some special characters allowed'],
     NEW_ISSUER_HELPER_ITEMS: ['XRPL address that will issue this currency', 'Must be a valid XRP address starting with "r"', 'This account will control issuance and trustlines'],
     REMOVE_CURRENCY_HELPER_ITEMS: ['Select a currency code you previously added', 'Removing a currency removes it from the application'],
     REMOVE_ISSUER_HELPER_ITEMS: ['Select the issuer address to remove', 'This will remove the issuer-currency combination from the application'],

     // === Create Offer Page Helpers ===
     TAKER_GETS_CURRENCY_HELPER_ITEMS: ['The currency or token you want to **receive** in this offer', 'This is what someone will pay you if they accept your offer'],
     TAKER_GETS_ISSUER_HELPER_ITEMS: ['The issuer of the token you want to receive', 'Required for issued currencies (not needed for XRP)'],
     TAKER_GETS_AMOUNT_HELPER_ITEMS: ['The exact amount of the asset you want to receive', 'This is the "buy" side of your offer'],
     TAKER_PAYS_CURRENCY_HELPER_ITEMS: ['The currency or token you are willing to **give**', 'This is what you will pay to receive the Taker Gets asset'],
     TAKER_PAYS_ISSUER_HELPER_ITEMS: ['The issuer of the token you are offering to give', 'Required for issued currencies (not needed for XRP)'],
     TAKER_PAYS_AMOUNT_HELPER_ITEMS: ['The exact amount of the asset you are willing to give', 'This is the "sell" side of your offer'],
     BALANCE1_HELPER_ITEMS: ['Your current balance of the asset you want to receive', 'Helps you understand available liquidity on your side'],
     BALANCE2_HELPER_ITEMS: ['Your current balance of the asset you are willing to spend', 'You cannot offer more than you currently hold'],
     // === Cancel Offer Page Helpers ===
     CANCEL_OFFER_SELECTOR_HELPER_ITEMS: ['Select one or more existing offers you want to cancel', 'You can only cancel offers created by your current account', 'Search by sequence number, currency, or amount', 'Cancelled offers are permanently removed from the order book'],

     MPT_TOKEN_COUNT_PRESETS: [10, 100, 1000, 10000, 100000, 1000000, 10000000],
     ASSET_SCALE_PRESETS: [0, 2, 6, 8, 15],
     TAXON_PRESETS: [0, 5, 10, 15, 20],
     TRANSFER_RATE_PRESETS: [0, 500, 5000, 50000],

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
