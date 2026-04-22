import { AppConstants } from '../../../core/app.constants';
import { CredentialConfigTxDisplayType } from './credential.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const CREDENTIAL_TABS: {
     key: CredentialConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createCredential',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'acceptCredential',
          label: 'Accept',
          icon: 'copy-plus',
          iconType: 'lucide-icon',
          color: '#c084fc',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'verifyCredential',
          label: 'Verify',
          icon: 'shield-check',
          iconType: 'lucide-icon',
          color: '#fbbf24',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'deleteCredential',
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const CREDENTIAL_TAB_META: Record<
     CredentialConfigTxDisplayType,
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
     createCredential: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Create Credentials',
          desc: 'Create Credentials to another XRPL address.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     acceptCredential: {
          icon: 'heroArrowPath',
          colorClass: 'green-button-submenu',
          title: 'Accept Credentials',
          desc: 'Accept Credentials from another XRPL address.',
          color: '#c084fc',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     verifyCredential: {
          icon: 'shield-check',
          colorClass: 'orange-button-submenu',
          title: 'Verify Credentials',
          desc: 'Verify Credentials have been accepted by another XRPL address.',
          color: '#fbbf24',
          iconType: 'lucide-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     deleteCredential: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Credentials',
          desc: 'Delete Credentials to another XRPL address.',
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
