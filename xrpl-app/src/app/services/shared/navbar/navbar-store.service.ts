import { Injectable, signal, computed, inject } from '@angular/core';
import { StorageService } from '../local-storage/storage.service';
import { NetworkService } from '../../utils/network/network-service';
import { XrplService } from '../../xrpl-services/xrpl.service';

@Injectable({ providedIn: 'root' })
export class NavbarStore {
     private storageService = inject(StorageService);
     private xrplService = inject(XrplService);
     private networkService = inject(NetworkService);

     selectedNetwork = signal('Devnet');
     networkColor = signal('#10b981');

     dropdowns = signal({
          network: false,
          accounts: false,
          escrows: false,
          nft: false,
          mpt: false,
     });

     transactionInput = signal('');
     loading = signal(false);

     connectionStatus = computed(() => this.xrplService.connectionStatus$());
     connectionMessage = computed(() => this.xrplService.connectionMessage$());

     constructor() {}

     toggleDropdown(name: keyof ReturnType<typeof this.dropdowns>) {
          this.dropdowns.update(d => ({
               ...d,
               [name]: !d[name],
               // close others
               network: name === 'network' ? !d.network : false,
               accounts: name === 'accounts' ? !d.accounts : false,
               escrows: name === 'escrows' ? !d.escrows : false,
               nft: name === 'nft' ? !d.nft : false,
               mpt: name === 'mpt' ? !d.mpt : false,
          }));
     }

     async selectNetwork(network: string) {
          const normalized = network.toLowerCase();

          this.selectedNetwork.set(network);
          this.networkColor.set(this.storageService.getNetworkColor(normalized));

          this.storageService.setNet(this.storageService['networkServers'][normalized], normalized);

          await this.xrplService.disconnect();
          this.xrplService.getClient().catch(() => {});

          this.networkService.announceNetworkChange(normalized);

          this.closeAllDropdowns();
     }

     closeAllDropdowns() {
          this.dropdowns.set({
               network: false,
               accounts: false,
               escrows: false,
               nft: false,
               mpt: false,
          });
     }
}
