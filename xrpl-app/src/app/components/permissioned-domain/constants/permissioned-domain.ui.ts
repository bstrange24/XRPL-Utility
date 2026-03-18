import { AppConstants, IconType } from '../../../core/app.constants';
import { PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES } from './permissioned-domain.constants';
import { PermissionedDomainConfigTxDisplayType, PermissionedDomainTab } from './permissioned-domain.types';

// Tabs configuration
export const PERMISSION_DOMAIN_TABS: {
     key: PermissionedDomainConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES.SET,
          label: 'Set',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES.DELETE,
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information
export const PERMISSION_DOMAIN_TAB_META: Record<
     PermissionedDomainConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
     }
> = {
     [PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES.SET]: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Set Permissioned Domain',
          desc: 'Set Permissioned Domain for the selected account.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES.DELETE]: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Permissioned Domain',
          desc: 'Delete Permissioned Domain for the selected account.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;

// Button labels and classes per mode
export const PERMISSION_DOMAIN_ACTION_CONFIG: Record<
     PermissionedDomainTab,
     {
          buttonLabel: string;
          buttonClass: string;
     }
> = {
     setPermissionedDomain: {
          buttonLabel: 'Set Domain',
          buttonClass: 'btn-primary',
     },
     deletePermissionedDomain: {
          buttonLabel: 'Delete Domain',
          buttonClass: 'btn-danger',
     },
} as const;
