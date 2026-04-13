import { AppConstants } from '../../../core/app.constants';
import { DelegateConfigTxDisplayType } from './delegate.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const DELEGATE_TABS: {
     key: DelegateConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'delegateCreate',
          label: 'Delegate Actions',
          icon: 'heroArrowUturnLeft',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'delegateClear',
          label: 'Clear Delegate Actions',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const DELEGATE_TAB_META: Record<
     DelegateConfigTxDisplayType,
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
     delegateCreate: {
          icon: 'heroArrowUturnLeft',
          colorClass: 'green-button-submenu',
          title: 'Delegate Actions',
          desc: 'Delegate Actions to another XRPL address.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     delegateClear: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Clear Delegate Actions',
          desc: 'Clear delegate actions sent from another XRPL address.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
