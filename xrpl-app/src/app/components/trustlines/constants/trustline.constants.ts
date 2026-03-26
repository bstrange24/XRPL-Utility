import { TrustSetFlags } from 'xrpl';
import { TrustlineFlagItem } from './trustline.types';

export const TRUSTLINE_TAB = ['setTrustline', 'removeTrustline', 'issueCurrency', 'clawbackTokens', 'addNewIssuers'] as const;
export type TrustlineTab = (typeof TRUSTLINE_TAB)[number];

export const TRUSTLINE_TX_TYPE_MAP = {
     setTrustline: 'TrustSet',
     removeTrustline: 'RemoveTrustline',
     issueCurrency: 'IssueCurrency',
     clawbackTokens: 'ClawbackTokens',
     addNewIssuers: 'AddNewIssuers',
} as const;

export const TRUSTLINE_TX_TYPES = {
     SET: 'setTrustline',
     REMOVE: 'removeTrustline',
     ISSUE: 'issueCurrency',
     CLAWBACK: 'clawbackTokens',
     ADD: 'addNewIssuers',
} as const;

export const TRUSTLINE_CONFIG_TX_DISPLAY_TYPES = {
     SET: 'setTrustline',
     REMOVE: 'removeTrustline',
     ISSUE: 'issueCurrency',
     CLAWBACK: 'clawbackTokens',
     ADD: 'addNewIssuers',
} as const;

export type TrustlineTxType = (typeof TRUSTLINE_TX_TYPES)[keyof typeof TRUSTLINE_TX_TYPES];
export type TrustlineConfigTxDisplayType = (typeof TRUSTLINE_CONFIG_TX_DISPLAY_TYPES)[keyof typeof TRUSTLINE_CONFIG_TX_DISPLAY_TYPES];

export const TRUSTLINE_VALIDATION_RULES: Record<TrustlineTxType, string> = {
     [TRUSTLINE_TX_TYPES.SET]: 'TrustSet',
     [TRUSTLINE_TX_TYPES.REMOVE]: 'RemoveTrustline',
     [TRUSTLINE_TX_TYPES.ISSUE]: 'IssueCurrency',
     [TRUSTLINE_TX_TYPES.CLAWBACK]: 'ClawbackTokens',
     [TRUSTLINE_TX_TYPES.ADD]: 'AddNewIssuers',
} as const;

export const SET_FLAGS: TrustlineFlagItem[] = [
     { key: 'tfSetfAuth', title: 'Set Auth', desc: 'Authorize the counterparty', hex: '0x00010000' },
     { key: 'tfSetNoRipple', title: 'No Ripple', desc: 'Disable rippling on this trustline', hex: '0x00020000' },
     { key: 'tfSetFreeze', title: 'Freeze', desc: 'Freeze the trustline', hex: '0x00100000' },
     { key: 'tfSetDeepFreeze', title: 'Deep Freeze', desc: 'Deep-freeze the trustline', hex: '0x00400000' },
];

export const CLEAR_FLAGS: TrustlineFlagItem[] = [
     { key: 'tfClearNoRipple', title: 'Clear No Ripple', desc: 'Clear the NoRipple flag', hex: '0x00040000', isClearFlag: true },
     { key: 'tfClearFreeze', title: 'Clear Freeze', desc: 'Clear the Freeze flag', hex: '0x00200000', isClearFlag: true },
     { key: 'tfClearDeepFreeze', title: 'Clear Deep Freeze', desc: 'Clear the Deep Freeze flag', hex: '0x00800000', isClearFlag: true },
];

export const TRUSTLINE = {
     FLAGS: {
          tfSetfAuth: false,
          tfSetNoRipple: false,
          tfClearNoRipple: false,
          tfSetFreeze: false,
          tfClearFreeze: false,
          tfSetDeepFreeze: false,
     },
     FLAG_LIST: [
          { key: 'tfSetfAuth', label: 'Require Authorization (tfSetfAuth)' },
          { key: 'tfSetNoRipple', label: 'Set No Ripple (tfSetNoRipple)' },
          { key: 'tfClearNoRipple', label: 'Clear No Ripple (tfClearNoRipple)' },
          { key: 'tfSetFreeze', label: 'Set Freeze (tfSetFreeze)' },
          { key: 'tfClearFreeze', label: 'Clear Freeze (tfClearFreeze)' },
          { key: 'tfSetDeepFreeze', label: 'Set Freeze (tfSetDeepFreeze)' },
     ],
     FLAG_MAP: {
          tfSetfAuth: TrustSetFlags.tfSetfAuth,
          tfSetNoRipple: TrustSetFlags.tfSetNoRipple,
          tfClearNoRipple: TrustSetFlags.tfClearNoRipple,
          tfSetFreeze: TrustSetFlags.tfSetFreeze,
          tfClearFreeze: TrustSetFlags.tfClearFreeze,
          tfSetDeepFreeze: TrustSetFlags.tfSetDeepFreeze,
     },
     LEDGER_FLAG_MAP: {
          lsfLowReserve: 0x00010000,
          lsfHighReserve: 0x00020000,
          lsfLowAuth: 0x00040000,
          lsfHighAuth: 0x00080000,
          lsfLowNoRipple: 0x00100000,
          lsfHighNoRipple: 0x00200000,
          lsfLowFreeze: 0x00400000,
          lsfHighFreeze: 0x00800000,
          lsfLowDeepFreeze: 0x01000000,
          lsfHighDeepFreeze: 0x02000000,
     },
     CONFLICTS: {
          tfSetNoRipple: ['tfClearNoRipple'],
          tfClearNoRipple: ['tfSetNoRipple'],
          tfSetFreeze: ['tfClearFreeze'],
          tfClearFreeze: ['tfSetFreeze'],
     } as { [key: string]: string[] },
};
