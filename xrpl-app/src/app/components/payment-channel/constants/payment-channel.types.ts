import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { PaymentChannelState } from '../../../services/payment-channel/payment-channel-store/payment-channel-store.service';

export type PaymentChannelActionTypes = 'createPaymentChannel' | 'fundPaymentChannel' | 'claimPaymentChannel' | 'renewPaymentChannel' | 'closePaymentChannel';

export interface PaymentChannelTxConfig {
     paymentChannel: PaymentChannelState;
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

export type PaymentChannelFlagState = {
     renew: boolean;
     close: boolean;
     claimAndClose: boolean;
};

export type PaymentChannelFlagValueState = {
     renew: any;
     close: any;
};

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
     isOwner: boolean;
}
