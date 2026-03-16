import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

export type DidTxType = 'setDid' | 'deleteDid';
export type DidTab = 'set' | 'delete';
export type DidField = 'didData' | 'uriData' | 'createdDids' | 'existingDid' | 'didDocumentData' | 'regularKeySigningEnabled';

export interface DidInfoData {
     walletName: string;
     mode: DidTab;
     didCount: number;
     existingDid: any[];
}

export interface DidTxConfig {
     wallet: Wallet;
     simulate?: boolean;
     multiSign?: boolean;
     didData?: string;
     uriData?: string;
     didDocumentData?: string;
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
