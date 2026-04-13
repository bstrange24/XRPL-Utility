import * as xrpl from 'xrpl';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { DelegateState } from '../../../services/delegate/delegate-store/delegate-store.service';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';

export type DelegateActionTypes = 'delegateCreate' | 'delegateClear';
export type DelegateConfigTxDisplayType = 'delegateCreate' | 'delegateClear';

export type DelegateTxType = 'delegateCreate' | 'delegateClear';

export interface XRPLPermissionEntry {
     Permission: {
          PermissionValue: string;
     };
}

export interface XRPLDelegate {
     LedgerEntryType: 'Delegate';
     Account?: string;
     Authorize?: string;
     Flags?: number;
     PreviousTxnID?: string;
     PreviousTxnLgrSeq?: number;
     index: string;
     Permissions: XRPLPermissionEntry[];
}

export interface DelegateAction {
     id: number;
     key: string;
     txType: DelegateTxType;
     description: string;
}

export interface DelegateTxConfig {
     delegate: DelegateState;
     account?: AccountConfiguratorState;
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
