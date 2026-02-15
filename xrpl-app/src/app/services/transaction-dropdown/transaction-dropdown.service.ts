import { Injectable, computed, inject, Signal, signal, effect, WritableSignal } from '@angular/core';
import * as xrpl from 'xrpl';
import { StorageService } from '../local-storage/storage.service';
import { TransactionUiService } from '../transaction-ui/transaction-ui.service';
import { Wallet, WalletManagerService } from '../wallets/manager/wallet-manager.service';
import { DestinationDropdownService } from '../../services/destination-dropdown/destination-dropdown.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Destination, DestinationItem } from '../../models/interface-items.model';

@Injectable({ providedIn: 'root' })
export class TransactionDropdownService {
     private readonly walletManager = inject(WalletManagerService);
     private readonly destinationDropdownService = inject(DestinationDropdownService);
     private readonly txUiService = inject(TransactionUiService);
     private readonly storageService = inject(StorageService);
     public readonly customDestinations = signal<Destination[]>([]);
     selectedDestinationAddress = signal<string>('');
     destinationSearchQuery = signal<string>('');

     readonly wallets: Signal<Wallet[]> = toSignal(this.walletManager.wallets$, { initialValue: [] });

     readonly selectedIndex: Signal<number> = toSignal(this.walletManager.selectedIndex$, { initialValue: 0 });

     readonly currentWallet = computed(() => {
          const index = this.selectedIndex();
          const wallets = this.wallets();
          if (wallets.length === 0 || index < 0 || index >= wallets.length) return null;
          return wallets[index];
     });

     readonly currentAddress = computed(() => this.currentWallet()?.address ?? '');

     loadCustomDestinations() {
          const stored = this.storageService.get('customDestinations');
          if (stored) {
               try {
                    const parsed = JSON.parse(stored);
                    this.customDestinations.set(parsed);
                    console.log('Loaded custom destinations:', parsed.length); // debug
               } catch (e) {
                    console.error('Failed to parse custom destinations', e);
               }
          } else {
               console.log('No custom destinations in storage');
          }
     }

     private saveCustomDestinations() {
          this.storageService.set('customDestinations', JSON.stringify(this.customDestinations()));
          console.log('Saved custom destinations:', this.customDestinations().length);
     }

     allDestinations(
          customDest: Signal<Destination[]>,
          extraWallets?: Signal<Wallet[]> // still optional override
     ) {
          return computed(() => {
               // If you were deriving wallets here — guard it
               const selected = this.currentWallet();
               if (!selected) {
                    return customDest(); // only customs when no wallets
               }
               const baseWallets = extraWallets ? extraWallets() : this.wallets(); // ← now callable!
               const walletDests = baseWallets.map(w => ({
                    name: w.name ?? `Wallet ${w.address.slice(0, 8)}`,
                    address: w.address,
               }));
               return [...walletDests, ...customDest()];
          });
     }

     destinationMap(allDest: Signal<Destination[]>) {
          return computed(() => {
               const map = new Map<string, Destination>();
               allDest().forEach(d => map.set(d.address, d));
               return map;
          });
     }

     destinationItems(allDest: Signal<Destination[]>) {
          return computed(() => {
               const dests = allDest();

               // Safe guard
               if (dests.length === 0) {
                    return [];
               }

               const currentAddr = this.currentAddress(); // now returns null-safe

               console.log('destinationItems recomputed — currentAddr:', currentAddr);

               return dests.map(d => ({
                    id: d.address,
                    display: d.name ?? 'Unknown Wallet',
                    secondary: d.address,
                    isCurrentAccount: d.address === currentAddr && !!currentAddr,
               }));
          });
     }

     selectedDestinationItem(selectedAddr: Signal<string>, destMap: Signal<Map<string, Destination>>, destItems: Signal<DestinationItem[]>) {
          return computed(() => {
               const addr = selectedAddr().trim();
               if (!addr) return null;

               // Prefer map lookup for name
               const dest = destMap().get(addr);
               if (dest) {
                    return {
                         id: dest.address,
                         display: dest.name ?? 'Unknown Wallet',
                         secondary: dest.address,
                         isCurrentAccount: dest.address === this.currentAddress(),
                    };
               }

               // Fallback to items
               return destItems().find(i => i.id === addr) ?? null;
          });
     }

     filteredDestinations(allDest: Signal<Destination[]>, searchQuery: Signal<string>) {
          return computed(() => {
               const q = searchQuery().trim().toLowerCase();
               if (!q) return allDest();

               const current = this.currentAddress();
               return allDest().filter(d => d.address !== current && (d.address.toLowerCase().includes(q) || d.name?.toLowerCase().includes(q)));
          });
     }

     destinationDisplay(selectedAddr: Signal<string>, searchQuery: Signal<string>, destMap: Signal<Map<string, Destination>>) {
          return computed(() => {
               const addr = selectedAddr().trim();
               if (!addr) return searchQuery();

               const dest = destMap().get(addr);
               return dest
                    ? this.destinationDropdownService.formatDisplay(dest) // reuse existing formatter
                    : addr;
          });
     }

     addCustomDestinationIfNew(address: string) {
          const addr = address.trim();
          if (!xrpl.isValidAddress(addr)) return false;
          if (this.customDestinations().some(d => d.address === addr)) return false;

          this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: addr }]);
          this.saveCustomDestinations();
          return true;
     }

     resetDestinationSignals(selectedAddr: { set: (v: string) => void }, searchQuery: { set: (v: string) => void }) {
          selectedAddr.set('');
          searchQuery.set('');
     }

     getFinalDestinationAddress(selectedAddress: Signal<string>, searchQuery: Signal<string>): string {
          let addr = selectedAddress()?.trim() || '';
          if (!addr) {
               const typed = searchQuery()?.trim();
               if (typed && xrpl.isValidAddress(typed)) {
                    addr = typed;
               }
          }
          return addr;
     }

     addCustomIfNewAndSelect(address: string | null, destMap: Signal<Map<string, Destination>>, selectedAddr: WritableSignal<string>, searchQuery: WritableSignal<string>, shouldSelect = true): boolean {
          if (!address) return false;
          const addr = address.trim();
          if (!xrpl.isValidAddress(addr)) return false;

          if (destMap().has(addr)) return false;

          this.customDestinations.update(list => [...list, { name: `Custom ${list.length + 1}`, address: addr }]);
          this.saveCustomDestinations();

          if (shouldSelect) {
               selectedAddr.set(addr);
               searchQuery.set('');
          }

          return true;
     }

     setupAutoSelectOnValidTypedAddress(searchQuery: WritableSignal<string>, selectedAddress: WritableSignal<string>, destinationMap: Signal<Map<string, Destination>>) {
          effect(() => {
               const typedRaw = searchQuery();
               if (!typedRaw) return;

               const typed = typedRaw.trim();
               if (!xrpl.isValidAddress(typed)) return;
               if (typed === selectedAddress()) return;

               if (!destinationMap().has(typed)) {
                    selectedAddress.set(typed);
               }
          });
     }

     resetDestinationInputs(searchQuery: WritableSignal<string>, selectedAddress: WritableSignal<string>) {
          searchQuery.set('');
          selectedAddress.set('');
     }
}
