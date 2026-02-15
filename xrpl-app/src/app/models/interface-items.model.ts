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
