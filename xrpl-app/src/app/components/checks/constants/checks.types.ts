import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { CheckState } from '../../../services/checks/checks-store/checks-store.service';
import { TrustlineState } from '../../trustlines/constants/trustline.types';
import { CurrencyState } from '../../../services/currency/constants/currency.types';

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
     issuer?: string | null;
     destination: string;
     destinationTag?: number;
     sendMax?: string;
     display?: string;
     secondary?: string;
     sender?: string;
     expiration?: number;
     invoiceId?: string;
     isExpired: boolean;
};

export type CashCheckItem = {
     tab: 'cashCheck';
     id: string;
     index: string;
     amount: string;
     issuer?: string | null;
     sender: string;
     expiration?: number;
     isExpired: boolean;
     sendMax?: string;
     destinationTag?: number;
     display?: string;
     secondary?: string;
};

export type CancelCheckItem = {
     tab: 'cancelCheck';
     id: string;
     index: string;
     amount: string;
     issuer?: string | null;
     expiration?: number;
     isExpired: boolean;
     sendMax?: string;
     destinationTag?: number;
     destination?: string;
     display?: string;
     secondary?: string;
     sender?: string;
};

export type CheckListItem = CreateCheckItem | CashCheckItem | CancelCheckItem;

export type AnyCheckDisplayItem = {
     tab: CheckActionTypes;
     index: string;
     amount: string;
     isExpired: boolean;
     display: string;
     secondary: string;
     id: string;
     sendMax?: string;
     destinationTag?: number;
     issuer?: string | null;
     expiration?: number;
     // For create checks
     destination?: string;
     // For cash/cancel checks
     sender?: string;
};

export interface CheckTxConfig {
     check: CheckState;
     account?: AccountConfiguratorState;
     txOptions?: XrplTxOptionsState;
     trustline?: TrustlineState;
     currency?: CurrencyState;
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
