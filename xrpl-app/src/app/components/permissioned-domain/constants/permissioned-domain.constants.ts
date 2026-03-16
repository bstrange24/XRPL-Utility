import { PermissionDomainTxType, PermissionedDomainTab, PermissionedDomainTxTypeFull } from './permissioned-domain.types';

// Transaction types
export const PERMISSION_DOMAIN_TX_TYPES = {
     SET: 'setDomain',
     DELETE: 'deleteDomain',
} as const;

// Full transaction types (for XRPL transactions)
export const PERMISSION_DOMAIN_TX_TYPES_FULL = {
     SET: 'setPermissionedDomain',
     DELETE: 'deletePermissionedDomain',
} as const;

// Display types
export const PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES = {
     SET: 'setDomain',
     DELETE: 'deleteDomain',
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

// Type utilities
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

// Types derived from constants
export type PermissionDomainTxTypeFromConst = (typeof PERMISSION_DOMAIN_TX_TYPES)[keyof typeof PERMISSION_DOMAIN_TX_TYPES];
export type PermissionedDomainTxTypeFullFromConst = (typeof PERMISSION_DOMAIN_TX_TYPES_FULL)[keyof typeof PERMISSION_DOMAIN_TX_TYPES_FULL];
export type PermissionedDomainConfigTxDisplayTypeFromConst = (typeof PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES)[keyof typeof PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES];
