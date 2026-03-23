import { AppConstants } from '../../../core/app.constants';
import { SendXrpConfigTxDisplayType } from './send-xrp.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const SEND_XRP_TABS: {
     key: SendXrpConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'sendXrp',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const SEND_XRP_TAB_META: Record<
     SendXrpConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
     }
> = {
     sendXrp: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Send XRP',
          desc: 'Send XRP to another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
