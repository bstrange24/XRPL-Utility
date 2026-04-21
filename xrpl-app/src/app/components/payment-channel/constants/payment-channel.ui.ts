import { AppConstants } from '../../../core/app.constants';
import { PaymentChannelConfigTxDisplayType } from './payment-channel.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const PAYMENT_CHANNEL_TABS: {
     key: PaymentChannelConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createPaymentChannel',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'fundPaymentChannel',
          label: 'Fund',
          icon: 'banknote-arrow-down',
          iconType: 'lucide-icon',
          color: '#60a5fa',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'claimPaymentChannel',
          label: 'Claim',
          icon: 'banknote-arrow-up',
          iconType: 'lucide-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'renewPaymentChannel',
          label: 'Renew',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#60a5fa',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'closePaymentChannel',
          label: 'Close',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const PAYMENT_CHANNEL_TAB_META: Record<
     PaymentChannelConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
          iconType: IconType;
     }
> = {
     createPaymentChannel: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Create Payment Channel',
          desc: 'Create a payment channel to another XRPL address.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     fundPaymentChannel: {
          icon: 'banknote-arrow-down',
          colorClass: 'green-button-submenu',
          title: 'Fund Payment Channel',
          desc: 'Fund existing payment channel created by the selected account.',
          color: '#60a5fa',
          iconType: 'lucide-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     claimPaymentChannel: {
          icon: 'banknote-arrow-up',
          colorClass: 'green-button-submenu',
          title: 'Claim Payment Channel',
          desc: 'Claim funds from payment channel.',
          color: '#10b981',
          iconType: 'lucide-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     renewPaymentChannel: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Renew Payment Channel',
          desc: 'Reset expiration as the source/creator (no funds claimed).',
          color: '#60a5fa',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     closePaymentChannel: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Close Payment Channel',
          desc: 'Close existing payment channel created by the selected account.',
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
