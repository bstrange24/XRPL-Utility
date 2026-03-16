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
          key: 'create',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'accept',
          label: 'Accept',
          icon: 'copy-plus',
          iconType: 'lucide-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'verify',
          label: 'Verify',
          icon: 'shield-ellipsis',
          iconType: 'lucide-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'delete',
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
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
          iconSize: string;
     }
> = {
     create: {
          icon: 'heroPlusCircle',
          colorClass: 'blue-button-submenu',
          title: 'Create Credentials',
          desc: 'Create Credentials to another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     accept: {
          icon: 'heroArrowPath',
          colorClass: 'green-button-submenu',
          title: 'Accept Credentials',
          desc: 'Accept Credentials from another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     verify: {
          icon: 'shield-ellipsis',
          colorClass: 'orange-button-submenu',
          title: 'Verify Credentials',
          desc: 'Verify Credentials have been accepted by another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     delete: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Credentials',
          desc: 'Delete Credentials to another XRPL address.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
