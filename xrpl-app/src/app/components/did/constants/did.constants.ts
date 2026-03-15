import { AppConstants } from '../../../core/app.constants';
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

export const DID_TX_TYPE_MAP = {
     set: 'SetDID',
     delete: 'DeleteDID',
} as const;

export const DID_TX_TYPES = {
     SET: 'setDid',
     DELETE: 'deleteDid',
} as const;

export type DidConfigTxDisplayType = keyof typeof DID_TX_TYPE_MAP;

type IconType = 'ng-icon' | 'lucide-icon';

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

// Tab configuration constants
export const DID_TABS: {
     key: DidConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'set',
          label: 'Set',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'delete',
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const DID_TAB_META: Record<
     DidConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
     }
> = {
     set: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Set DID',
          desc: 'Set DID for the selected account.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     delete: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete DID',
          desc: 'Delete DID for the selected account.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;

export const DID_VALIDATION_RULES: Record<(typeof DID_TX_TYPES)[keyof typeof DID_TX_TYPES], string> = {
     [DID_TX_TYPES.SET]: 'DIDSet',
     [DID_TX_TYPES.DELETE]: 'DIDdelete',
} as const;
