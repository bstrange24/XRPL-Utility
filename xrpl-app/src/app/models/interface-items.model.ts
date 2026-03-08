export interface CredentialItem {
     index: string;
     CredentialType: string;
     Subject: string;
     Issuer: string;
     Expiration?: string;
     URI?: string;
     Flags?: any;
}

export interface CredentialData {
     version: string;
     credential_type: string;
     issuer: string;
     subject: {
          full_name: string;
          destinationAddress: string;
          dob: string;
          country: string;
          id_type: string;
          id_number: string;
          expirationDate: string;
     };
     verification: {
          method: string;
          verified_at: string;
          verifier: string;
     };
     hash: string;
     uri: string;
}

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

export type CheckTxType = 'create' | 'cash' | 'cancel';

export type CreateCheckItem = {
     tab: 'create';
     id: string;
     index: string;
     amount: string;
     destination: string;
     destinationTag?: number;
     expiration?: number;
     invoiceId?: string;
     isExpired: boolean;
};

export type CashCheckItem = {
     tab: 'cash';
     id: string;
     index: string;
     amount: string;
     sender: string;
     expiration?: number;
     isExpired: boolean;
};

export type CancelCheckItem = {
     tab: 'cancel';
     id: string;
     index: string;
     amount: string;
     destination: string;
     expiration?: number;
     isExpired: boolean;
};

export type CheckListItem = CreateCheckItem | CashCheckItem | CancelCheckItem;

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

export type EscrowDisplayItem =
     | {
            tab: 'create' | 'cancel';
            EscrowSequence: string; // sequence as string
            amount: string;
            destination: string;
            finishAfter?: number;
            cancelAfter?: number;
            isExpired: boolean;
            display: string;
            secondary: string;
            id: string;
       }
     | {
            tab: 'finish';
            EscrowSequence: string;
            amount: string;
            sender: string;
            finishAfter?: number;
            cancelAfter?: number;
            isExpired: boolean;
            display: string;
            secondary: string;
            id: string;
       };

export type EscrowDropdownItem = {
     id: string;
     display: string;
     secondary: string;
     // optional: rawEscrow?: any;  // if you need to look up later
};

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

export interface CheckItem {
     id: string;
     display: string;
     isCurrentAccount: boolean;
     secondary: string;
     currency: string;
     issuer: string;
}

export interface RippleState {
     LedgerEntryType: 'RippleState';
     Balance: { currency: string; value: string };
     HighLimit: { issuer: string };
}

export interface EscrowObject {
     Account: string;
     index: string;
     Expiration?: number;
     Destination: string;
     Condition: string;
     CancelAfter: string;
     FinishAfter: string;
     Amount: string;
     DestinationTag: string;
     Balance: string;
     SourceTag: number;
     PreviousTxnID: string;
     Memo: string | null | undefined;
     Sequence: number | null | undefined;
     TicketSequence: number | null | undefined;
}

export interface EscrowDataForUI {
     Account: string;
     Amount?: string | { currency: string; value: string } | { mpt_issuance_id: string; value: string };
     CancelAfter?: number;
     Destination: string;
     DestinationNode?: string;
     FinishAfter?: number;
     Condition?: string;
     Fulfillment?: string;
     DestinationTag?: number;
     Sequence?: number | null;
     EscrowSequence?: string | null;
     TxHash?: number | null;
}

export interface EscrowWithTxData {
     LedgerEntryType: 'Escrow';
     Account: string;
     Amount?: string | { currency: string; value: string } | { mpt_issuance_id: string; value: string };
     Destination: string;
     PreviousTxnID?: string;
     Condition?: string;
     CancelAfter?: number;
     FinishAfter?: number;
     DestinationTag?: number;
     SourceTag?: number;
     Sequence?: number | null;
     TicketSequence?: string | number;
     Memo?: string | null;
}

export interface EscrowValidationInput {
     finishAfter?: number | null;
     cancelAfter?: number | null;
     condition?: string | null;
     currentRippleTime?: number | null;
}

export interface EscrowValidationResult {
     valid: boolean;
     errors: string[];
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

export interface PaymentChannelObject {
     LedgerEntryType: string;
     Account: string;
     index: string;
     Expiration?: number;
     CancelAfter?: number;
     Destination: string;
     Amount: string;
     Balance: string;
     SettleDelay: number;
     PublicKey: string;
}

export interface UnifiedPaymentChannel {
     id: string;
     totalAmount: string;
     balance: string;
     remaining: string;
     destination?: string;
     sender?: string;
     settleDelay: string;
     expiration: string;
     status: string;
     canClose: boolean;
     canClaim?: boolean;
     publicKey?: string;
     isExpired?: boolean;
     remainingDrops?: any;
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
