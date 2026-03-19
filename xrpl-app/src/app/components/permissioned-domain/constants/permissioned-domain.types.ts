import * as xrpl from 'xrpl';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { PermissionedDomainState } from '../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { CredentialState } from '../../../services/credentials/credential-store/credential-store.service';

export type PermissionDomainTxType = 'setPermissionedDomain' | 'deletePermissionedDomain';
export type PermissionedDomainField = 'createdPermissionedDomains' | 'createdDomains' | 'selectedDomainId' | 'credentialType' | 'credentialIssuer' | 'subject' | 'credentialIdSearchQuery' | 'regularKeySigningEnabled';
export type PermissionedDomainTab = 'setPermissionedDomain' | 'deletePermissionedDomain';
export type PermissionedDomainTxTypeFull = 'setPermissionedDomain' | 'deletePermissionedDomain';
export type PermissionedDomainConfigTxDisplayType = 'setPermissionedDomain' | 'deletePermissionedDomain';
export type IconType = 'ng-icon' | 'lucide-icon';

export interface PermissionDomainConfig {
     permissionedDomain: PermissionedDomainState;
     account?: AccountConfiguratorState;
     txOptions?: XrplTxOptionsState;
     credential?: CredentialState;
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
