import { AppConstants } from '../../../core/app.constants';
import { VaultConfigTxDisplayType } from './vault.types';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const VAULT_TABS: {
     key: VaultConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createVault',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'modifyVault',
          label: 'Modify',
          icon: 'heroPencilSquare',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'depositVault',
          label: 'Deposit',
          icon: 'heroArrowDownCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'clawbackVault',
          label: 'Clawback',
          icon: 'heroArrowUturnLeft',
          iconType: 'ng-icon',
          color: '#60a5fa',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'deleteVault',
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const VAULT_TAB_META: Record<
     VaultConfigTxDisplayType,
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
     createVault: {
          icon: 'heroPlusCircle',
          colorClass: 'green-button-submenu',
          title: 'Create Vault',
          desc: 'Create a new vault for the selected account.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     modifyVault: {
          icon: 'heroPencilSquare',
          colorClass: 'green-button-submenu',
          title: 'Modify Vault',
          desc: 'Modify a previously created Vault.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     depositVault: {
          icon: 'heroLockOpen',
          colorClass: 'green-button-submenu',
          title: 'Deposit Asset',
          desc: `Deposit an existing asset in the Vault.`,
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     clawbackVault: {
          icon: 'heroArrowUturnLeft',
          colorClass: 'red-button-submenu',
          title: 'Clawback Vault Asset',
          desc: `Clawback an exiting asset in the vault.`,
          color: '#60a5fa',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     deleteVault: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Vault',
          desc: `Delete a previously created Vault.`,
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
