import { AppConstants } from '../../../core/app.constants';
import { EscrowConfigTxDisplayType } from './time-escrow.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const TIME_ESCROW_TABS: {
     key: EscrowConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createEscrow',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'finishEscrow',
          label: 'Finish',
          icon: 'heroClock',
          iconType: 'ng-icon',
          color: '#3b82f6',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'cancelEscrow',
          label: 'Cancel',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const TIME_ESCROW_TAB_META: Record<
     EscrowConfigTxDisplayType,
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
     createEscrow: {
          icon: 'heroPlusCircle',
          colorClass: 'green-button-submenu',
          title: 'Create Escrow',
          desc: 'Create a new escrow on the XRPL.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     finishEscrow: {
          icon: 'heroClock',
          colorClass: 'green-button-submenu',
          title: 'Finish Escrow',
          desc: 'Finish an existing escrow on the XRPL.',
          color: '#3b82f6',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     cancelEscrow: {
          icon: 'heroTrash',
          colorClass: 'green-button-submenu',
          title: 'Cancel Escrow',
          desc: 'Cancel an existing escrow on the XRPL.',
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;

export const CONDITIONAL_ESCROW_TABS: {
     key: EscrowConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createEscrow',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'finishEscrow',
          label: 'Finish',
          icon: 'split-icon',
          iconType: 'lucide-icon',
          color: '#3b82f6',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'cancelEscrow',
          label: 'Cancel',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const CONDITIONAL_ESCROW_TAB_META: Record<
     EscrowConfigTxDisplayType,
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
     createEscrow: {
          icon: 'heroPlusCircle',
          colorClass: 'green-button-submenu',
          title: 'Create Escrow',
          desc: 'Create a new escrow on the XRPL.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     finishEscrow: {
          icon: 'heroClock',
          colorClass: 'green-button-submenu',
          title: 'Finish Escrow',
          desc: 'Finish an existing escrow on the XRPL.',
          color: '#3b82f6',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     cancelEscrow: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Cancel Escrow',
          desc: 'Cancel an existing escrow on the XRPL.',
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
