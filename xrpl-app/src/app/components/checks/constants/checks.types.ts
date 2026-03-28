import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { CheckState } from '../../../services/checks/checks-store/checks-store.service';

export type CheckActionTypes = 'createCheck' | 'cashCheck' | 'cancelCheck';
export type CheckConfigTxDisplayType = 'createCheck' | 'cashCheck' | 'cancelCheck';

export type CheckTxType = 'createCheck' | 'cashCheck' | 'cancelCheck';

export interface CheckItem {
     id: string;
     display: string;
     isCurrentAccount: boolean;
     secondary: string;
     currency: string;
     issuer: string;
}

export type CreateCheckItem = {
     tab: 'createCheck';
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
     tab: 'cashCheck';
     id: string;
     index: string;
     amount: string;
     sender: string;
     expiration?: number;
     isExpired: boolean;
};

export type CancelCheckItem = {
     tab: 'cancelCheck';
     id: string;
     index: string;
     amount: string;
     destination: string;
     expiration?: number;
     isExpired: boolean;
};

export type CheckListItem = CreateCheckItem | CashCheckItem | CancelCheckItem;

export interface CheckTxConfig {
     check: CheckState;
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
