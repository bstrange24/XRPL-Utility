import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import * as xrpl from 'xrpl';
import { MptState } from '../../../services/mpt/mpt-store/mpt-store.service';

export type MptActionTypes = 'createMpt' | 'authorizeMpt' | 'unauthorizeMpt' | 'sendMpt' | 'lockMpt' | 'unlockMpt' | 'clawbackMpt' | 'destroyMpt';
export type MptConfigTxDisplayType = 'createMpt' | 'authorizeMpt' | 'sendMpt' | 'lockMpt' | 'clawbackMpt' | 'destroyMpt';

export type MptTxType = 'createMpt' | 'authorizeMpt' | 'unauthorizeMpt' | 'sendMpt' | 'lockMpt' | 'unlockMpt' | 'clawbackMpt' | 'destroyMpt';
export type MptFlagKey = 'canLock' | 'isRequireAuth' | 'canEscrow' | 'canTrade' | 'canTransfer' | 'canClawback';

export interface MptFlags {
     canLock: boolean;
     isRequireAuth: boolean;
     canEscrow: boolean;
     canTrade: boolean;
     canTransfer: boolean;
     canClawback: boolean;
}

export interface MPTokenObject {
     LedgerEntryType: 'MPToken';
     Account: string;
     MPTokenIssuanceID: string;
     MPTAmount?: string;
     balance?: string;
     [key: string]: any; // For other properties
}

export interface MptTxConfig {
     mpt: MptState;
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
