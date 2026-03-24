import { AppConstants } from '../../../core/app.constants';
import { SignTransactionConfigTxDisplayType } from './sign-transaction.constants';

// Tab meta information constants
export const SIGN_TRANSACTION_TAB_META: Record<
     SignTransactionConfigTxDisplayType,
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
          icon: 'signature',
          colorClass: 'blue-button-submenu',
          title: 'Sign Transactions',
          desc: 'Sign and submit transactions.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
