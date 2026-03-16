import { AppConstants } from '../../../core/app.constants';

export const BLOCKER_MAP: Record<string, { label: string; route: string; tab?: string }> = {
     RippleState: { label: 'Trust Lines', route: '/trustlines', tab: 'removeTrustline' },
     Offer: { label: 'DEX Offers', route: '/create-offer' },
     Escrow: { label: 'Escrows', route: '/time-escrow', tab: 'cancel' },
     Check: { label: 'Checks', route: '/checks', tab: 'cancel' },
     PayChannel: { label: 'Payment Channels', route: '/payment-channel' },
     Ticket: { label: 'Tickets', route: '/tickets', tab: 'delete' },
     SignerList: { label: 'Signer Lists', route: '/account-configurator', tab: 'modifySignerList' },
     RegularKey: { label: 'Regular Key', route: '/account-configurator', tab: 'modifyRegularKey' },
     NFTokenPage: { label: 'NFTs', route: '/create-nft' },
     PermissionedDomain: { label: 'Permissioned Domains', route: '/permissioned-domain', tab: 'delete' },
     Credential: { label: 'Credentials', route: '/create-credentials', tab: 'delete' },
     DID: { label: 'DID', route: '/did', tab: 'delete' },
};

export const DELETE_ACCOUNT_TAB_META = {
     deleteAccount: {
          icon: 'heroTrash',
          colorClass: 'red-button-submenu',
          title: 'Delete Wallet',
          desc: 'Delete currently selected wallet.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
} as const;

// Note: Fixed typo in description: "currenlty" -> "currently"
