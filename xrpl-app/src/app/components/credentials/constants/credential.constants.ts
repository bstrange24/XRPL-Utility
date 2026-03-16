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

export const CREDENTIAL_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'create',
     ACCEPT: 'accept',
     VERIFY: 'verify',
     DELETE: 'delete',
} as const;

export type CredentialTxType = (typeof CREDENTIAL_TX_TYPES)[keyof typeof CREDENTIAL_TX_TYPES];
export type CredentialConfigTxDisplayType = (typeof CREDENTIAL_CONFIG_TX_DISPLAY_TYPES)[keyof typeof CREDENTIAL_CONFIG_TX_DISPLAY_TYPES];

export const CREDENTIAL_VALIDATION_RULES: Record<CredentialTxType, string> = {
     [CREDENTIAL_TX_TYPES.CREATE]: 'CredentialCreate',
     [CREDENTIAL_TX_TYPES.DELETE]: 'CredentialDelete',
     [CREDENTIAL_TX_TYPES.ACCEPT]: 'CredentialAccept',
} as const;
