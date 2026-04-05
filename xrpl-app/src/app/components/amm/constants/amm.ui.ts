import { AppConstants } from '../../../core/app.constants';
import { AmmConfigTxDisplayType } from './amm.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const AMM_TABS: {
     key: AmmConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createAMM',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'depositToAMM',
          label: 'Deposit',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'withdrawalFromAMM',
          label: 'Withdrawl',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'clawbackFromAMM',
          label: 'Clawback',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'swapViaAMM',
          label: 'Swap',
          icon: 'heroCurrencyDollar',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'deleteAMM',
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const AMM_TAB_META: Record<
     AmmConfigTxDisplayType,
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
     createAMM: {
          icon: 'heroCurrencyDollar',
          colorClass: 'blue-button-submenu',
          title: 'Create',
          desc: 'Create an AMM on the XRPL.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     depositToAMM: {
          icon: 'heroCurrencyDollar',
          colorClass: 'blue-button-submenu',
          title: 'Deposit assets to AMM',
          desc: 'Deposit assets to an AMM for the currency pair.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     withdrawalFromAMM: {
          icon: 'heroCurrencyDollar',
          colorClass: 'blue-button-submenu',
          title: 'Withdrawl assets from AMM',
          desc: `Withdrawl assets from an AMM for the currency pair.`,
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     clawbackFromAMM: {
          icon: 'heroCurrencyDollar',
          colorClass: 'blue-button-submenu',
          title: 'Clawback assets from AMM',
          desc: 'Clawback assets issued from an AMM.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     swapViaAMM: {
          icon: 'heroCurrencyDollar',
          colorClass: 'blue-button-submenu',
          title: 'Swap assets Via AMM',
          desc: `Swap assets on an AMM.`,
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     deleteAMM: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete AMM',
          desc: `Delete an AMM from the XRPL.`,
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
