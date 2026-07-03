import { AppConstants } from '../../../core/app.constants';
import { LoanConfigTxDisplayType } from './loan.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const LOAN_TABS: {
     key: LoanConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createLoan',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     // {
     //      key: 'modifyLoan',
     //      label: 'Modify',
     //      icon: 'heroArrowPath',
     //      iconType: 'ng-icon',
     //      color: '#10b981',
     //      iconSize: AppConstants.TAB_ICON_SIZE,
     // },
     {
          key: 'payLoan',
          label: 'Pay Loan',
          icon: 'heroArrowDownCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     // {
     //      key: 'defaultLoan',
     //      label: 'Default Loan',
     //      icon: 'heroExclamationTriangle',
     //      iconType: 'ng-icon',
     //      color: '#ef4444',
     //      iconSize: AppConstants.TAB_ICON_SIZE,
     // },
     // {
     //      key: 'impairLoan',
     //      label: 'Impair Loan',
     //      icon: 'heroExclamationCircle',
     //      iconType: 'ng-icon',
     //      color: '#f59e0b',
     //      iconSize: AppConstants.TAB_ICON_SIZE,
     // },
     // {
     //      key: 'unimpairLoan',
     //      label: 'Unimpair Loan',
     //      icon: 'heroCheckCircle',
     //      iconType: 'ng-icon',
     //      color: '#10b981',
     //      iconSize: AppConstants.TAB_ICON_SIZE,
     // },
     {
          key: 'deleteLoan',
          label: 'Delete',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const LOAN_TAB_META: Record<
     LoanConfigTxDisplayType,
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
     createLoan: {
          icon: 'heroPlusCircle',
          colorClass: 'green-button-submenu',
          title: 'Create Loan',
          desc: 'Create a new loan for the selected account.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     // modifyLoan: {
     //      icon: 'heroArrowPath',
     //      colorClass: 'green-button-submenu',
     //      title: 'Modify Loan',
     //      desc: 'Modify a previously created Loan.',
     //      color: '#10b981',
     //      iconType: 'ng-icon',
     //      iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     // },
     payLoan: {
          icon: 'heroArrowDownCircle',
          colorClass: 'green-button-submenu',
          title: 'Pay Loan',
          desc: `Pay exiting loan.`,
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     // defaultLoan: {
     //      icon: 'heroExclamationTriangle',
     //      colorClass: 'green-button-submenu',
     //      title: 'Default Loan',
     //      desc: `Default on a loan payment.`,
     //      color: '#ef4444',
     //      iconType: 'ng-icon',
     //      iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     // },
     // impairLoan: {
     //      icon: 'heroExclamationCircle',
     //      colorClass: 'green-button-submenu',
     //      title: 'Impair Loan',
     //      desc: `Mark a loan as impaired.`,
     //      color: '#f59e0b',
     //      iconType: 'ng-icon',
     //      iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     // },
     // unimpairLoan: {
     //      icon: 'heroCheckCircle',
     //      colorClass: 'green-button-submenu',
     //      title: 'Remove impairment status from a loan.',
     //      desc: `Mark a loan as impaired.`,
     //      color: '#10b981',
     //      iconType: 'ng-icon',
     //      iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     // },
     deleteLoan: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Loan',
          desc: `Delete a previously created loan.`,
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
