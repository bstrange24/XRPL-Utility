// xrpl-status-bar.component.ts (Optimized)
import { Component, computed, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { XrplService } from '../../../services/xrpl-services/xrpl.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-xrpl-status-bar',
     imports: [CommonModule],
     templateUrl: './xrpl-status-bar.component.html',
     styleUrl: './xrpl-status-bar.component.css',
})
export class XrplStatusBarComponent implements OnInit, OnDestroy {
     private readonly xrplService = inject(XrplService);

     constructor() {
          // Watch for network changes to reset cache
          effect(() => {
               if (this.isConnected()) {
                    this.refreshData();
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
     }

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
               return `Fully synchronized. Ledger: ${this.ledgerIndex()}${nodeVer ? ` | Node: ${nodeVer}` : ''}`;
          }
          return this.xrplService.connectionMessage$();
     });

     readonly networkStatusText = computed(() => {
          if (!this.isConnected()) return 'Disconnected';

          const syncStatus = this.xrplService.ledgerSyncStatus$();
          const ledgerIdx = this.ledgerIndex();

          switch (syncStatus) {
               case 'synced':
                    return ledgerIdx ? 'Connected' : 'Connected';
               case 'syncing':
                    return 'Syncing...';
               case 'not_synced':
                    return 'Waiting for sync...';
               default:
                    return 'Connected';
          }
     });

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
}

// import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
// import { XrplService } from '../../../services/xrpl-services/xrpl.service';
// import { CommonModule } from '@angular/common';

// @Component({
//      selector: 'app-xrpl-status-bar',
//      imports: [CommonModule],
//      templateUrl: './xrpl-status-bar.component.html',
//      styleUrl: './xrpl-status-bar.component.css',
// })
// export class XrplStatusBarComponent implements OnInit, OnDestroy {
//      private readonly xrplService = inject(XrplService);

//      // Make these public (or remove private keyword) so template can access them
//      readonly txPerSecond = signal<number>(0);
//      readonly loadFactor = signal<number>(1);
//      readonly nodeVersion = signal<string>('');
//      readonly reserveBase = signal<number>(10);
//      readonly reserveIncrement = signal<number>(2);
//      readonly validatedTime = signal<string>('');
//      readonly peerCount = signal<number>(0);
//      private updateInterval: any;
//      readonly currentLedgerIndex = signal<number | null>(null);

//      // Use signals directly from the service
//      readonly ledgerIndex = computed(() => this.xrplService.validatedLedgerIndex$() ?? 0);
//      readonly serverState = computed(() => this.xrplService.serverState$());
//      readonly isConnected = computed(() => this.xrplService.isConnected());
//      readonly baseFee = computed(() => this.xrplService.baseFee$());
//      readonly closeTime = computed(() => this.xrplService.closeTime$());
//      readonly validatedLedgerIndex = computed(() => this.xrplService.validatedLedgerIndex$() ?? 0);

//      readonly ledgerLag = computed(() => {
//           const current = this.currentLedgerIndex();
//           const validated = this.validatedLedgerIndex();
//           if (current && validated) return current - validated;
//           return 0;
//      });

//      // Network status text
//      readonly networkStatusText = computed(() => {
//           if (!this.isConnected()) return 'Disconnected';

//           const syncStatus = this.xrplService.ledgerSyncStatus$();
//           const ledgerIdx = this.ledgerIndex();

//           switch (syncStatus) {
//                case 'synced':
//                     return ledgerIdx ? 'Connected' : 'Connected';
//                case 'syncing':
//                     return 'Syncing...';
//                case 'not_synced':
//                     return 'Waiting for sync...';
//                default:
//                     return 'Connected';
//           }
//      });

//      // Format close time correctly for XRPL (epoch: January 1, 2000)
//      readonly formattedCloseTime = computed(() => {
//           const xrplCloseTime = this.closeTime();
//           if (!xrplCloseTime || xrplCloseTime === 0) return 'Unknown';

//           // XRPL uses seconds since January 1, 2000 (00:00 UTC)
//           const XRPL_EPOCH_OFFSET = 946684800; // Seconds from 1970 to 2000
//           const unixTimestamp = xrplCloseTime + XRPL_EPOCH_OFFSET;
//           const closeDate = new Date(unixTimestamp * 1000);

//           const now = new Date();
//           const secondsAgo = Math.floor((now.getTime() - closeDate.getTime()) / 1000);

//           // For the current ledger, seconds ago should be small (2-10 seconds typical)
//           if (secondsAgo < 0) return 'Just now';
//           if (secondsAgo < 60) return `${secondsAgo}s ago`;
//           if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;
//           if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ${Math.floor((secondsAgo % 3600) / 60)}m ago`;

//           return `${Math.floor(secondsAgo / 86400)}d ago`;
//      });

//      // Format fee nicely
//      readonly formattedFee = computed(() => {
//           const fee = this.baseFee();
//           if (!fee) return '10 drops';

//           // Most networks use 10-12 drops as base fee
//           if (fee < 1000) {
//                return `${fee} drops`;
//           }

//           // Convert drops to XRP for larger amounts
//           return `${(fee / 1000000).toFixed(6)} XRP`;
//      });

//      readonly loadIndicator = computed(() => {
//           const load = this.loadFactor();
//           if (load <= 1) return { text: 'Normal', class: 'text-emerald-400' };
//           if (load <= 2) return { text: 'Busy', class: 'text-yellow-400' };
//           if (load <= 5) return { text: 'Congested', class: 'text-orange-400' };
//           return { text: 'Heavy', class: 'text-red-400' };
//      });

//      // Get last ledger time for debugging (optional)
//      readonly lastLedgerDateTime = computed(() => {
//           const xrplCloseTime = this.closeTime();
//           if (!xrplCloseTime || xrplCloseTime === 0) return 'Unknown';

//           const XRPL_EPOCH_OFFSET = 946684800;
//           const unixTimestamp = xrplCloseTime + XRPL_EPOCH_OFFSET;
//           return new Date(unixTimestamp * 1000).toLocaleTimeString();
//      });

//      // Status tooltip with more info
//      readonly statusTooltip = computed(() => {
//           const syncStatus = this.xrplService.ledgerSyncStatus$();
//           if (syncStatus === 'not_synced') {
//                return 'Node is connected but not fully synced. Please wait for ledger access.';
//           }
//           if (syncStatus === 'syncing') {
//                return 'Node is catching up with the ledger. Please wait.';
//           }
//           if (syncStatus === 'synced' && this.ledgerIndex()) {
//                const lastTime = this.lastLedgerDateTime();
//                return `Fully synchronized. Current ledger: ${this.ledgerIndex()}. Last closed: ${lastTime}`;
//           }
//           return this.xrplService.connectionMessage$();
//      });

//      ngOnInit() {
//           console.log('XrplStatusBarComponent initialized');
//           // Small delay to ensure connection is established
//           setTimeout(() => {
//                if (this.isConnected()) {
//                     console.log('Starting metrics collection - connected');
//                     this.startMetricsCollection();
//                } else {
//                     console.log('Not connected yet, waiting...');
//                     // Watch for connection
//                     const checkInterval = setInterval(() => {
//                          if (this.isConnected()) {
//                               console.log('Connection established, starting metrics');
//                               clearInterval(checkInterval);
//                               this.startMetricsCollection();
//                          }
//                     }, 1000);
//                }
//           }, 2000);
//      }

//      ngOnDestroy() {
//           if (this.updateInterval) {
//                clearInterval(this.updateInterval);
//           }
//      }

//      private startMetricsCollection() {
//           // Initial fetch
//           this.updateMetrics();

//           // Update metrics every 10 seconds
//           this.updateInterval = setInterval(() => {
//                if (this.isConnected()) {
//                     this.updateMetrics();
//                }
//           }, 10000);
//      }

//      private async updateMetrics() {
//           try {
//                const client = await this.xrplService.getClient();
//                const serverInfo = await client.request({ command: 'server_info' });
//                const info = serverInfo.result.info;

//                // Always get the latest reserve values from the server
//                if (info.validated_ledger) {
//                     const base = info.validated_ledger.reserve_base_xrp;
//                     const inc = info.validated_ledger.reserve_inc_xrp;

//                     if (base && inc) {
//                          this.reserveBase.set(base);
//                          this.reserveIncrement.set(inc);
//                          console.log(`Reserve values updated: ${base} + ${inc} XRP/obj`);
//                     }
//                }

//                console.log('=== Server Info Debug ===');
//                console.log('Full info object:', info);
//                console.log('build_version:', info.build_version);
//                console.log('peers:', info.peers);
//                console.log('validated_ledger:', info.validated_ledger);

//                // Set load factor
//                this.loadFactor.set(info.load_factor || 1);

//                // Set node version - try multiple possible field names
//                const version = info.build_version || (info as any).rippled_version || '';

//                if (version) {
//                     this.nodeVersion.set(version);
//                     console.log('✅ Node version set to:', version);
//                } else {
//                     console.warn('⚠️ No version field found in server info');
//                     // Try to get version from client capabilities as fallback
//                     try {
//                          const serverState = await client.request({ command: 'server_state' });
//                          if (serverState.result?.state?.build_version) {
//                               this.nodeVersion.set(serverState.result.state.build_version);
//                               console.log('✅ Node version from server_state:', serverState.result.state.build_version);
//                          }
//                     } catch (error: any) {
//                          console.warn('Could not get version from server_state either', error);
//                     }
//                }

//                // Set peer count
//                const peers = info.peers || (info as any).peer_count || (info as any).peers_count || 0;
//                this.peerCount.set(peers);
//                console.log('✅ Peers set to:', peers);

//                // Set reserve information from validated_ledger
//                if (info.validated_ledger) {
//                     this.reserveBase.set(info.validated_ledger.reserve_base_xrp || 10);
//                     this.reserveIncrement.set(info.validated_ledger.reserve_inc_xrp || 2);
//                     console.log('✅ Reserve set to:', this.reserveBase(), '+', this.reserveIncrement());
//                } else {
//                     console.warn('⚠️ No validated_ledger in server_info');
//                }

//                // Get current ledger
//                const currentLedger = await client.request({
//                     command: 'ledger',
//                     ledger_index: 'current',
//                });
//                this.currentLedgerIndex.set(currentLedger.result.ledger_index);

//                console.log('=== Metrics Update Complete ===');
//           } catch (error) {
//                console.error('❌ Failed to update metrics:', error);
//           }
//      }

//      // Get network name
//      getNetworkName(): string {
//           return this.xrplService.getNetworkName();
//      }

//      // Format server state for display
//      getFormattedServerState(): string {
//           const state = this.serverState();
//           switch (state) {
//                case 'full':
//                     return 'Full';
//                case 'proposing':
//                     return 'Proposing';
//                case 'tracking':
//                     return 'Tracking';
//                case 'connected':
//                     return 'Connected';
//                case 'syncing':
//                     return 'Syncing';
//                default:
//                     return state || 'Unknown';
//           }
//      }
// }
