import { AppConstants } from '../../../core/app.constants';

type IconType = 'ng-icon' | 'lucide-icon';

export const OFFER_TABS: {
     key: string;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createOffer',
          label: 'Create Offer',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'getOrderBook',
          label: 'Order Book',
          icon: 'heroChartBar',
          iconType: 'ng-icon',
          color: '#60a5fa',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'cancelOffer',
          label: 'Cancel Offer',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

export const OFFER_TAB_META: Record<
     string,
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
     createOffer: {
          icon: 'heroCurrencyDollar',
          colorClass: 'blue-button-submenu',
          title: 'Create Offer',
          desc: 'Create an offer on the XRPL DEX.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     getOrderBook: {
          icon: 'heroChartBar',
          colorClass: 'blue-button-submenu',
          title: 'Get Order Book',
          desc: 'Get the order book for a currency pair on the XRPL DEX.',
          color: '#60a5fa',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     cancelOffer: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Cancel Offer',
          desc: 'Cancel an existing offer on the XRPL DEX.',
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
