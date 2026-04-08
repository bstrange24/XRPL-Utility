import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { CurrencyState } from '../../../services/currency/constants/currency.types';

export interface TrustlineFlagItem {
     key: TrustlineFlagKey;
     title: string;
     desc: string;
     hex: string;
     isClearFlag?: boolean;
}

export type TrustlineFlagKey = 'tfSetfAuth' | 'tfSetNoRipple' | 'tfClearNoRipple' | 'tfSetFreeze' | 'tfClearFreeze' | 'tfSetDeepFreeze' | 'tfClearDeepFreeze';
export type TrustlineActionTypes = 'setTrustline' | 'removeTrustline' | 'issueCurrency' | 'clawbackTokens' | 'addNewIssuers';

export interface TrustlineTxConfig {
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

export interface TrustlineState {
     isLoaded: boolean;
     isLoading: boolean;
     error: string | null;
     trustlineAlreadyExist: boolean;
     removeTrustlineAvailable: boolean;
     removeTrustlineMessage: string[];
     showTrustlineOptions: boolean;
     outstandingIOUCollapsed: boolean;
     existingIOUs: any;
     trustlineLimitField: number;
     tokenToRemove: string;
     trustlineFlags: number;
     missingTrustlineInfo: {
          currencyCode: string;
          issuer: string;
     };
}
