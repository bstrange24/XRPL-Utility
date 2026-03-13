import { AppConstants } from '../../../core/app.constants';
import { CredentialItem } from '../../../models/interface-items.model';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

export interface CredentialItemVm extends CredentialItem {
     accepted: boolean;
     selectable: boolean;
     issuedByMe: boolean;
}

export const CREDENTIAL_TX_TYPE_MAP = {
     create: 'CredentialCreate',
     accept: 'CredentialAccept',
     delete: 'CredentialDelete',
     verify: 'CredentialVerify',
} as const;

export const CREDENTIAL_TX_TYPES = {
     CREATE: 'createCredential',
     DELETE: 'deleteCredentials',
     ACCEPT: 'acceptCredentials',
} as const;

export const CREDENTIAL_VALIDATION_RULES: Record<CredentialTxType, string> = {
     [CREDENTIAL_TX_TYPES.CREATE]: 'CredentialCreate',
     [CREDENTIAL_TX_TYPES.DELETE]: 'CredentialDelete',
     [CREDENTIAL_TX_TYPES.ACCEPT]: 'CredentialAccept',
} as const;

export const CREDENTIAL_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'create',
     ACCEPT: 'accept',
     VERIFY: 'verify',
     DELETE: 'delete',
} as const;

export type CredentialTxType = (typeof CREDENTIAL_TX_TYPES)[keyof typeof CREDENTIAL_TX_TYPES];
export type CredentialConfigTxDisplayType = (typeof CREDENTIAL_CONFIG_TX_DISPLAY_TYPES)[keyof typeof CREDENTIAL_CONFIG_TX_DISPLAY_TYPES];
type IconType = 'ng-icon' | 'lucide-icon';

export interface CredentialTxConfig {
     wallet: Wallet;
     simulate?: boolean;
     multiSign?: boolean;
     credentialType?: string;
     expiration?: string;
     uri?: string;
     subject?: string;
     credentialID?: string;
     credentialIssuer?: string;
     subjectDestination?: string;
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
export const CREDENTIAL_TABS: {
     key: CredentialConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.CREATE,
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.ACCEPT,
          label: 'Accept',
          icon: 'copy-plus',
          iconType: 'lucide-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.VERIFY,
          label: 'Verify',
          icon: 'shield-ellipsis',
          iconType: 'lucide-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.DELETE,
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const CREDENTIAL_TAB_META: Record<
     CredentialConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
     }
> = {
     [CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.CREATE]: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Create Credentials',
          desc: 'Create Credentials to another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.ACCEPT]: {
          icon: 'heroArrowPath',
          colorClass: 'green-button-submenu',
          title: 'Accept Credentials',
          desc: 'Accept Credentials from another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.VERIFY]: {
          icon: 'shield-ellipsis',
          colorClass: 'orange-button-submenu',
          title: 'Verify Credentials',
          desc: 'Verify Credentials have been accepted by another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.DELETE]: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Credentials',
          desc: 'Delete Credentials to another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
