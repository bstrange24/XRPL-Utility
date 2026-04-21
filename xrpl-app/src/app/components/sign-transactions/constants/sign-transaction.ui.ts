import { AppConstants } from '../../../core/app.constants';
import { SignTransactionConfigTxDisplayType } from './sign-transaction.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const SIGN_TRANSACTION_TABS: {
     key: SignTransactionConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'sendXrp',
          label: 'Sign Transactions',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const SIGN_TRANSACTION_TAB_META: Record<
     SignTransactionConfigTxDisplayType,
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
     sendXrp: {
          icon: 'signature',
          colorClass: 'btn-blue',
          title: 'Sign Transactions',
          desc: 'Sign and submit transactions.',
          color: '#16a34a',
          iconType: 'lucide-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
