export const AMM_TX_TYPES = {
     CREATE_AMM: 'createAMM',
     DEPOSIT_TO_AMM: 'depositToAMM',
     WITHDRAWL_TOKEN_FROM_AMM: 'withdrawlTokenFromAMM',
     CLAWBACK: 'clawbackFromAMM',
     SWAP: 'swapViaAMM',
     DELETE: 'deleteAMM',
} as const;

export const AMM_CONFIG_TX_DISPLAY_TYPES = {
     CREATE_AMM: 'createAMM',
     DEPOSIT_TO_AMM: 'depositToAMM',
     WITHDRAWL_TOKEN_FROM_AMM: 'withdrawlTokenFromAMM',
     CLAWBACK: 'clawbackFromAMM',
     SWAP: 'swapViaAMM',
     DELETE: 'deleteAMM',
};

export type AmmTxTypes = (typeof AMM_TX_TYPES)[keyof typeof AMM_TX_TYPES];
export type AmmConfigTxDisplayType = (typeof AMM_CONFIG_TX_DISPLAY_TYPES)[keyof typeof AMM_CONFIG_TX_DISPLAY_TYPES];

export const AMM_VALIDATION_RULES: Record<AmmTxTypes, string> = {
     [AMM_TX_TYPES.CREATE_AMM]: 'CreateAMM',
     [AMM_TX_TYPES.DEPOSIT_TO_AMM]: 'DepositToAMM',
     [AMM_TX_TYPES.WITHDRAWL_TOKEN_FROM_AMM]: 'WithdrawlTokenFromAMM',
     [AMM_TX_TYPES.CLAWBACK]: 'ClawbackFromAMM',
     [AMM_TX_TYPES.SWAP]: 'SwapViaAMM',
     [AMM_TX_TYPES.DELETE]: 'DeleteAMM',
} as const;
