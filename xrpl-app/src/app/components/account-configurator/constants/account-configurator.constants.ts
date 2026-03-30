export type ACCOUNT_ACTIONS = 'modifyAccountFlags' | 'modifyAccountSetFlags' | 'modifyMetaData' | 'updateMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey';

export const ACCOUNT_CONFIG_TX_TYPES = {
     MODIFY_ACCOUNT_SET_FLAGS: 'modifyAccountSetFlags',
     MODIFY_ACCOUNT_FLAGS: 'modifyAccountFlags',
     MODIFY_DEPOSIT_AUTH: 'modifyDepositAuth',
     MODIFY_MULTI_SIGNERS: 'modifyMultiSigners',
     MODIFY_REGULAR_KEY: 'modifyRegularKey',
     MODIFY_META_DATA: 'modifyMetaData',
     UPDATE_META_DATA: 'updateMetaData',
} as const;

export const ACCOUNT_CONFIG_VALIDATION_RULES: Record<string, string> = {
     [ACCOUNT_CONFIG_TX_TYPES.MODIFY_ACCOUNT_SET_FLAGS]: 'UpdateAccountFlags',
     [ACCOUNT_CONFIG_TX_TYPES.MODIFY_ACCOUNT_FLAGS]: 'UpdateAccountFlags',
     [ACCOUNT_CONFIG_TX_TYPES.MODIFY_DEPOSIT_AUTH]: 'SetDepositAuthAccounts',
     [ACCOUNT_CONFIG_TX_TYPES.MODIFY_MULTI_SIGNERS]: 'SetMultiSign',
     [ACCOUNT_CONFIG_TX_TYPES.MODIFY_REGULAR_KEY]: 'SetRegularKey',
     [ACCOUNT_CONFIG_TX_TYPES.MODIFY_META_DATA]: 'SetNftMinterAddress',
     [ACCOUNT_CONFIG_TX_TYPES.UPDATE_META_DATA]: 'UpdateMetaData',
};
