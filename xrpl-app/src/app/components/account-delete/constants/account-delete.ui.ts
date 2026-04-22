import { AppConstants, IconType } from '../../../core/app.constants';
import { AccountDeleteConfigTxDisplayType } from './account-delete.constants';

export const BLOCKER_MAP: Record<string, { label: string; route: string; tab?: string }> = {
     RippleState: { label: 'Trust Lines', route: '/trustlines', tab: 'removeTrustline' },
     Offer: { label: 'DEX Offers', route: '/create-offer', tab: 'cancelOffer' },
     Escrow: { label: 'Escrows', route: '/time-escrow', tab: 'cancelEscrow' },
     Check: { label: 'Checks', route: '/checks', tab: 'cancelCheck' },
     PayChannel: { label: 'Payment Channels', route: '/payment-channel', tab: 'closePaymentChannel' },
     Ticket: { label: 'Tickets', route: '/tickets', tab: 'deleteTickets' },
     SignerList: { label: 'Signer Lists', route: '/account-configurator', tab: 'modifySignerList' },
     RegularKey: { label: 'Regular Key', route: '/account-configurator', tab: 'modifyRegularKey' },
     NFTokenPage: { label: 'NFTs', route: '/create-nft', tab: 'burnNft' },
     PermissionedDomain: { label: 'Permissioned Domains', route: '/permissioned-domain', tab: 'deletePermissionedDomain' },
     Credential: { label: 'Credentials', route: '/create-credentials', tab: 'deleteCredentials' },
     DID: { label: 'DID', route: '/create-did', tab: 'deleteDid' },
     MPToken: { label: 'MPToken', route: '/mpt', tab: 'destroyMpt' },
     MPTokenIssuance: { label: 'MPToken Issuance', route: '/mpt', tab: 'destroyMpt' },
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
          label: 'Delete Wallet',
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
          title: 'Delete Wallet',
          desc: 'Delete currently selected wallet.',
          color: '#ef4444',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
