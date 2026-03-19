import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountDeleteState } from '../../../services/account-delete/account-delete-store/account-delete-store.service';

export type AccountDeleteTxType = 'deleteAccount';
export type AccountDeleteField = 'accountInfo' | 'accountObjects' | 'serverInfo' | 'blockingObjects' | 'savedTxJson' | 'savedTxResult' | 'regularKeySigningEnabled';

export interface AccountDeleteConfig {
     accountDelete: AccountDeleteState;
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

export type Blocker = {
     label: string;
     count: number;
     route: string;
     tab?: string;
};
