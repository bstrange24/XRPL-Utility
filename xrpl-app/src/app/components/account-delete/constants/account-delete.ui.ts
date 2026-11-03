import { AppConstants, IconType } from '../../../core/app.constants';
import { AccountDeleteConfigTxDisplayType } from './account-delete.constants';

export const BLOCKER_MAP: Record<string, { label: string; route: string; tab?: string }> = {
     Bridge: { label: 'Cross-Chain Bridges', route: '#' },
     Check: { label: 'Checks', route: '/checks', tab: 'cancelCheck' },
     Escrow: { label: 'Escrows', route: '/time-escrow', tab: 'cancelEscrow' },
     MPToken: { label: 'MPTokens', route: '/mpt', tab: 'destroyMpt' },
     MPTokenIssuance: { label: 'MPToken Issuances', route: '/mpt', tab: 'destroyMpt' },
     NFTokenPage: { label: 'NFTs', route: '/create-nft', tab: 'burnNft' },
     PayChannel: { label: 'Payment Channels', route: '/payment-channel', tab: 'closePaymentChannel' },
     PermissionedDomain: { label: 'Permissioned Domains', route: '/permissioned-domain', tab: 'deletePermissionedDomain' },
     RippleState: { label: 'Trust Lines', route: '/trustlines', tab: 'removeTrustline' },
     Sponsorship: { label: 'Sponsorships', route: '#' },
     Vault: { label: 'Vaults', route: '#' },
     XChainOwnedClaimID: { label: 'Cross-Chain Claims', route: '#' },
     XChainOwnedCreateAccountClaimID: { label: 'Cross-Chain Account Claims', route: '#' },
};

// Tab configuration constants
export const ACCOUNT_DELETE_TABS: {
     key: AccountDeleteConfigTxDisplayType;
     label: string;
     icon: string;
     iconType: IconType;
     color: string;
     iconSize: string;
}[] = [
     {
          key: 'deleteAccount',
          label: 'Delete Account',
          icon: 'heroTrash',
          iconType: 'ng-icon',
          color: '',
          iconSize: AppConstants.TAB_ICON_SIZE,
     },
] as const;

export const ACCOUNT_DELETE_TAB_META = {
     deleteAccount: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Account',
          desc: 'Delete currently selected wallet.',
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
