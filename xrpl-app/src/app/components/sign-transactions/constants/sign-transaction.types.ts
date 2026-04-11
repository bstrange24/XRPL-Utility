import { CredentialState } from '../../../services/credentials/credential-store/credential-store.service';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';

export type SignTransactionActionTypes = 'sendXrp';

export interface XrpPaymentConfig {
     credentialState?: CredentialState;
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

export type ButtonLoadingState = {
     getJson: boolean;
     signed: boolean;
     submit: boolean;
     multiSign: boolean;
     regularKeySign: boolean;
};
