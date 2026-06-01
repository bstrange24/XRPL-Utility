import { Component, computed, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { XrplService } from '../../../services/xrpl-services/xrpl.service';
import { CommonModule } from '@angular/common';
import { NavbarStore } from '../../../services/shared/navbar/navbar-store.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { NetworkModalService } from '../../../services/utils/network-modal/network-modal.service';
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-xrpl-status-bar',
     imports: [CommonModule, NgIcon, LucideAngularModule],
     templateUrl: './xrpl-status-bar.component.html',
     styleUrl: './xrpl-status-bar.component.css',
})
export class XrplStatusBarComponent implements OnInit, OnDestroy {
     private readonly xrplService = inject(XrplService);
     private readonly navbarStore = inject(NavbarStore);
     private readonly toastService = inject(ToastService);
     private readonly networkModalService = inject(NetworkModalService);

     readonly isLedgerReady = computed(() => this.xrplService.isLedgerReady());
     readonly showNetworkModal = this.networkModalService.isOpen;

     // All data from a single source of truth
     private readonly serverInfo: any = null;
     private updateInterval: any = null;
     private isUpdating = false;

     // Signals for UI
     readonly nodeVersion = signal<string>('');
     readonly peerCount = signal<number>(0);
     readonly loadFactor = signal<number>(1);
     readonly reserveBase = signal<number>(10);
     readonly reserveIncrement = signal<number>(2);
     readonly currentLedgerIndex = signal<number | null>(null);

     // Use service signals directly (these are already optimized)
     readonly ledgerIndex = computed(() => this.xrplService.validatedLedgerIndex$() ?? 0);
     readonly serverState = computed(() => this.xrplService.serverState$());
     readonly isConnected = computed(() => this.xrplService.isConnected());
     readonly baseFee = computed(() => this.xrplService.baseFee$());
     readonly closeTime = computed(() => this.xrplService.closeTime$());

     // Banner debouncing
     private bannerTimeout: any = null;
     readonly showSyncBanner = signal<boolean>(false);

     constructor() {
          // Watch for network changes to reset cache
          effect(() => {
               if (this.isConnected()) {
                    this.refreshData();
               }
          });

          effect(() => {
               if (this.showNetworkModal()) {
                    this.focusFirstElement();
               }
          });

          // Watch for sync status and show banner after delay
          effect(() => {
               const shouldShowBanner = this.isConnected() && !this.isLedgerReady();

               // Clear existing timeout
               if (this.bannerTimeout) {
                    clearTimeout(this.bannerTimeout);
               }

               if (shouldShowBanner) {
                    // Show banner after 3 seconds of sustained syncing
                    this.bannerTimeout = setTimeout(() => {
                         if (this.isConnected() && !this.isLedgerReady()) {
                              this.showSyncBanner.set(true);
                         }
                    }, 2000);
               } else {
                    // Hide banner immediately when done syncing
                    this.showSyncBanner.set(false);
               }
          });
     }

     ngOnInit() {
          // Initial fetch with delay to allow connection
          setTimeout(() => {
               if (this.isConnected()) {
                    this.refreshData();
               }
          }, 2000);

          // Start polling interval (30 seconds is plenty for status info)
          this.startPolling();
     }

     ngOnDestroy() {
          if (this.updateInterval) {
               clearInterval(this.updateInterval);
               this.updateInterval = null;
          }

          if (this.bannerTimeout) {
               clearTimeout(this.bannerTimeout);
          }
     }

     readonly ledgerLag = computed(() => {
          const current = this.currentLedgerIndex();
          const validated = this.ledgerIndex();
          if (current && validated) return current - validated;
          return 0;
     });

     readonly formattedCloseTime = computed(() => {
          const xrplCloseTime = this.closeTime();
          if (!xrplCloseTime || xrplCloseTime === 0) return 'Unknown';
          const XRPL_EPOCH_OFFSET = 946684800;
          const unixTimestamp = xrplCloseTime + XRPL_EPOCH_OFFSET;
          const closeDate = new Date(unixTimestamp * 1000);
          const now = new Date();
          const secondsAgo = Math.floor((now.getTime() - closeDate.getTime()) / 1000);
          if (secondsAgo < 0) return 'Just now';
          if (secondsAgo < 60) return `${secondsAgo}s ago`;
          if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;
          if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ${Math.floor((secondsAgo % 3600) / 60)}m ago`;
          return `${Math.floor(secondsAgo / 86400)}d ago`;
     });

     readonly formattedFee = computed(() => {
          const fee = this.baseFee();
          if (!fee) return '10 drops';
          if (fee < 1000) return `${fee} drops`;
          return `${(fee / 1000000).toFixed(6)} XRP`;
     });

     readonly loadIndicator = computed(() => {
          const load = this.loadFactor();
          if (load <= 1) return { text: 'Normal', class: 'text-emerald-400' };
          if (load <= 2) return { text: 'Busy', class: 'text-yellow-400' };
          if (load <= 5) return { text: 'Congested', class: 'text-orange-400' };
          return { text: 'Heavy', class: 'text-red-400' };
     });

     readonly statusTooltip = computed(() => {
          const syncStatus = this.xrplService.ledgerSyncStatus$();
          if (syncStatus === 'not_synced') {
               return 'Node is connected but not fully synced. Please wait for ledger access.';
          }
          if (syncStatus === 'syncing') {
               return 'Node is catching up with the ledger. Please wait.';
          }
          if (syncStatus === 'synced' && this.ledgerIndex()) {
               const nodeVer = this.nodeVersion();
               const nodePart = nodeVer ? ' | Node: ' + nodeVer : '';
               return 'Fully synchronized. Ledger: ' + this.ledgerIndex() + nodePart;
          }
          return this.xrplService.connectionMessage$();
     });

     readonly networkStatusText = computed(() => {
          if (!this.isConnected()) return 'Disconnected';

          const syncStatus = this.xrplService.ledgerSyncStatus$();

          switch (syncStatus) {
               case 'synced':
                    return 'Connected';
               case 'syncing':
                    return 'Syncing...';
               case 'not_synced':
                    return 'Waiting for sync...';
               default:
                    return 'Connected';
          }
     });

     get bannerColors() {
          const network = this.getNetworkName();

          const colors = {
               Mainnet: {
                    borderClass: 'border-red-500/20',
                    dotClass: 'bg-red-500',
                    textClass: 'text-red-400',
                    badgeClass: 'bg-red-500/10',
               },
               Testnet: {
                    borderClass: 'border-amber-500/20',
                    dotClass: 'bg-amber-500',
                    textClass: 'text-amber-400',
                    badgeClass: 'bg-amber-500/10',
               },
               Devnet: {
                    borderClass: 'border-emerald-500/20',
                    dotClass: 'bg-emerald-500',
                    textClass: 'text-emerald-400',
                    badgeClass: 'bg-emerald-500/10',
               },
          };

          return colors[network as keyof typeof colors] ?? colors['Devnet'];
     }

     private startPolling() {
          // Poll every 30 seconds instead of 10
          this.updateInterval = setInterval(() => {
               if (this.isConnected() && !this.isUpdating) {
                    this.refreshData();
               }
          }, 30000);
     }

     private async refreshData() {
          if (this.isUpdating) return;

          this.isUpdating = true;

          try {
               // Single API call to get all necessary data
               const client = await this.xrplService.getClient();
               const response = await client.request({ command: 'server_info' });
               const info = response.result.info;

               // Update all signals from this single response
               this.updateFromServerInfo(info);

               // Get current ledger index (optional, can be derived from server_info)
               if (!this.currentLedgerIndex()) {
                    const currentLedger = await client.request({
                         command: 'ledger',
                         ledger_index: 'current',
                    });
                    this.currentLedgerIndex.set(currentLedger.result.ledger_index);
               }
          } catch (error) {
               console.warn('Failed to refresh status data:', error);
          } finally {
               this.isUpdating = false;
          }
     }

     private updateFromServerInfo(info: any) {
          // Update all metrics from the single server_info response
          if (info.build_version) {
               this.nodeVersion.set(info.build_version);
          }

          if (info.peers !== undefined) {
               this.peerCount.set(info.peers);
          }

          if (info.load_factor !== undefined) {
               this.loadFactor.set(info.load_factor);
          }

          if (info.validated_ledger) {
               const base = info.validated_ledger.reserve_base_xrp;
               const inc = info.validated_ledger.reserve_inc_xrp;
               if (base && inc) {
                    this.reserveBase.set(base);
                    this.reserveIncrement.set(inc);
               }
          }

          // Also update ledger index if available
          if (info.validated_ledger?.seq) {
               // The service will handle this via its own signals
          }
     }

     // Open modal method (can be called from navbar)
     openNetworkSelector(): void {
          this.networkModalService.openModal();
     }

     // Close modal method
     closeNetworkModal(): void {
          this.networkModalService.closeModal();
     }

     getStatusTooltip(): string {
          if (!this.isConnected()) return 'Disconnected from network';
          if (!this.isLedgerReady()) {
               const network = this.getNetworkName();
               return `${network} is syncing. Please wait for ledger access before making transactions.`;
          }
          return `${this.getNetworkName()} - Ready for transactions`;
     }

     getLedgerTooltip(): string {
          if (!this.isLedgerReady()) {
               return 'Ledger is syncing. Transactions may not be available yet.';
          }
          return `Current validated ledger index: ${this.ledgerIndex()}`;
     }

     async selectNetwork(network: 'Devnet' | 'Testnet' | 'Mainnet'): Promise<void> {
          const currentNetwork = this.getNetworkName();

          if (currentNetwork === network) {
               this.closeNetworkModal();
               return;
          }

          // Show confirmation for Mainnet switch
          if (network === 'Mainnet' && currentNetwork !== 'Mainnet') {
               const confirmed = confirm('⚠️ Switching to Mainnet will use real XRP.\n\n' + 'All transactions will have real financial consequences.\n\n' + 'Are you sure you want to continue?');

               if (!confirmed) {
                    this.closeNetworkModal();
                    return;
               }
          }

          try {
               // Update navbar store (this will trigger network change)
               this.navbarStore.selectNetwork(network);

               // Show success toast
               // this.toastService.info(`Switched to ${network} successful`, 3000);

               // Close modal
               this.closeNetworkModal();

               globalThis.dispatchEvent(new CustomEvent('networkChanged', { detail: { network } }));
          } catch (error) {
               console.error('Failed to switch network:', error);
               this.toastService.info(`Failed to switch to ${network}`, 5000);
          }
     }

     getNetworkName(): string {
          return this.xrplService.getNetworkName();
     }

     getFormattedServerState(): string {
          const state = this.serverState();
          switch (state) {
               case 'full':
                    return 'Full';
               case 'proposing':
                    return 'Proposing';
               case 'tracking':
                    return 'Tracking';
               case 'connected':
                    return 'Connected';
               case 'syncing':
                    return 'Syncing';
               default:
                    return state || 'Unknown';
          }
     }

     // Close on Escape anywhere in the modal
     onModalKeyDown(event: KeyboardEvent): void {
          if (event.key === 'Escape') {
               event.preventDefault();
               this.closeNetworkModal();
          }
     }

     private focusFirstElement(): void {
          setTimeout(() => {
               const modal = document.querySelector('[role="dialog"]') as HTMLElement;
               if (modal) {
                    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
                    firstFocusable?.focus();
               }
          }, 100);
     }
}
