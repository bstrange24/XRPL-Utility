import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

export type AccountDeleteTxType = 'deleteAccount';
export type DeleteAccountField = 'accountInfo' | 'accountObjects' | 'serverInfo' | 'blockingObjects' | 'savedTxJson' | 'savedTxResult' | 'regularKeySigningEnabled';

export interface AccountDeleteConfig {
     wallet: Wallet;
     destination: string;
     destinationTag?: any;
     invoiceIdField?: any;
     sourceTagField?: any;
     simulate?: boolean;
     multiSign?: boolean;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     multiSignAddress?: string;
     multiSignSeeds?: string;
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
