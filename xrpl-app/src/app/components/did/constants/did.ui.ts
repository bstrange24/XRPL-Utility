import { AppConstants } from '../../../core/app.constants';
import { DidConfigTxDisplayType } from './did.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const DID_TABS: {
     key: DidConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'set',
          label: 'Set',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'delete',
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const DID_TAB_META: Record<
     DidConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
     }
> = {
     set: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Set DID',
          desc: 'Set DID for the selected account.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     delete: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete DID',
          desc: 'Delete DID for the selected account.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
