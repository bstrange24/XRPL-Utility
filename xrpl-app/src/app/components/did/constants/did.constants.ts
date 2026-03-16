export const DID_TX_TYPE_MAP = {
     set: 'SetDID',
     delete: 'DeleteDID',
} as const;

export const DID_TX_TYPES = {
     SET: 'setDid',
     DELETE: 'deleteDid',
} as const;

export type DidConfigTxDisplayType = keyof typeof DID_TX_TYPE_MAP;

export const DID_VALIDATION_RULES: Record<(typeof DID_TX_TYPES)[keyof typeof DID_TX_TYPES], string> = {
     [DID_TX_TYPES.SET]: 'DIDSet',
     [DID_TX_TYPES.DELETE]: 'DIDdelete',
} as const;
