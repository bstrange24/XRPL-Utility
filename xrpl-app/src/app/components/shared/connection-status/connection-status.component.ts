import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { XrplService } from '../../../services/xrpl-services/xrpl.service';
import { ConnectionGuardService } from '../../../services/shared/connection-guard/connection-guard.service';
import { NavbarStore } from '../../../services/shared/navbar/navbar-store.service';

@Component({
     selector: 'app-connection-status',
     standalone: true,
     imports: [],
     templateUrl: './connection-status.component.html',
     styleUrl: './connection-status.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusComponent {
     private readonly xrplService = inject(XrplService);
     private readonly connectionGuard = inject(ConnectionGuardService);
     public readonly store = inject(NavbarStore);

     // New input to control label visibility
     showLabel = input<boolean>(true);

     // Basic connection states
     isConnected = computed(() => this.xrplService.isConnected());
     isConnecting = computed(() => this.xrplService.isConnecting());
     isDisconnected = computed(() => this.xrplService.isDisconnected());

     // Ledger states (using the computed properties from XrplService)
     isLedgerReady = computed(() => this.xrplService.isLedgerReady());
     isLedgerSyncing = computed(() => this.xrplService.isLedgerSyncing());
     isLedgerNotSynced = computed(() => this.xrplService.isLedgerNotSynced());

     // Get the actual server state for display
     serverState = computed(() => this.xrplService.serverState$());
     hasPendingOperations = computed(() => this.connectionGuard.hasPendingOperations());

     statusText = computed(() => {
          if (this.isConnected()) {
               const syncStatus = this.xrplService.ledgerSyncStatus$();
               const ledgerIndex = this.xrplService.validatedLedgerIndex$();
               const network = this.xrplService.getNetworkName();

               // For Mainnet, always show as connected once we have a ledger
               if (network === 'Mainnet' && ledgerIndex) {
                    // return `Connected (Ledger ${ledgerIndex}) ✓`;
                    return `Connected`;
               }

               switch (syncStatus) {
                    case 'synced':
                         // return ledgerIndex ? `Connected (Ledger ${ledgerIndex}) ✓` : 'Connected ✓';
                         return ledgerIndex ? `Connected` : 'Connected';
                    case 'syncing':
                         return 'Syncing...';
                    case 'not_synced':
                         return 'Waiting for sync...';
                    default:
                         return 'Connected';
               }
          }
          if (this.isConnecting()) return 'Connecting...';
          return 'Disconnected';
     });

     statusMessage = computed(() => {
          const syncStatus = this.xrplService.ledgerSyncStatus$();
          if (syncStatus === 'not_synced') {
               return 'Node is connected but not fully synced. Please wait for ledger access.';
          }
          if (syncStatus === 'syncing') {
               return 'Node is catching up with the ledger. Please wait.';
          }
          if (syncStatus === 'synced') {
               return 'Node is fully synchronized and ready for transactions.';
          }
          return this.xrplService.connectionMessage$();
     });
}
