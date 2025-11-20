import { Routes } from '@angular/router';
import { CreatePaymentChannelComponent } from './components/payment-channel/payment-channel.component';
import { CreateTimeEscrowComponent } from './components/time-escrow/time-escrow.component';
import { CreateConditionalEscrowComponent } from './components/conditional-escrow/conditional-escrow.component';
import { SendChecksComponent } from './components/checks/checks.component';
import { CreateTicketsComponent } from './components/tickets/tickets.component';
import { CreateOfferComponent } from './components/offer/offer.component';
import { CreateNftComponent } from './components/nft-create/nft-create.component';
import { CreateAmmComponent } from './components/amm/amm.component';
import { TrustlinesComponent } from './components/trustlines/trustlines.component';
import { DeleteAccountComponent } from './components/delete-account/delete-account.component';
import { AccountConfiguratorComponent } from './components/account-configurator/account-configurator.component';
import { CreateCredentialsComponent } from './components/credentials/credentials.component';
import { DidComponent } from './components/did/did.component';
import { AccountChangesComponent } from './components/account-balance-changes/account-balance-changes.component';
import { MptComponent } from './components/mpt/mpt.component';
import { PermissionedDomainComponent } from './components/permissioned-domain/permissioned-domain.component';
import { AccountDelegateComponent } from './components/delegate/delegate.component';
import { FirewallComponent } from './components/firewall/firewall.component';
import { NftOffersComponent } from './components/nft-offers/nft-offers.component';
import { SignTransactionsComponent } from './components/sign-transactions/sign-transactions.component';
import { MptSendComponent } from './components/mpt-send/mpt-send.component';
import { MptLockDestroyComponent } from './components/mpt-lock-destroy/mpt-lock-destroy.component';
import { SendXrpModernComponent } from './components/send-xrp/send-xrp.component';

export const routes: Routes = [
     { path: '', redirectTo: '/account-configurator', pathMatch: 'full' },
     { path: 'account-balance-changes', component: AccountChangesComponent, data: { title: 'Account Changes' } },
     { path: 'delete-account', component: DeleteAccountComponent, data: { title: 'Account Delete' } },
     { path: 'account-configurator', component: AccountConfiguratorComponent, data: { title: 'Account Configurator' } },
     { path: 'create-credentials', component: CreateCredentialsComponent, data: { title: 'Account Credentials' } },
     { path: 'create-did', component: DidComponent, data: { title: 'Account DID' } },
     { path: 'permissioned-domain', component: PermissionedDomainComponent, data: { title: 'Permissioned Domain' } },
     { path: 'account-delegate', component: AccountDelegateComponent, data: { title: 'Account Delegate' } },
     { path: 'firewall', component: FirewallComponent, data: { title: 'Firewall' } },
     { path: 'sign-transactions', component: SignTransactionsComponent, data: { title: 'Sign Transactions' } },

     { path: 'send-xrp', component: SendXrpModernComponent, data: { title: 'Send XRP' } },
     { path: 'payment-channel', component: CreatePaymentChannelComponent, data: { title: 'Payment Channel' } },
     { path: 'time-escrow', component: CreateTimeEscrowComponent, data: { title: 'Time Escrow' } },
     { path: 'conditional-escrow', component: CreateConditionalEscrowComponent, data: { title: 'Conditional Escrow' } },
     { path: 'checks', component: SendChecksComponent, data: { title: 'Checks' } },
     { path: 'tickets', component: CreateTicketsComponent, data: { title: 'Tickets' } },
     { path: 'create-offer', component: CreateOfferComponent, data: { title: 'Create Offers' } },
     { path: 'create-nft', component: CreateNftComponent, data: { title: 'NFT' } },
     { path: 'nft-offers', component: NftOffersComponent, data: { title: 'NFT Offers' } },

     { path: 'create-amm', component: CreateAmmComponent, data: { title: 'AMM' } },
     { path: 'trustlines', component: TrustlinesComponent, data: { title: 'Trustlines' } },
     { path: 'mpt', component: MptComponent, data: { title: 'MPT' } },
     { path: 'mpt-send', component: MptSendComponent, data: { title: 'Send MPT' } },
     { path: 'mpt-lock-destroy', component: MptLockDestroyComponent, data: { title: 'Lock-Destroy MPT' } },
];
