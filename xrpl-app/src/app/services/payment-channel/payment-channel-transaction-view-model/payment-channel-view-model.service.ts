import { computed, inject, Injectable, signal } from '@angular/core';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PaymentChannelOrchestratorService } from '../payment-channel-orchestrator/payment-channel-orchestrator.service';
import { PaymentChannelUtilService } from '../payment-channel-util/payment-channel-util.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { PaymentChannelActionTypes, UnifiedPaymentChannel } from '../../../components/payment-channel/constants/payment-channel.types';
import { PaymentChannelStoreService } from '../payment-channel-store/payment-channel-store.service';

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelViewModelService {
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly paymentChannelUtilService = inject(PaymentChannelUtilService);
     public readonly paymentChannelOrchestratorService = inject(PaymentChannelOrchestratorService);
     public readonly paymentChannelStoreService = inject(PaymentChannelStoreService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly txUiService = inject(TransactionUiService);
     readonly activeTab = signal<PaymentChannelActionTypes>('createPaymentChannel');

     private readonly selectedChannelId = computed(() => this.paymentChannelStoreService.channelIDField()?.toString() ?? '');

     infoData = computed(() => {
          const wallet = this.walletManagerService.getSelectedWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const tab = this.activeTab();

          let channels: any[] = [];

          if (tab === 'claimPaymentChannel') {
               channels = this.paymentChannelStoreService.isCreatorMode() ? this.paymentChannelStoreService.existingPaymentChannels() : this.paymentChannelStoreService.receivablePaymentChannels();
          } else if (tab === 'fundPaymentChannel' || tab === 'renewPaymentChannel') {
               channels = this.paymentChannelStoreService.existingPaymentChannels();
          } else if (tab === 'closePaymentChannel') {
               channels = this.paymentChannelStoreService.closablePaymentChannels();
          } else {
               channels = this.paymentChannelStoreService.existingPaymentChannels();
          }

          const channelsToShow = channels.map(ch => ({
               ...ch,
               isExpired: !!ch.isExpired,
          }));

          // ── Build smart header message (this is the tweak you asked for) ──
          let headerMessage = '';

          if (channels.length === 0) {
               if (tab === 'claimPaymentChannel') {
                    headerMessage = this.paymentChannelStoreService.isCreatorMode() ? ' has no payment channels to generate signatures for.' : ' has no payment channels with claimable funds.';
               } else if (tab === 'renewPaymentChannel') {
                    headerMessage = ' has no payment channels to renew.';
               } else if (tab === 'closePaymentChannel') {
                    headerMessage = ' has no payment channels to close.';
               } else if (tab === 'fundPaymentChannel') {
                    headerMessage = ' has no payment channels to fund.';
               } else if (tab === 'createPaymentChannel') {
                    headerMessage = ' has not created any payment channels.';
               } else {
                    headerMessage = ' has no payment channels.';
               }
          } else {
               headerMessage = `has <strong class="object-count">${channels.length}</strong> payment channel${channels.length === 1 ? '' : 's'} `;

               switch (tab) {
                    case 'createPaymentChannel':
                         headerMessage += 'created.';
                         break;
                    case 'fundPaymentChannel':
                         headerMessage += 'available for funding.';
                         break;
                    case 'claimPaymentChannel':
                         headerMessage += this.paymentChannelStoreService.isCreatorMode() ? 'for which you can generate claim signatures.' : 'with claimable funds.';
                         break;
                    case 'renewPaymentChannel':
                         headerMessage += 'that can be renewed.';
                         break;
                    case 'closePaymentChannel':
                         headerMessage += 'that can be closed.';
                         break;
                    default:
                         headerMessage += '.';
               }
          }

          return {
               walletName,
               activeTab: tab,
               channelCount: channels.length,
               channelsToShow,
               headerMessage, // ← new field (ready for [innerHTML])
               isCreatorMode: this.paymentChannelStoreService.isCreatorMode(),
          };
     });

     selectedIsOwner = computed(() => {
          const channel = this.selectedChannel();
          return channel?.isOwner ?? false;
     });

     selectedChannelForClaim = computed(() => {
          const id = this.paymentChannelStoreService.channelIDField();
          if (!id) return null;
          return this.paymentChannelStoreService.receivablePaymentChannels().find(ch => ch.id === id) ?? null;
     });

     selectedChannelForRenewOrClose = computed(() => this.paymentChannelUtilService.existingChannelMap().get(this.selectedChannelId()) ?? null);

     isCurrentWalletDestination = computed(() => {
          const c = this.selectedChannelForClaim();
          return !!c && c.sender !== this.walletManagerService.getSelectedWallet()?.classicAddress;
     });

     isCurrentWalletSource = computed(() => {
          const c = this.selectedChannelForRenewOrClose();
          return !!c && c.destination !== this.walletManagerService.getSelectedWallet()?.classicAddress;
     });

     hasClaimableChannels = computed(() => this.paymentChannelStoreService.receivablePaymentChannels().length > 0);
     hasRenewableChannels = computed(() => this.paymentChannelStoreService.existingPaymentChannels().length > 0);

     isValidClaimTab = computed(
          () => this.activeTab() === 'claimPaymentChannel' && this.hasClaimableChannels() && !!this.selectedChannelForClaim() && this.selectedChannelForClaim()!.sender !== this.walletManagerService.getSelectedWallet()?.address // destination = current
     );

     isValidRenewTab = computed(
          () => this.activeTab() === 'renewPaymentChannel' && this.hasRenewableChannels() && !!this.selectedChannelForRenewOrClose() && this.selectedChannelForRenewOrClose()!.destination !== this.walletManagerService.getSelectedWallet()?.address // source = current
     );

     selectedChannel = computed(() => {
          const id = this.paymentChannelStoreService.channelIDField();
          if (!id) return null;

          const tab = this.activeTab();

          let list: UnifiedPaymentChannel[] = [];
          if (tab === 'claimPaymentChannel') list = this.paymentChannelStoreService.receivablePaymentChannels();
          else if (tab === 'fundPaymentChannel' || tab === 'renewPaymentChannel') list = this.paymentChannelStoreService.existingPaymentChannels();
          else if (tab === 'closePaymentChannel') list = this.paymentChannelStoreService.closablePaymentChannels();

          return list.find(ch => ch.id === id) ?? null;
     });

     // Unified dropdown items
     channelItems = computed(() => {
          const tab = this.activeTab();

          // Claim tab is special: depends on creator/normal mode
          if (tab === 'claimPaymentChannel') {
               if (this.paymentChannelStoreService.isCreatorMode()) {
                    // Generate Signature (as Creator): show your OWN created channels
                    return this.paymentChannelStoreService.existingPaymentChannels().map(e => this.paymentChannelUtilService.formatChannelItem(e, '→', 'You created'));
               } else {
                    // Normal Claim (as Destination): show receivable/claimable channels
                    return this.paymentChannelStoreService.receivablePaymentChannels().map(e => this.paymentChannelUtilService.formatChannelItem(e, '←', `From ${e.sender?.slice(0, 7)}...${e.sender?.slice(-7) ?? 'unknown'}`));
               }
          }

          // Other tabs (fundPaymentChannel, renewPaymentChannel, closePaymentChannel) - no mode switch needed
          if (tab === 'fundPaymentChannel' || tab === 'renewPaymentChannel') {
               return this.paymentChannelStoreService.existingPaymentChannels().map(e => this.paymentChannelUtilService.formatChannelItem(e, '→', 'You created'));
          }
          if (tab === 'closePaymentChannel') {
               return this.paymentChannelStoreService.closablePaymentChannels().map(e => this.paymentChannelUtilService.formatChannelItem(e, '→', 'You created'));
          }

          // Fallback for create or unknown
          return [];
     });

     selectedIsExpired = computed(() => !!this.selectedChannel()?.isExpired);
     selectedClaimIsExpired = computed(() => this.activeTab() === 'claimPaymentChannel' && this.selectedIsExpired());
     selectedFundIsExpired = computed(() => this.activeTab() === 'fundPaymentChannel' && this.selectedIsExpired());
     selectedRenewIsExpired = computed(() => this.activeTab() === 'renewPaymentChannel' && this.selectedIsExpired());

     selectedChannelItem = computed(() => {
          const id = this.paymentChannelStoreService.channelIDField();
          return this.channelItems().find((i: { id: string }) => i.id === id) ?? null;
     });
}
