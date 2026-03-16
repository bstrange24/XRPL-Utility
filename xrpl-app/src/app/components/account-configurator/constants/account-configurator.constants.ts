import { AccountConfigAction } from './account-configurator.types';

export const ACCOUNT_CONFIG_VALIDATION_RULES: Readonly<Record<AccountConfigAction, string>> = {
     modifyAccountFlags: 'UpdateAccountFlags',
     modifyAccountSetFlags: 'UpdateAccountFlags',
     modifyMetaData: 'SetNftMinterAddress',
     updateMetaData: 'UpdateMetaData',
     modifyDepositAuth: 'SetDepositAuthAccounts',
     modifyMultiSigners: 'SetMultiSign',
     modifyRegularKey: 'SetRegularKey',
};

export type ACCOUNT_ACTIONS = 'modifyAccountFlags' | 'modifyAccountSetFlags' | 'modifyMetaData' | 'updateMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey';
