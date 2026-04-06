import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import * as xrpl from 'xrpl';
import { StorageService } from '../../local-storage/storage.service';
import { NetworkService } from '../../network/network-service';
import { UtilsService } from '../../util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';

@Injectable({ providedIn: 'root' })
export class NavbarStore {
  private storage = inject(StorageService);
  private xrpl = inject(XrplService);
  private networkService = inject(NetworkService);
  private utils = inject(UtilsService);

  // -------------------
  // STATE
  // -------------------
  selectedNetwork = signal('Devnet');
  networkColor = signal('#1a1c21');

  dropdowns = signal({
    network: false,
    accounts: false,
    escrows: false,
    nft: false,
    mpt: false,
  });

  transactionInput = signal('');
  loading = signal(false);

  // -------------------
  // DERIVED STATE
  // -------------------
  connectionStatus = computed(() => this.xrpl.connectionStatus$());
  connectionMessage = computed(() => this.xrpl.connectionMessage$());

  // -------------------
  // EFFECTS
  // -------------------
  constructor() {
  }

  // -------------------
  // ACTIONS
  // -------------------
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
    this.networkColor.set(this.storage.getNetworkColor(normalized));

    this.storage.setNet(this.storage['networkServers'][normalized], normalized);

    await this.xrpl.disconnect();
    this.xrpl.getClient().catch(() => {});

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

  // private handleRoute(url: string) {
  //   const clean = url.split('?')[0];

  //   this.active.set({
  //     accounts: clean.startsWith('/account'),
  //     escrows: clean.includes('escrow'),
  //     nft: clean.includes('nft'),
  //     mpt: clean.includes('mpt'),
  //   });
  // }

  async searchTransaction() {
    const input = this.transactionInput().trim();

    if (!input) return { error: 'Empty input' };

    if (
      !this.utils.isValidTransactionHash(input) &&
      !this.utils.isValidCTID(input) &&
      !xrpl.isValidAddress(input)
    ) {
      return { error: 'Invalid input' };
    }

    this.loading.set(true);

    try {
      const client = await this.xrpl.getClient();

      if (this.utils.isValidTransactionHash(input)) {
        return await client.request({ command: 'tx', transaction: input });
      }

      if (this.utils.isValidCTID(input)) {
        return await client.request({ command: 'tx', ctid: input });
      }

      return await client.request({
        command: 'account_tx',
        account: input,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: 10,
      });

    } finally {
      this.loading.set(false);
    }
  }
}