import { DidState } from '../../../services/did/did-store/did-store.service';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';

export type DidTxType = 'setDid' | 'deleteDid';
export type DidTab = 'setDid' | 'deleteDid';
export type DidField = 'didData' | 'uriData' | 'createdDids' | 'existingDid' | 'didDocumentData' | 'regularKeySigningEnabled';

export interface DidInfoData {
     walletName: string;
     mode: DidTab;
     didCount: number;
     existingDid: any[];
}

export interface DidTxConfig {
     did: DidState;
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
