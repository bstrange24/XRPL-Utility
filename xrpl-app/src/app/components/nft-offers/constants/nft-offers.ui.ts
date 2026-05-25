import { AppConstants } from '../../../core/app.constants';
import { NftOffersConfigTxDisplayType } from './nft-offers.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const NFT_OFFERS_TABS: {
     key: NftOffersConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'sellNft',
          label: 'Sell NFT',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'buyNft',
          label: 'Buy NFT',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '#60a5fa',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     // {
     //      key: 'sellNftOffer',
     //      label: 'Sell NFT Offer',
     //      icon: 'heroCurrencyDollar',
     //      iconType: 'ng-icon',
     //      color: '#10b981',
     //      iconSize: AppConstants.TAB_ICON_SIZE,
     // },
     // {
     //      key: 'buyNftOffer',
     //      label: 'Buy NFT Offer',
     //      icon: 'heroCurrencyDollar',
     //      iconType: 'ng-icon',
     //      color: '#60a5fa',
     //      iconSize: AppConstants.TAB_ICON_SIZE,
     // },
     {
          key: 'cancelNftOffer',
          label: 'Cancel Offer',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const NFT_OFFERS_TAB_META: Record<
     NftOffersConfigTxDisplayType,
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
     sellNft: {
          icon: 'heroCurrencyDollar',
          colorClass: 'blue-button-submenu',
          title: 'Sell NFT',
          desc: 'Sell an NFT on the market.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     buyNft: {
          icon: 'heroCurrencyDollar',
          colorClass: 'green-button-submenu',
          title: 'Buy NFT',
          desc: 'Buy an NFT from the market.',
          color: '#60a5fa',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     // sellNftOffer: {
     //      icon: 'heroCurrencyDollar',
     //      colorClass: 'blue-button-submenu',
     //      title: 'Sell NFT Offer',
     //      desc: `Create an offer to sell an NFT.`,
     //      color: '#10b981',
     //      iconType: 'ng-icon',
     //      iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     // },
     // buyNftOffer: {
     //      icon: 'heroCurrencyDollar',
     //      colorClass: 'green-button-submenu',
     //      title: 'Buy NFT Offer',
     //      desc: 'Create an offer to buy an NFT.',
     //      color: '#60a5fa',
     //      iconType: 'ng-icon',
     //      iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     // },
     cancelNftOffer: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Cancel NFT Offer',
          desc: `Cancel and existing NFT offer.`,
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
