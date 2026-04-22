import { AppConstants } from '../../../core/app.constants';
import { AccountConfigAction } from './account-configurator.types';

type IconType = 'ng-icon' | 'lucide-icon';

export const ACCOUNT_CONFIG_TABS: {
     key: AccountConfigAction;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'modifyAccountFlags',
          label: 'Account Flags',
          icon: 'heroArrowPath',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'modifyMetaData',
          label: 'Meta Data',
          icon: 'heroArrowPath',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'modifyDepositAuth',
          label: 'Deposit Auth',
          icon: 'heroArrowPath',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'modifyMultiSigners',
          label: 'Multi-Sign',
          icon: 'heroArrowPath',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'modifyRegularKey',
          label: 'Regular Key',
          icon: 'heroArrowPath',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
];

export const ACCOUNT_CONFIG_TAB_META: Record<
     AccountConfigAction,
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
     modifyAccountFlags: {
          icon: 'heroArrowPath',
          colorClass: 'white-button-submenu',
          title: 'Modify Account Flags',
          desc: 'Set or Clear account level flags.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     modifyMetaData: {
          icon: 'heroArrowPath',
          colorClass: 'white-button-submenu',
          title: 'Modify Account Meta Data',
          desc: 'Modify account metadata.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     modifyDepositAuth: {
          icon: 'heroArrowPath',
          colorClass: 'white-button-submenu',
          title: 'Modify Deposit Auth',
          desc: 'Modify Deposit Authorization addresses.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     modifyMultiSigners: {
          icon: 'heroArrowPath',
          colorClass: 'blue-button-submenu',
          title: 'Modify Multi Sign',
          desc: 'Modify account multisigners.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     modifyRegularKey: {
          icon: 'heroArrowPath',
          colorClass: 'blue-button-submenu',
          title: 'Modify Regular Key',
          desc: 'Modify the account regular key.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     modifyAccountSetFlags: {
          icon: '',
          colorClass: '',
          title: '',
          desc: '',
          color: '',
          iconType: 'ng-icon',
          iconSize: '',
     },
     updateMetaData: {
          icon: '',
          colorClass: '',
          title: '',
          desc: '',
          color: '',
          iconType: 'ng-icon',
          iconSize: '',
     },
};
