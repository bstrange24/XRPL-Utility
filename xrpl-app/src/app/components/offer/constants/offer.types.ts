import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import * as xrpl from 'xrpl';
import { OfferState } from '../../../services/offer/offer-store/offer-store.service';

export type OfferActionTypes = 'createOffer' | 'getOrderBook' | 'cancelOffer';
export type OfferTxType = 'createOffer' | 'cancelOffer';

export interface OfferTxConfig {
     offer: OfferState;
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
