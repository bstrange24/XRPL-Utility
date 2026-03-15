import * as xrpl from 'xrpl';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { AppConstants } from '../../../core/app.constants';

// Core types
export type PermissionDomainTxType = 'set' | 'delete';
export type PermissionedDomainField = 'createdPermissionedDomains' | 'createdDomains' | 'selectedDomainId' | 'credentialType' | 'credentialIssuer' | 'subject' | 'credentialIdSearchQuery' | 'regularKeySigningEnabled';

export type PermissionedDomainTab = 'set' | 'delete';
export type PermissionedDomainTxTypeFull = 'setPermissionedDomain' | 'deletePermissionedDomain';
export type PermissionedDomainConfigTxDisplayType = 'set' | 'delete';
export type IconType = 'ng-icon' | 'lucide-icon';

// Transaction types
export const PERMISSION_DOMAIN_TX_TYPES = {
     SET: 'set',
     DELETE: 'delete',
} as const;

// Full transaction types (for XRPL transactions)
export const PERMISSION_DOMAIN_TX_TYPES_FULL = {
     SET: 'setPermissionedDomain',
     DELETE: 'deletePermissionedDomain',
} as const;

// Display types
export const PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES = {
     SET: 'set',
     DELETE: 'delete',
} as const;

// Tabs configuration
export const PERMISSION_DOMAIN_TABS: {
     key: PermissionedDomainConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES.SET,
          label: 'Set',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES.DELETE,
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information
export const PERMISSION_DOMAIN_TAB_META: Record<
     PermissionedDomainConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
     }
> = {
     [PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES.SET]: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Set Permissioned Domain',
          desc: 'Set Permissioned Domain for the selected account.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES.DELETE]: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Permissioned Domain',
          desc: 'Delete Permissioned Domain for the selected account.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;

// Button labels and classes per mode
export const PERMISSION_DOMAIN_ACTION_CONFIG: Record<
     PermissionedDomainTab,
     {
          buttonLabel: string;
          buttonClass: string;
     }
> = {
     set: {
          buttonLabel: 'Set Domain',
          buttonClass: 'btn-primary',
     },
     delete: {
          buttonLabel: 'Delete Domain',
          buttonClass: 'btn-danger',
     },
} as const;

// Validation rule names
export const PERMISSION_DOMAIN_VALIDATION_RULES: Record<PermissionDomainTxType, string> = {
     [PERMISSION_DOMAIN_TX_TYPES.SET]: 'PermissionedDomainSet',
     [PERMISSION_DOMAIN_TX_TYPES.DELETE]: 'PermissionedDomainDelete',
} as const;

export const PERMISSION_DOMAIN_DEFAULTS = {
     CREDENTIAL_TYPE: '',
     CREDENTIAL_ISSUER: '',
     SUBJECT: '',
     DOMAIN_ID: '',
     SEARCH_QUERY: '',
} as const;

export function getPermissionDomainTxTypeFull(type: PermissionDomainTxType): PermissionedDomainTxTypeFull {
     const map: Record<PermissionDomainTxType, PermissionedDomainTxTypeFull> = {
          [PERMISSION_DOMAIN_TX_TYPES.SET]: PERMISSION_DOMAIN_TX_TYPES_FULL.SET,
          [PERMISSION_DOMAIN_TX_TYPES.DELETE]: PERMISSION_DOMAIN_TX_TYPES_FULL.DELETE,
     };
     return map[type];
}

export function isPermissionDomainTab(value: string): value is PermissionedDomainTab {
     return value === PERMISSION_DOMAIN_TX_TYPES.SET || value === PERMISSION_DOMAIN_TX_TYPES.DELETE;
}

export interface PermissionDomainConfig {
     wallet: Wallet;
     simulate?: boolean;
     multiSign?: boolean;
     credentialType?: string;
     credentialIssuer?: string;
     domainId?: string;
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

export interface PermissionedDomainInfo {
     walletName: string;
     mode: PermissionedDomainTab;
     permissionedDomainCount: number;
     permissionedDomainsToShow: any[]; // TODO: improve type later
     actionButtonLabel: string;
     actionButtonClass: string;
}

// Re-export types derived from constants
export type PermissionDomainTxTypeFromConst = (typeof PERMISSION_DOMAIN_TX_TYPES)[keyof typeof PERMISSION_DOMAIN_TX_TYPES];
export type PermissionedDomainTxTypeFullFromConst = (typeof PERMISSION_DOMAIN_TX_TYPES_FULL)[keyof typeof PERMISSION_DOMAIN_TX_TYPES_FULL];
export type PermissionedDomainConfigTxDisplayTypeFromConst = (typeof PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES)[keyof typeof PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES];
