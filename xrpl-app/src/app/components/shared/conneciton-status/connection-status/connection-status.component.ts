import { Component, computed, inject } from '@angular/core';
import { ConnectionGuardService } from '../../../../services/connection-guard/connection-guard.service';
import { XrplService } from '../../../../services/xrpl-services/xrpl.service';

@Component({
     selector: 'app-connection-status',
     standalone: true,
     imports: [],
     templateUrl: './connection-status.component.html',
     styleUrl: './connection-status.component.css',
})
export class ConnectionStatusComponent {
     private readonly xrplService = inject(XrplService);
     private readonly connectionGuard = inject(ConnectionGuardService);

     // Computed status values
     isConnected = computed(() => this.xrplService.connectionStatus$() === 'connected');
     isConnecting = computed(() => this.xrplService.connectionStatus$() === 'connecting');
     isDisconnected = computed(() => this.xrplService.connectionStatus$() === 'disconnected');
     statusMessage = computed(() => this.xrplService.connectionMessage$());
     hasPendingOperations = computed(() => this.connectionGuard.hasPendingOperations());

     statusText = computed(() => {
          if (this.isConnected()) return 'Connected';
          if (this.isConnecting()) return 'Connecting...';
          return 'Disconnected';
     });
}
