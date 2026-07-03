import { Routes } from '@angular/router';

export const routes: Routes = [
     { path: '', redirectTo: '/account-configurator', pathMatch: 'full' },
     { path: 'account-balance-changes', loadComponent: () => import('./components/account-balance-changes/account-balance-changes.component').then(m => m.AccountChangesComponent), data: { title: 'Account Changes' } },
     { path: 'set-hook', loadComponent: () => import('./components/set-hook/set-hook.component').then(m => m.SetHookComponent), data: { title: 'Set Hook' } },
     { path: 'delete-account', loadComponent: () => import('./components/account-delete/account-delete.component').then(m => m.AccountDeleteComponent), data: { title: 'Account Delete' } },
     { path: 'account-configurator', loadComponent: () => import('./components/account-configurator/account-configurator.component').then(m => m.AccountConfiguratorComponent), data: { title: 'Account Configurator' } },
     { path: 'wallet-configurator', loadComponent: () => import('./components/wallet-configurator/wallet-configurator.component').then(m => m.WalletConfiguratorComponent), data: { title: 'Wallet Configurator' } },
     { path: 'create-credentials', loadComponent: () => import('./components/credentials/credentials.component').then(m => m.CreateCredentialsComponent), data: { title: 'Account Credentials' } },
     { path: 'create-did', loadComponent: () => import('./components/did/did.component').then(m => m.DidComponent), data: { title: 'Account DID' } },
     { path: 'permissioned-domain', loadComponent: () => import('./components/permissioned-domain/permissioned-domain.component').then(m => m.PermissionedDomainComponent), data: { title: 'Permissioned Domain' } },
     { path: 'account-delegate', loadComponent: () => import('./components/delegate/delegate.component').then(m => m.AccountDelegateComponent), data: { title: 'Account Delegate' } },
     { path: 'firewall', loadComponent: () => import('./components/firewall/firewall.component').then(m => m.FirewallComponent), data: { title: 'Firewall' } },
     { path: 'sign-transactions', loadComponent: () => import('./components/sign-transactions/sign-transactions.component').then(m => m.SignTransactionsComponent), data: { title: 'Sign Transactions' } },

     { path: 'loan-broker', loadComponent: () => import('./components/loan-broker/loan-broker.component').then(m => m.LoanBrokerComponent), data: { title: 'Broker' } },
     { path: 'loan', loadComponent: () => import('./components/loan/loan.component').then(m => m.LoanComponent), data: { title: 'Loan' } },
     { path: 'vault', loadComponent: () => import('./components/vault/vault.component').then(m => m.VaultComponent), data: { title: 'Vault' } },
     { path: 'send-xrp', loadComponent: () => import('./components/send-xrp/send-xrp.component').then(m => m.SendXrpComponent), data: { title: 'Send XRP' } },
     { path: 'payment-channel', loadComponent: () => import('./components/payment-channel/payment-channel.component').then(m => m.CreatePaymentChannelComponent), data: { title: 'Payment Channel' } },
     { path: 'time-escrow', loadComponent: () => import('./components/escrow/time-based-escrow/time-based-escrow.component').then(m => m.TimeBasedEscrowComponent), data: { title: 'Time Escrow' } },
     { path: 'conditional-escrow', loadComponent: () => import('./components/escrow/conditional-escrow/conditional-escrow.component').then(m => m.ConditionalEscrowComponent), data: { title: 'Conditional Escrow' } },
     { path: 'checks', loadComponent: () => import('./components/checks/checks.component').then(m => m.SendChecksComponent), data: { title: 'Checks' } },
     { path: 'tickets', loadComponent: () => import('./components/tickets/tickets.component').then(m => m.CreateTicketsComponent), data: { title: 'Tickets' } },
     { path: 'create-offer', loadComponent: () => import('./components/offer/offer.component').then(m => m.CreateOfferComponent), data: { title: 'Create Offers' } },
     { path: 'create-nft', loadComponent: () => import('./components/nft-create/nft-create.component').then(m => m.CreateNftComponent), data: { title: 'NFT' } },
     { path: 'nft-offers', loadComponent: () => import('./components/nft-offers/nft-offers.component').then(m => m.NftOffersComponent), data: { title: 'NFT Offers' } },

     { path: 'create-amm', loadComponent: () => import('./components/amm/amm.component').then(m => m.CreateAmmComponent), data: { title: 'AMM' } },
     { path: 'trustlines', loadComponent: () => import('./components/trustlines/trustlines.component').then(m => m.TrustlinesComponent), data: { title: 'Trustlines' } },
     { path: 'mpt', loadComponent: () => import('./components/mpt/mpt.component').then(m => m.MptComponent), data: { title: 'MPT' } },
];
