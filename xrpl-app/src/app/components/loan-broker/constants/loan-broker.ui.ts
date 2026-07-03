import { AppConstants } from '../../../core/app.constants';
import { LoanBrokerConfigTxDisplayType } from './loan-broker.constants';

type IconType = 'ng-icon' | 'lucide-icon';

// Tab configuration constants
export const LOAN_BROKER_TABS: {
     key: LoanBrokerConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'createBroker',
          label: 'Create',
          icon: 'heroPlusCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'modifyBroker',
          label: 'Modify Broker',
          icon: 'heroPencilSquare',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'coverWithdraw',
          label: 'Withdraw',
          icon: 'heroArrowUpCircle',
          iconType: 'ng-icon',
          color: '#60a5fa',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'coverDeposit',
          label: 'Deposit',
          icon: 'heroArrowDownCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'coverClawback',
          label: 'Clawback',
          icon: 'heroArrowUturnLeft',
          iconType: 'ng-icon',
          color: '#60a5fa',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'deleteBroker',
          label: 'Delete',
          icon: 'heroArrowDownCircle',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'modifyLoan',
          label: 'Modify Loan',
          icon: 'heroPencilSquare',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'defaultLoan',
          label: 'Default Loan',
          icon: 'heroExclamationTriangle',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'impairLoan',
          label: 'Impair Loan',
          icon: 'heroExclamationCircle',
          iconType: 'ng-icon',
          color: '#f59e0b',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: 'unimpairLoan',
          label: 'Unimpair Loan',
          icon: 'heroCheckCircle',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information constants
export const LOAN_BROKER_TAB_META: Record<
     LoanBrokerConfigTxDisplayType,
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
     createBroker: {
          icon: 'heroPlusCircle',
          colorClass: 'green-button-submenu',
          title: 'Create Loan Broker',
          desc: 'Create a new Loan Broker object linked to a Vault.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     modifyBroker: {
          icon: 'heroPencilSquare',
          colorClass: 'green-button-submenu',
          title: 'Modify Loan Broker',
          desc: `Modify an existing Loan Broker's parameters.`,
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     coverWithdraw: {
          icon: 'heroArrowUpCircle',
          colorClass: 'red-button-submenu',
          title: 'Withdraw First-Loss Capital',
          desc: `Withdraw First-Loss Capital from the Loan Broker.`,
          color: '#60a5fa',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     coverDeposit: {
          icon: 'heroArrowDownCircle',
          colorClass: 'green-button-submenu',
          title: 'Deposit First-Loss Capital',
          desc: `Deposit First-Loss Capital into the Loan Broker.`,
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     coverClawback: {
          icon: 'heroArrowUturnLeft',
          colorClass: 'red-button-submenu',
          title: 'Clawback First-Loss Capital',
          desc: `Clawback First-Loss Capital from the Loan Broker. Only the Issuer can perform this action.`,
          color: '#60a5fa',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     deleteBroker: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Loan Broker',
          desc: `Delete an existing Loan Broker object from the ledger.`,
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     modifyLoan: {
          icon: 'heroArrowPath',
          colorClass: 'green-button-submenu',
          title: 'Modify Loan',
          desc: 'Modify a previously created Loan.',
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     defaultLoan: {
          icon: 'heroExclamationTriangle',
          colorClass: 'green-button-submenu',
          title: 'Default Loan',
          desc: `Default on a loan payment.`,
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     impairLoan: {
          icon: 'heroExclamationCircle',
          colorClass: 'green-button-submenu',
          title: 'Impair Loan',
          desc: `Mark a loan as impaired.`,
          color: '#f59e0b',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     unimpairLoan: {
          icon: 'heroCheckCircle',
          colorClass: 'green-button-submenu',
          title: 'Remove impairment status from a loan.',
          desc: `Mark a loan as impaired.`,
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
