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
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_SEED,
          label: 'Derive Wallet from Seed',
          icon: 'heroWallet',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_MNEMONIC,
          label: 'Derive Wallet from Mnemonic',
          icon: 'heroWallet',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_SECRET_NUMBERS,
          label: 'Derive Wallet from Secret Numbers',
          icon: 'heroWallet',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
     {
          key: WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.REMOVE_CUSTOM_WALLETS,
          label: 'Remove Custom Wallets',
          icon: 'heroWallet',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

// Tab meta information
export const WALLET_GENERATOR_TAB_META: Record<
     WalletGeneratorConfigTxDisplayType,
     {
          icon: string;
          colorClass: string;
          title: string;
          desc: string;
          color: string;
          iconSize: string;
     }
> = {
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.GENERATE]: {
          icon: 'heroWallet',
          colorClass: 'green-button-submenu',
          title: 'New Wallet Generator',
          desc: `Generate a new XRPL Wallet on {{environment()}}`,
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_SEED]: {
          icon: 'heroWallet',
          colorClass: 'blue-button-submenu',
          title: 'Derive Wallet from Seed',
          desc: `Derive an existing XRPL Wallet from a seed on {{environment()}}`,
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_MNEMONIC]: {
          icon: 'heroWallet',
          colorClass: 'blue-button-submenu',
          title: 'Derive Wallet from Mnemonic',
          desc: `Derive an existing XRPL Wallet from a mnemonic on {{environment()}}`,
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.DERIVE_SECRET_NUMBERS]: {
          icon: 'heroWallet',
          colorClass: 'blue-button-submenu',
          title: 'Derive Wallet from Secret Numbers',
          desc: `Derive an existing XRPL Wallet from secret numbers on {{environment()}}`,
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
     [WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES.REMOVE_CUSTOM_WALLETS]: {
          icon: 'heroWallet',
          colorClass: 'red-button-submenu',
          title: 'Remove Custom Wallets',
          desc: `Remove custom wallets entered in the destination dropdown menu.`,
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;

// Button labels and classes per mode
// export const WALLET_GENERATOR_ACTION_CONFIG: Record<
//      WalletGeneratorTab,
//      {
//           buttonLabel: string;
//           buttonClass: string;
//      }
// > = {
//      setPermissionedDomain: {
//           buttonLabel: 'Set Domain',
//           buttonClass: 'btn-primary',
//      },
//      deletePermissionedDomain: {
//           buttonLabel: 'Delete Domain',
//           buttonClass: 'btn-danger',
//      },
// } as const;
