import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { XrplService } from '../../../services/xrpl-services/xrpl.service';
import { ConnectionGuardService } from '../../../services/shared/connection-guard/connection-guard.service';
import { NavbarStore } from '../../../services/shared/navbar/navbar-store.service';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-connection-status',
     standalone: true,
     imports: [LucideAngularModule, CommonModule],
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

     // In connection-status.component.ts
     statusText = computed(() => {
          if (this.isConnected()) {
               if (!this.isLedgerReady()) {
                    return 'Syncing...';
               }
               const syncStatus = this.xrplService.ledgerSyncStatus$();
               const ledgerIndex = this.xrplService.validatedLedgerIndex$();
               const network = this.xrplService.getNetworkName();

               if (network === 'Mainnet' && ledgerIndex) {
                    return `Connected`;
               }

               switch (syncStatus) {
                    case 'synced':
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
          if (!this.isConnected()) {
               return 'Not connected to XRPL network';
          }
          if (!this.isLedgerReady()) {
               const network = this.xrplService.getNetworkName();
               return `${network} is syncing. Transactions will be available once sync is complete.`;
          }
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
