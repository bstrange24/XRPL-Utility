import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { TrustlineState } from '../../trustlines/constants/trustline.types';
import { CurrencyState } from '../../../services/currency/constants/currency.types';
import { EscrowState } from '../../../services/escrow/escrow-store/escrow-store.service';
import { MptState } from '../../../services/mpt/mpt-store/mpt-store.service';

export type EscrowTxType = 'createEscrow' | 'finishEscrow' | 'cancelEscrow';

export type EscrowActionTypes = 'createEscrow' | 'finishEscrow' | 'cancelEscrow';

export type EscrowDisplayItem =
     | {
            tab: 'createEscrow' | 'cancelEscrow';
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
            tab: 'finishEscrow';
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

export type EscrowDropdownItem = {
     id: string;
     display: string;
     secondary: string;
     // optional: rawEscrow?: any;  // if you need to look up later
};

export interface EscrowConfig {
     escrow?: EscrowState;
     account?: AccountConfiguratorState;
     trustline?: TrustlineState;
     currency?: CurrencyState;
     mpt?: MptState;
     txOptions?: XrplTxOptionsState;
     wallet: Wallet;
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          ledgerInfo: any;
          wallet?: any;
     };
     extra?: Record<string, any>;
}
