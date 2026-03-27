import { AppConstants } from '../../../core/app.constants';

export const BLOCKER_MAP: Record<string, { label: string; route: string; tab?: string }> = {
     RippleState: { label: 'Trust Lines', route: '/trustlines', tab: 'removeTrustline' },
     Offer: { label: 'DEX Offers', route: '/create-offer' },
     Escrow: { label: 'Escrows', route: '/time-escrow', tab: 'cancelEscrow' },
     Check: { label: 'Checks', route: '/checks', tab: 'cancelCheck' },
     PayChannel: { label: 'Payment Channels', route: '/payment-channel', tab: 'closePaymentChannel' },
     Ticket: { label: 'Tickets', route: '/tickets', tab: 'deleteTickets' },
     SignerList: { label: 'Signer Lists', route: '/account-configurator', tab: 'modifySignerList' },
     RegularKey: { label: 'Regular Key', route: '/account-configurator', tab: 'modifyRegularKey' },
     NFTokenPage: { label: 'NFTs', route: '/create-nft' },
     PermissionedDomain: { label: 'Permissioned Domains', route: '/permissioned-domain', tab: 'deletePermissionedDomain' },
     Credential: { label: 'Credentials', route: '/create-credentials', tab: 'deleteCredentials' },
     DID: { label: 'DID', route: '/did', tab: 'deleteDid' },
};

export const ACCOUNT_DELETE_TAB_META = {
     deleteAccount: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Wallet',
          desc: 'Delete currently selected wallet.',
          color: '',
          iconType: 'ng-icon',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;
