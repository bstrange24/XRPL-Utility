import { AppConstants } from '../../../core/app.constants';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

export type AccountDeleteTxType = 'deleteAccount';
export type DeleteAccountField = 'accountInfo' | 'accountObjects' | 'serverInfo' | 'blockingObjects' | 'savedTxJson' | 'savedTxResult' | 'regularKeySigningEnabled';

export interface AccountDeleteConfig {
     wallet: Wallet;
     destination: string;
     destinationTag?: any;
     invoiceIdField?: any;
     sourceTagField?: any;
     simulate?: boolean;
     multiSign?: boolean;
     isRegularKeyAddress?: boolean;
     regularKeyAddress?: string;
     regularKeySeed?: string;
     multiSignAddress?: string;
     multiSignSeeds?: string;
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          ledgerInfo: any;
          wallet?: any;
     };
     extra?: Record<string, any>;
}

export type Blocker = {
     label: string;
     count: number;
     route: string;
     tab?: string;
};

export const ACCOUNT_DELETE_TX_TYPES = 'AccountDelete';

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
          desc: 'Delete currenlty selected wallet.',
          color: '',
          iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
     },
};
