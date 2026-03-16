import * as xrpl from 'xrpl';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';

// Core types
export type PermissionDomainTxType = 'setDomain' | 'deleteDomain';
export type PermissionedDomainField = 'createdPermissionedDomains' | 'createdDomains' | 'selectedDomainId' | 'credentialType' | 'credentialIssuer' | 'subject' | 'credentialIdSearchQuery' | 'regularKeySigningEnabled';

export type PermissionedDomainTab = 'setDomain' | 'deleteDomain';
export type PermissionedDomainTxTypeFull = 'setPermissionedDomain' | 'deletePermissionedDomain';
export type PermissionedDomainConfigTxDisplayType = 'setDomain' | 'deleteDomain';
export type IconType = 'ng-icon' | 'lucide-icon';

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
     permissionedDomainsToShow: any[];
     actionButtonLabel: string;
     actionButtonClass: string;
}

// Re-export types derived from constants (will be imported from transaction constants)
export type PermissionDomainTxTypeFromConst = import('./permissioned-domain.constants').PermissionDomainTxTypeFromConst;
export type PermissionedDomainTxTypeFullFromConst = import('./permissioned-domain.constants').PermissionedDomainTxTypeFullFromConst;
export type PermissionedDomainConfigTxDisplayTypeFromConst = import('./permissioned-domain.constants').PermissionedDomainConfigTxDisplayTypeFromConst;
