import { AppConstants, IconType } from '../../../core/app.constants';
import { WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES } from './wallet-generator.constants';
import { WalletGeneratorConfigTxDisplayType } from './wallet-generator.types';

// Tabs configuration
export const WALLET_GENERATOR_TABS: {
     key: WalletGeneratorConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.GENERATE,
          label: 'Generate New Wallet',
          icon: 'heroWallet',
          iconType: 'ng-icon',
          color: '#10b981',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_SEED,
          label: 'Derive from Seed',
          icon: 'heroWallet',
          iconType: 'ng-icon',
          color: '#3b82f6',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_MNEMONIC,
          label: 'Derive from Mnemonic',
          icon: 'heroWallet',
          iconType: 'ng-icon',
          color: '#3b82f6',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_SECRET_NUMBERS,
          label: 'Derive from Secret Numbers',
          icon: 'heroWallet',
          iconType: 'ng-icon',
          color: '#3b82f6',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.REMOVE_CUSTOM_WALLETS,
          label: 'Remove Custom Wallets',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '#ef4444',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
];

// Tab meta information
export const WALLET_GENERATOR_TAB_META: Record<
     WalletGeneratorConfigTxDisplayType,
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
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.GENERATE]: {
          icon: 'heroWallet',
          colorClass: 'green-button-submenu',
          title: 'New Wallet Generator',
          desc: `Generate a new XRPL Wallet.`,
          color: '#10b981',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_SEED]: {
          icon: 'heroWallet',
          colorClass: 'blue-button-submenu',
          title: 'Derive Wallet from Seed',
          desc: `Derive an existing XRPL Wallet from a seed.`,
          color: '#3b82f6',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_MNEMONIC]: {
          icon: 'heroWallet',
          colorClass: 'blue-button-submenu',
          title: 'Derive Wallet from Mnemonic',
          desc: `Derive an existing XRPL Wallet from a mnemonic.`,
          color: '#3b82f6',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_SECRET_NUMBERS]: {
          icon: 'heroWallet',
          colorClass: 'blue-button-submenu',
          title: 'Derive Wallet from Secret Numbers',
          desc: `Derive an existing XRPL Wallet from secret numbers.`,
          color: '#3b82f6',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.REMOVE_CUSTOM_WALLETS]: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Remove Custom Wallets',
          desc: `Remove custom wallets entered in the destination dropdown menu.`,
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
};
