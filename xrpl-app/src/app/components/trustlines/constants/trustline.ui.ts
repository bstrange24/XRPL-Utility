import { AppConstants } from '../../../core/app.constants';
import { TrustlineConfigTxDisplayType } from './trustline.constants';
import { TrustlineFlagKey } from './trustline.types';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const TRUSTLINE_TABS: {
     key: TrustlineConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'setTrustline',
          label: 'Set',
          icon: 'heroAdjustmentsVertical',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'removeTrustline',
          label: 'Remove',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'issueCurrency',
          label: 'Send / Issue Currency',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'clawbackTokens',
          label: 'Clawback',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'addNewIssuers',
          label: 'Modify Issuers',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const TRUSTLINE_TAB_META: Record<
     TrustlineConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
     }
> = {
     setTrustline: {
          icon: 'heroAdjustmentsVertical',
          colorClass: 'blue-button-submenu',
          title: 'Set Trustline',
          desc: 'Set a trustline to another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     removeTrustline: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Remove Trustline',
          desc: 'Remove trustline to another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     issueCurrency: {
          icon: 'heroCurrencyDollar',
          colorClass: 'green-button-submenu',
          title: 'Send / Issue Currency',
          desc: 'Send / Issue currency to another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     clawbackTokens: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Clawback Tokens',
          desc: 'Clawback tokens from another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     addNewIssuers: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Add/Remove Issuers',
          desc: 'Add issuers and tokens from external sources.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;

export const SET_FLAGS: {
     key: TrustlineFlagKey;
     title: string;
     hex: string;
     desc: string;
     isClearFlag: boolean;
}[] = [
     {
          key: 'tfSetfAuth',
          title: 'SetfAuth',
          hex: '0x00010000',
          desc: 'Authorize the other party to hold currency issued by this account. (No effect unless using the asfRequireAuth AccountSet flag.) Cannot be unset.',
          isClearFlag: true,
     },
     {
          key: 'tfSetNoRipple',
          title: 'SetNoRipple',
          hex: '0x00020000',
          desc: 'Enable the No Ripple flag, which blocks rippling between two trust lines of the same currency if this flag is enabled on both.',
          isClearFlag: true,
     },
     {
          key: 'tfSetFreeze',
          title: 'SetFreeze',
          hex: '0x00100000',
          desc: 'Freeze the trustline (prevent transfers).',
          isClearFlag: true,
     },
     {
          key: 'tfSetDeepFreeze',
          title: 'SetDeepFreeze',
          hex: '0x00400000',
          desc: 'Deep-Freeze (block sending & receiving). Requires freeze first.',
          isClearFlag: true,
     },
] as const;

export const CLEAR_FLAGS: {
     key: TrustlineFlagKey;
     title: string;
     hex: string;
     desc: string;
     isClearFlag: boolean;
}[] = [
     {
          key: 'tfClearNoRipple',
          title: 'ClearNoRipple',
          hex: '0x00040000',
          desc: 'Required to remove trustline...',
          isClearFlag: true,
     },
     {
          key: 'tfClearFreeze',
          title: 'ClearFreeze',
          hex: '0x00200000',
          desc: 'Required to remove a frozen trustline.',
          isClearFlag: true,
     },
     {
          key: 'tfClearDeepFreeze',
          title: 'ClearDeepFreeze',
          hex: '0x00200000',
          desc: 'Required to remove a deep-frozen trustline.',
          isClearFlag: true,
     },
] as const;
