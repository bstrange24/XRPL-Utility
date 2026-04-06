export interface IssuerItem {
     name: string;
     address: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface DidItem {
     index: string;
     DIDDocument: string;
     Data: string;
     URI: string;
}

export interface DidData {
     id: string;
     verificationMethod: any;
     authentication: any;
     service: any;
     hash: string;
     uri: string;
     document: string;
     data: string;
     destinationAddress: string;
}

export interface Toast {
     id: number;
     message: string;
     duration: number;
}

export type Signer = {
     Account: string;
     seed: string;
     SignerWeight: number;
};

export interface Wallet {
     name?: string;
     classicAddress: string;
     address: string;
     seed: string;
     mnemonic?: string;
     secretNumbers?: string;
     balance?: string;
     ownerCount?: string;
     xrpReserves?: string;
     spendableXrp?: string;
     showSecret?: boolean;
     lastUpdated?: any;
     isIssuer?: boolean;
     algorithm?: 'ed25519' | 'secp256k1';
     encryptionAlgorithm?: string | '';
}

export interface MPToken {
     LedgerEntryType: 'MPToken';
     index?: string;
     mpt_issuance_id?: string;
     MPTokenIssuanceID?: string;
     PreviousTxnID?: string;
     Flags?: number;
     MPTAmount?: string | number;
     MaximumAmount?: string | number;
     OutstandingAmount?: string | number;
     TransferFee?: string | number;
     MPTokenMetadata?: string;
}

export interface MptDisplayItem {
     id: string;
     display: string;
     secondary: string;
}

export interface MPTokenIssuance {
     LedgerEntryType: 'MPTokenIssuance';
     Flags: number;
     mpt_issuance_id: string;
}

export interface MPTokenHolder {
     LedgerEntryType: 'MPToken';
     Flags: number;
     MPTokenIssuanceID: string;
}

export interface MPTAmount {
     mpt_issuance_id: string;
     value: string;
}

export interface MptInfoRequest {
     command: 'mpt_info';
     issuance_id: string;
}

export interface MptInfoResponse {
     result: any; // or define proper structure if known
}

export interface Token {
     transactionType: string;
     createdDate: Date;
     creationAge: string; // Optional field for age of token
     currency: string;
     issuer: string;
     transactionHash: string;
     timestamp: Date;
     action: string; // "Buy" or "Sell"
     amountToken: string; // Token amount (e.g., "100 PHNIX")
     amountXrp: string; // XRP amount (e.g., "10 XRP")
}

// interface MPToken {
//      LedgerEntryType?: string;
//      index?: string;
//      mpt_issuance_id?: string;
//      MPTokenIssuanceID?: string;
//      PreviousTxnID?: string;
//      Flags?: number;
//      MPTAmount?: string | number;
//      MaximumAmount?: string | number;
//      OutstandingAmount?: string | number;
//      TransferFee?: string | number;
//      MPTokenMetadata?: string;
// }

export interface IssuerItem {
     name: string;
     address: string;
}

export interface RippleState {
     LedgerEntryType: 'RippleState';
     Balance: { currency: string; value: string };
     HighLimit: { issuer: string };
}

export interface Destination {
     address: string;
     name?: string;
}

export interface DestinationItem {
     id: string;
     display: string;
     secondary: string;
     isCurrentAccount: boolean;
}

export interface AccountFlags {
     canLock: boolean;
     canClawback: boolean;
     isRequireAuth: boolean;
     canTransfer: boolean;
     canTrade: boolean;
     canEscrow: boolean;
}

export interface WalletEntry {
     address: string;
     classicAddress: string;
     seed: string;
     mnemonic: string;
     secretNumbers: string;
     encryptionAlgorithm: string;
     name: string;
}

export interface DelegateAction {
     id: number;
     key: string;
     txType: string;
     description: string;
}

export interface ValidationInputs {
     // ---- Wallet / Sender ----
     wallet: {
          address: string;
          seed?: string;
          subject?: string;
     };

     // ---- Network / XRPL ----
     network?: {
          accountInfo?: any;
          accountObjects?: any;
          fee?: string;
          currentLedger?: number;
     };

     // ---- Permission Domain Subject ---
     subject?: {
          subject?: string;
     };

     // ---- Destination ----
     destination?: {
          address?: string;
          tag?: string;
     };

     // ---- Amount ----
     amountXrp?: {
          amount?: string;
     };

     paymentXrp?: {
          amount?: string;
          destination?: string;
          destinationTag?: string;
          sourceTag?: string;
          invoiceId?: any;
          credentials?: string[];
     };

     createCheck?: {
          amount?: string;
          destination?: string;
          destinationTag?: string;
          sourceTag?: string;
          invoiceId?: any;
     };

     createTimeBasedEscrow?: {
          amount?: string;
          destination?: string;
          finishAfter?: number;
          cancelAfter?: number;
          currency?: string;
          issuer?: string;
     };

     finishTimeBasedEscrow?: {
          escrowOwner?: string;
          escrowSequence?: string;
     };

     cancelTimeBasedEscrow?: {
          escrowSequence?: string;
     };

     createConditionalEscrow?: {
          amount?: string;
          destination?: string;
          finishAfter?: number;
          cancelAfter?: number;
          currency?: string;
          issuer?: string;
          condition?: string;
     };

     finishConditionalEscrow?: {
          escrowOwner?: string;
          escrowSequence?: string;
          condition?: string;
          fulfillment?: string;
     };

     paymentChannelCreate?: {
          amount?: string;
          destination?: string;
          settleDelay?: string;
     };

     paymentChannelFund?: {
          amount?: string;
          channelIDField?: string;
     };

     paymentChannelClaim?: {
          amount?: string;
          channelIDField?: string;
          claimSignature?: string;
     };

     paymentChannelClose?: {
          channelIDField?: string;
     };

     createTicket?: {
          ticketCountField?: string;
     };

     cashCheck?: {
          amount?: string;
          checkIdField?: string;
     };

     cancelCheck?: {
          checkIdField?: string;
     };

     // ---- Multi-Sign ----
     multiSign?: {
          enabled: boolean;
          addresses?: string[];
          seeds?: string[];
          signerQuorum?: number;
          signers?: { Account: string; SignerWeight: number }[];
     };

     // ---- Regular Key ----
     regularKey?: {
          isRegularKey: boolean;
          address?: string;
          seed?: string;
     };

     // ---- Tickets ----
     ticket?: {
          enabled: boolean;
          singleTicket?: string;
          selectedTicket?: string;
     };

     // ---- DID ----
     did?: {
          document?: any;
          uri?: string;
          data?: any;
     };

     // ---- Domain / Permissioned Domains ----
     domain?: {
          domainId?: string;
          date?: number;
     };

     // ---- Credentials  ----
     credentials?: {
          credentialType?: string;
          subject?: string;
          destination?: string;
          date?: number;
          credentialId?: string;
     };

     // ---- Sequence ID  ----
     sequence?: {
          sequenceId?: string;
     };
}

export interface UiSignerEntry {
     Account: string;
     seed?: string; // optional — needed for local multi-signing
     SignerWeight?: number; // optional — required for SignerListSet, ignored for DepositPreauth
}

export interface DepositAuthEntry {
     account: string;
}
