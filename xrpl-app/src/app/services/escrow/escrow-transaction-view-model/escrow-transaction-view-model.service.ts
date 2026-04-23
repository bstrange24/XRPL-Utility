import { computed, inject, Injectable, signal } from '@angular/core';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AcccountDataService } from '../../account-data/acccount-data.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { SelectItem } from '../../shared/destination-dropdown/destination-dropdown.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { MptUtilService } from '../../mpt/mpt-util/mpt-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionDropdownService } from '../../transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../wallets/refresh-wallet/refresh-wallets.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { EscrowUtilService } from '../escrow-util/escrow-util.service';
import { EscrowStoreService } from '../escrow-store/escrow-store.service';
import { EscrowActionTypes, EscrowDisplayItem } from '../../../components/escrow/constants/time-escrow.types';
import { EscrowOrchestratorService } from '../escrow-orchestrator/escrow-orchestrator.service';
import { MptStoreService } from '../../mpt/mpt-store/mpt-store.service';

@Injectable({
     providedIn: 'root',
})
export class EscrowTransactionViewModelService {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     private readonly walletDataService = inject(WalletDataService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly txEnvironmentService = inject(TxEnvironmentService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly acccountDataService = inject(AcccountDataService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly escrowUtilService = inject(EscrowUtilService);
     public readonly escrowOrchestrator = inject(EscrowOrchestratorService);
     private readonly walletManager = inject(WalletManagerService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly mptStoreService = inject(MptStoreService);
     readonly activeTab = signal<EscrowActionTypes>('createEscrow');

     readonly selectedDestinationAddress = signal<string>('');
     readonly destinationSearchQuery = signal<string>('');

     // Build destination computed signals once here using TransactionDropdownService
     private readonly _allDestinations = this.transactionDropdownService.allDestinations(this.transactionDropdownService.customDestinations);
     private readonly _destinationMap = this.transactionDropdownService.destinationMap(this._allDestinations);
     private readonly _destinationItems = this.transactionDropdownService.destinationItems(this._allDestinations);
     private readonly _selectedDestinationItem = this.transactionDropdownService.selectedDestinationItem(this.selectedDestinationAddress, this._destinationMap, this._destinationItems);

     // Unwrapped accessors for templates
     destinationItems() {
          return this._destinationItems();
     }
     selectedDestinationItem() {
          return this._selectedDestinationItem();
     }
     destinationSearchQuery_value() {
          return this.destinationSearchQuery();
     }

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.currencyStoreService.balance();

     escrowItems = computed(() => this.escrowUtilService.escrowItems(this.escrowStoreService.allEscrowsRaw(), this.walletManagerService.getSelectedWallet()?.address!, this.activeTab() === 'cancelEscrow'));

     selectedEscrowItem = computed(() => this.escrowUtilService.selectedEscrowItem(this.escrowItems(), this.escrowStoreService.escrowSequenceNumber()));

     selectedIssuerAddress = computed(() => this.currencyStoreService.issuer());

     // Selected currency
     selectedCurrencyItem = computed(() => {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.trustlineCurrencyService.currencyItems().find(item => item.id === code) || null;
     });

     // Selected issuer
     selectedIssuerItem = computed(() => {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     });

     readonly currentWalletData = computed(() => {
          const currentAddr = this.walletManagerService.getSelectedWallet()?.address;
          if (!currentAddr) return null;

          const wallet = this.walletManagerService.wallets().find(w => w.address === currentAddr);
          if (!wallet?.address) return null;

          return {
               address: wallet.address,
               name: wallet.name || wallet.address.slice(0, 10) + '...',
          };
     });

     readonly escrowCount = computed(() => {
          const tab = this.activeTab();
          const address = this.walletManagerService.getSelectedWallet()?.address ?? '';

          if (tab === 'createEscrow') return this.escrowStoreService.existingEscrow().length;
          if (tab === 'finishEscrow') return this.escrowStoreService.allEscrowsRaw().filter(e => e.Destination === address).length;
          if (tab === 'cancelEscrow') return this.escrowStoreService.expiredOrFulfilledEscrows().length;
          return 0;
     });

     readonly escrowsToShow = computed<EscrowDisplayItem[]>(() => {
          const tab = this.activeTab();
          const address = this.walletManagerService.getSelectedWallet()?.address;

          if (!address) return [];

          if (tab === 'createEscrow') {
               // Outgoing escrows created by you
               return this.escrowStoreService.existingEscrow().map(e => ({
                    tab: 'createEscrow',
                    EscrowSequence: e.Sequence?.toString() || 'Unknown',
                    amount: this.utilsService.formatIOUXrpAmountOutstanding(e.Amount),
                    destination: e.Destination,
                    finishAfter: e.FinishAfter ? Number(e.FinishAfter) : undefined,
                    cancelAfter: e.CancelAfter ? Number(e.CancelAfter) : undefined,
                    isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter, tab),
                    id: e.Sequence?.toString() || 'Unknown',
                    display: `${this.utilsService.formatIOUXrpAmountOutstanding(e.Amount)} → ${e.Destination.slice(0, 8)}...`,
                    secondary: `Seq: ${e.Sequence?.toString() || 'Unknown'} • You created • ${e.Destination.slice(0, 8)}...`,
               }));
          }

          if (tab === 'finishEscrow') {
               // Incoming – sent TO you (this is what was working)
               const incoming = this.escrowStoreService.allEscrowsRaw().filter(e => e.Destination === address);

               return incoming.map(e => {
                    const sequence = e.EscrowSequence?.toString() || 'Unknown';
                    const amtStr = this.utilsService.formatIOUXrpAmountOutstanding(e.Amount);
                    return {
                         tab: 'finishEscrow',
                         EscrowSequence: sequence,
                         amount: amtStr,
                         sender: e.Sender,
                         finishAfter: e.FinishAfter ? Number(e.FinishAfter) : undefined,
                         // cancelAfter usually irrelevant for finish, but include if needed
                         cancelAfter: e.CancelAfter ? Number(e.CancelAfter) : undefined,
                         isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter, tab),

                         id: sequence,
                         display: `${amtStr} ← ${e.Sender.slice(0, 8)}...`,
                         secondary: `Seq: ${sequence} • Sent to you`,
                    } satisfies EscrowDisplayItem;
               });
          }

          if (tab === 'cancelEscrow') {
               return this.escrowStoreService.expiredOrFulfilledEscrows().map(e => ({
                    tab: 'cancelEscrow' as const,
                    EscrowSequence: e.EscrowSequence?.toString() || 'Unknown',
                    amount: this.utilsService.formatIOUXrpAmountOutstanding(e.Amount),
                    destination: e.Destination,
                    finishAfter: e.FinishAfter ? Number(e.FinishAfter) : undefined,
                    cancelAfter: e.CancelAfter ? Number(e.CancelAfter) : undefined,
                    isExpired: this.escrowUtilService.isEscrowExpired(e.CancelAfter, e.FinishAfter, tab),
                    // id must match what escrowItems() produces — EscrowSequence, not Sequence
                    id: e.EscrowSequence?.toString() || 'Unknown',
                    display: `${this.utilsService.formatIOUXrpAmountOutstanding(e.Amount)} → ${e.Destination?.slice(0, 8)}...`,
                    secondary: `Seq: ${e.EscrowSequence?.toString() || 'Unknown'} • You created • ${e.Destination?.slice(0, 8)}...`,
                    sender: e.Sender,
               }));
          }

          return [];
     });

     readonly explorerLinks = computed(() => {
          const tab = this.activeTab();
          if (tab !== 'createEscrow') return null;

          const wallet = this.currentWalletData();
          if (!wallet) return null;

          const base = this.txUiService.explorerUrl();
          const addr = wallet.address;

          const links: string[] = [];

          if (this.escrowStoreService.existingEscrow().length > 0) {
               links.push(`<a href="${base}account/${addr}/escrows" target="_blank" rel="noopener" class="xrpl-win-link">View Escrows</a>`);
          }
          if (this.escrowStoreService.existingIOUs().length > 0) {
               links.push(`<a href="${base}account/${addr}/tokens" target="_blank" rel="noopener" class="xrpl-win-link">View IOUs</a>`);
          }
          if (this.mptStoreService.existingMpts().length > 0) {
               links.push(`<a href="${base}account/${addr}/mpts/owned" target="_blank" rel="noopener" class="xrpl-win-link">View MPTs</a>`);
          }

          return links.length > 0 ? links.join(' | ') : null;
     });

     readonly infoData = computed(() => {
          const wallet = this.currentWalletData();
          if (!wallet) return null;

          return {
               walletName: wallet.name,
               escrowCount: this.escrowCount(),
               escrowsToShow: this.escrowsToShow(),
               links: this.explorerLinks(),
               activeTab: this.activeTab(), // keep for template switch if needed
          };
     });

     readonly safeWarningMessage = computed(() => this.txUiService.warningMessage?.replaceAll('<', '&lt;').replaceAll('>', '&gt;') ?? '');

     selectedEscrowIsExpired = computed(() => {
          const seq = this.escrowStoreService.escrowSequenceNumber();
          if (!seq) return false;

          const tab = this.activeTab();

          // Only relevant on finish and cancel tabs
          if (tab !== 'finishEscrow' && tab !== 'cancelEscrow') return false;

          const fullEscrow = this.escrowStoreService.allEscrowsRaw().find((e: any) => e.EscrowSequence?.toString() === seq.toString());

          // If the sequence number doesn't match any loaded escrow, don't show warning
          if (!fullEscrow) return false;

          return this.escrowUtilService.isEscrowExpired(fullEscrow.CancelAfter, fullEscrow.FinishAfter, tab);
     });

     // MPT Dropdown Items
     mptItems = computed(() => this.mptUtilService.computeMptItems(this.escrowStoreService.existingMpts()));

     selectedMptItem = computed(() => this.mptUtilService.computeSelectedMptItem(this.mptItems(), this.mptStoreService.mptIssuanceId()));

     onMptSelected(item: SelectItem | null) {
          this.mptStoreService.setField('mptIssuanceId', item?.id || '');
     }

     public async refreshMpts(forceRefresh = false): Promise<void> {
          if (!this.currentWalletData()) return;

          try {
               const env = await this.txEnvironmentService.getValidatedEnvironment(forceRefresh);
               if (env?.accountObjects) {
                    const mpts = this.mptUtilService.getExistingMpts(env.accountObjects, this.currentWalletData()?.address || '');
                    this.mptStoreService.setField('existingMpts', mpts);
               }
          } catch (e) {
               console.error('refreshMpts failed', e);
          }
     }

     // Add these to EscrowTransactionViewModelService

     selectedFullEscrow = computed(() => {
          const seq = this.escrowStoreService.escrowSequenceNumber();
          if (!seq) return null;

          return this.escrowStoreService.allEscrowsRaw().find((e: any) => e.EscrowSequence?.toString() === seq.toString()) ?? null;
     });

     selectedEscrowSequence = computed(() => this.escrowStoreService.escrowSequenceNumber() ?? '');

     selectedEscrowAmount = computed(() => {
          const escrow = this.selectedFullEscrow();
          return escrow?.Amount ? this.utilsService.formatIOUXrpAmountOutstanding(escrow.Amount) : '';
     });

     selectedEscrowCreator = computed(() => this.selectedFullEscrow()?.Sender ?? '');

     selectedEscrowDestination = computed(() => this.selectedFullEscrow()?.Destination ?? '');
}
