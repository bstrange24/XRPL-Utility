import { AppConstants } from '../../../core/app.constants';
import { CheckConfigTxDisplayType } from './checks.types';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const CHECK_TABS: {
     key: CheckConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createCheck',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'cashCheck',
          label: 'Cash',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '#3b82f6',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'cancelCheck',
          label: 'Cancel',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const CHECK_TAB_META: Record<
     CheckConfigTxDisplayType,
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
     createCheck: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Create Check',
          desc: 'Create a check to another XRPL address.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     cashCheck: {
          icon: 'heroCurrencyDollar',
          colorClass: 'green-button-submenu',
          title: 'Cash Check',
          desc: 'Cash check sent from another XRPL address.',
          color: '#3b82f6',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     cancelCheck: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Cancel Check',
          desc: 'Cancel check create from the selected account.',
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
