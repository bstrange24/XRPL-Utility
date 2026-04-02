import { AppConstants } from '../../../core/app.constants';
import { MptConfigTxDisplayType } from './mpt.types';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const MPT_TABS: {
     key: MptConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createMpt',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'authorizeMpt',
          label: 'Authorize',
          icon: 'shield-ellipsis',
          iconType: 'lucide-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     // {
     //      key: 'unauthorizeMpt',
     //      label: 'Unauthorize',
     //      icon: 'heroTrash',
     //      iconType: 'ng-icon',
     //      color: '',
     //      iconSize: AppConstants.TAB_ICON_SIZE,
     // },
     {
          key: 'sendMpt',
          label: 'Send',
          icon: 'heroPaperAirplane',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'lockMpt',
          label: 'Lock/Unlock',
          icon: 'heroLockOpen',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'clawbackMpt',
          label: 'Clawback',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'destroyMpt',
          label: 'Destroy',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const MPT_TAB_META: Record<
     MptConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconType: IconType;
          iconSize: string;
     }
> = {
     createMpt: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Create MPT Token',
          desc: 'Create a new MPT Token for the selected account.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     authorizeMpt: {
          icon: 'shield-ellipsis',
          colorClass: 'orange-button-submenu',
          title: 'Authorize/Unauthorize MPT Token',
          desc: 'Authorize/Unauthorize MPT Tokens for the selected account.',
          color: '',
          iconType: 'lucide-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     // unauthorizeMpt: {
     //      icon: 'shield-ellipsis',
     //      colorClass: 'orange-button-submenu',
     //      title: 'Authorize/Unauthorize MPT Token',
     //      desc: 'Authorize/Unauthorize MPT Tokens for the selected account.',
     //      color: '',
     //      iconType: 'lucide-icon',
     //      iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     // },
     sendMpt: {
          icon: 'shield-ellipsis',
          colorClass: 'green-button-submenu',
          title: 'Send MPT',
          desc: 'Send created MPT to another XRPL address.',
          color: '',
          iconType: 'lucide-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     // unlockMpt: {
     //      icon: 'heroLockOpen',
     //      colorClass: 'green-button-submenu',
     //      title: 'Lock/Unlock MPT',
     //      desc: `Lock/Unlock MPT so another XRPL address can't send it.`,
     //      color: '',
     //      iconType: 'ng-icon',
     //      iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     // },
     lockMpt: {
          icon: 'heroLockOpen',
          colorClass: 'green-button-submenu',
          title: 'Lock/Unlock MPT',
          desc: `Lock/Unlock MPT so another XRPL address can't send it.`,
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     clawbackMpt: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Clawback MPT',
          desc: `Clawback a previously created MPT.`,
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     destroyMpt: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Destroy MPT',
          desc: `Destroy a previously created MPT.`,
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
