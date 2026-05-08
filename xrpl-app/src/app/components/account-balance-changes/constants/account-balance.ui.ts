import { AppConstants } from '../../../core/app.constants';
import { AccountBalanceConfigTxDisplayType } from './account-balance.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const ACCOUNT_BALANCE_TABS: {
     key: AccountBalanceConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'accountBalance',
          label: 'Account Balance Changes',
          icon: 'heroChartBar',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const ACCOUNT_BALANCE_TAB_META: Record<
     AccountBalanceConfigTxDisplayType,
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
     accountBalance: {
          icon: 'heroChartBar',
          colorClass: 'bg-green-50 text-green-600 rounded-xl p-3',
          title: 'Account Balance Changes',
          desc: 'Historical XRP and token balance changes for the selected account.',
          color: '#16a34a',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
