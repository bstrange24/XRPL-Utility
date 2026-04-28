import { FlagOption } from '../../shared/flag-selector/flag-selector.component';
import { MptFlagKey, MptTxType } from './mpt.types';

export const MPT_TAB = ['createMpt', 'authorizeMpt', 'unauthorizeMpt', 'sendMpt', 'lockMpt', 'unlockMpt', 'clawbackMpt', 'destroyMpt'] as const;
export type MptTab = (typeof MPT_TAB)[number];

export const MPT_TX_TYPE_MAP = {
     createMpt: 'createMpt',
     authorizeMpt: 'authorizeMpt',
     unauthorizeMpt: 'unauthorizeMpt',
     sendMpt: 'sendMpt',
     lockMpt: 'lockMpt',
     unlockMpt: 'unlockMpt',
     clawbackMpt: 'clawbackMpt',
     destroyMpt: 'destroyMpt',
} as const;

export const MPT_TX_TYPES = {
     CREATE: 'createMpt',
     AUTHORIZE: 'authorizeMpt',
     UNAUTHORIZE: 'unauthorizeMpt',
     SEND: 'sendMpt',
     LOCK: 'lockMpt',
     UNLOCK: 'unlockMpt',
     CLAWBACK: 'clawbackMpt',
     DESTROY: 'destroyMpt',
} as const;

export const MPT_CONFIG_TX_DISPLAY_TYPES = {
     CREATE: 'createMpt',
     AUTHORIZE: 'authorizeMpt',
     UNAUTHORIZE: 'unauthorizeMpt',
     SEND: 'sendMpt',
     LOCK: 'lockMpt',
     UNLOCK: 'unlockMpt',
     CLAWBACK: 'clawbackMpt',
     DESTROY: 'destroyMpt',
} as const;

export type MptTxTypes = (typeof MPT_TX_TYPES)[keyof typeof MPT_TX_TYPES];
export type MptConfigTxDisplayType = (typeof MPT_CONFIG_TX_DISPLAY_TYPES)[keyof typeof MPT_CONFIG_TX_DISPLAY_TYPES];

export const MPT_VALIDATION_RULES: Record<MptTxType, string> = {
     [MPT_TX_TYPES.CREATE]: 'CreateMpt',
     [MPT_TX_TYPES.AUTHORIZE]: 'AuthorizeMpt',
     [MPT_TX_TYPES.UNAUTHORIZE]: 'UnauthorizeMpt',
     [MPT_TX_TYPES.SEND]: 'SendMpt',
     [MPT_TX_TYPES.LOCK]: 'LockMpt',
     [MPT_TX_TYPES.UNLOCK]: 'UnlockMpt',
     [MPT_TX_TYPES.CLAWBACK]: 'ClawbackMpt',
     [MPT_TX_TYPES.DESTROY]: 'DestroyMpt',
} as const;

export const MPT_FLAGS_CONFIG: FlagOption<MptFlagKey>[] = [
     { key: 'canLock', label: 'MPTCanLock', hex: '0x00000002', description: 'The MPT can be locked both individually and globally.' },
     { key: 'isRequireAuth', label: 'MPTRequireAuth', hex: '0x00000004', description: 'Individual holders must be authorized.' },
     { key: 'canEscrow', label: 'MPTCanEscrow', hex: '0x00000008', description: 'Holders can place balances into escrow.' },
     { key: 'canTrade', label: 'MPTCanTrade', hex: '0x00000010', description: 'Holders can trade on DEX or AMM.' },
     { key: 'canTransfer', label: 'MPTCanTransfer', hex: '0x00000020', description: 'Tokens can be transferred to other accounts.' },
     { key: 'canClawback', label: 'MPTCanClawback', hex: '0x00000040', description: 'Issuer can clawback value from holders.' },
];
