export const ESCROW_TAB = ['createEscrow', 'finishEscrow', 'cancelEscrow'] as const;
export type EscrowTab = (typeof ESCROW_TAB)[number];

export const ESCROW_TX_TYPE_MAP = {
     createEscrow: 'createEscrow',
     finishEscrow: 'finishEscrow',
     cancelEscrow: 'cancelEscrow',
} as const;

export const ESCROW_TX_TYPES = {
     CREATE: 'createEscrow',
     FINISH: 'finishEscrow',
     CANCEL: 'cancelEscrow',
} as const;

export const ESCROW_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createEscrow',
     FINISH: 'finishEscrow',
     CANCEL: 'cancelEscrow',
} as const;

export type EscrowTxType = (typeof ESCROW_TX_TYPES)[keyof typeof ESCROW_TX_TYPES];
export type EscrowConfigTxDisplayType = (typeof ESCROW_CONFIG_TX_DISPLAY_TYPES)[keyof typeof ESCROW_CONFIG_TX_DISPLAY_TYPES];

export const ESCROW_VALIDATION_RULES: Record<EscrowTxType, string> = {
     [ESCROW_TX_TYPES.CREATE]: 'CreateEscrow',
     [ESCROW_TX_TYPES.FINISH]: 'FinishEscrow',
     [ESCROW_TX_TYPES.CANCEL]: 'CancelEscrow',
} as const;
