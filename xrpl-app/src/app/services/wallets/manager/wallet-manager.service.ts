// import { Injectable, signal, computed } from '@angular/core';
// import { StorageService } from '../../local-storage/storage.service';
// import { NetworkService } from '../../../components/navbar/navbar.component';

// export interface Wallet {
//      name?: string;
//      classicAddress: string;
//      address: string;
//      seed: string;
//      mnemonic?: string;
//      secretNumbers?: string;
//      balance?: string;
//      ownerCount?: string;
//      xrpReserves?: string;
//      spendableXrp?: string;
//      showSecret?: boolean;
//      lastUpdated?: any;
//      isIssuer?: boolean;
//      algorithm?: 'ed25519' | 'secp256k1';
//      encryptionAlgorithm?: string;
// }

// @Injectable({
//      providedIn: 'root',
// })
// export class WalletManagerService {
//      // Core state as signals
//      readonly wallets = signal<Wallet[]>([]);
//      readonly selectedIndex = signal<number>(-1); // -1 = no selection

//      // Derived / read-only signals
//      readonly currentWallet = computed(() => {
//           const idx = this.selectedIndex();
//           const list = this.wallets();
//           if (idx < 0 || idx >= list.length) return null;
//           return list[idx];
//      });

//      readonly hasWallets = computed(() => this.wallets().length > 0);

//      private editingIndex = signal<number | null>(null);
//      private currentNetwork = signal<string>('devnet');

//      constructor(
//           private readonly storageService: StorageService,
//           private readonly networkService: NetworkService
//      ) {
//           // Initial network load
//           const net = this.storageService.getNet();
//           this.currentNetwork.set(net?.environment || 'devnet');

//           this.loadFromStorage();

//           // React to network changes
//           this.networkService.networkChanged$.subscribe(network => {
//                this.currentNetwork.set(network);
//                this.loadFromStorage();
//           });
//      }

//      private loadFromStorage(): void {
//           console.log('loadFromStorage called for network:', this.currentNetwork());

//           const key = `wallets_${this.currentNetwork()}`;
//           const stored = this.storageService.get(key);

//           let wallets: Wallet[] = [];

//           if (stored) {
//                try {
//                     const parsed = JSON.parse(stored);
//                     wallets = Array.isArray(parsed) ? parsed : [];
//                } catch (e) {
//                     console.error('Failed to parse wallets from storage', e);
//                }
//           }

//           this.wallets.set(wallets);

//           // Load persisted selected index
//           const selectedKey = `selectedIndex_${this.currentNetwork()}`;
//           const storedIndex = this.storageService.get(selectedKey);
//           let index = 0;

//           if (storedIndex !== null) {
//                const parsed = Number.parseInt(storedIndex, 10);
//                if (!Number.isNaN(parsed) && parsed >= 0 && parsed < wallets.length) {
//                     index = parsed;
//                }
//           }

//           this.selectedIndex.set(index);
//      }

//      private saveWalletsToStorage(): void {
//           const key = `wallets_${this.currentNetwork()}`;
//           this.storageService.set(key, JSON.stringify(this.wallets()));
//      }

//      // Public API – mutation methods
//      addWallet(wallet: Wallet): void {
//           this.wallets.update(list => [...list, wallet]);
//           this.saveWalletsToStorage();
//      }

//      updateWallet(index: number, updates: Partial<Wallet>): void {
//           this.wallets.update(list => list.map((w, i) => (i === index ? { ...w, ...updates } : w)));
//           this.saveWalletsToStorage();
//      }

//      updateWalletByAddress(address: string, updates: Partial<Wallet>): void {
//           this.wallets.update(list =>
//                list.map(w => {
//                     const addr = w.classicAddress || w.address;
//                     return addr === address ? { ...w, ...updates } : w;
//                })
//           );
//           this.saveWalletsToStorage();
//      }

//      setWallets(newWallets: Wallet[]): void {
//           this.wallets.set([...newWallets]); // immutable
//           this.saveWalletsToStorage();
//      }

//      deleteWallet(index: number): void {
//           this.wallets.update(list => list.filter((_, i) => i !== index));
//           // Auto-adjust selected index if needed
//           if (this.selectedIndex() >= this.wallets().length) {
//                this.selectedIndex.set(Math.max(0, this.wallets().length - 1));
//           }
//           this.saveWalletsToStorage();
//      }

//      clearWallets(): void {
//           this.wallets.set([]);
//           this.selectedIndex.set(-1);
//           this.saveWalletsToStorage();
//      }

//      // Editing
//      startEdit(index: number): void {
//           this.editingIndex.set(index);
//      }

//      saveEdit(newName: string): void {
//           const idx = this.editingIndex();
//           if (idx === null) return;

//           const finalName = newName.trim() || `Wallet ${idx + 1}`;

//           this.wallets.update(list => list.map((w, i) => (i === idx ? { ...w, name: finalName } : w)));
//           this.saveWalletsToStorage();

//           this.editingIndex.set(null);
//      }

//      cancelEdit(): void {
//           this.editingIndex.set(null);
//      }

//      isEditing(index: number): boolean {
//           return this.editingIndex() === index;
//      }

//      // Selection
//      setSelectedIndex(index: number): void {
//           const clamped = Math.max(-1, Math.min(index, this.wallets().length - 1));
//           this.selectedIndex.set(clamped);

//           const selectedKey = `selectedIndex_${this.currentNetwork()}`;
//           this.storageService.set(selectedKey, clamped.toString());
//      }

//      getSelectedIndex(): number {
//           return this.selectedIndex();
//      }

//      getSelectedWallet(): Wallet | null {
//           return this.currentWallet();
//      }

//      // Optional: if some old code still needs observable style
//      // You can keep these for gradual migration
//      // wallets$ = toObservable(this.wallets);
//      // selectedIndex$ = toObservable(this.selectedIndex);
//      // hasWallets$ = toObservable(this.hasWallets);
// }

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { StorageService } from '../../local-storage/storage.service';
import { NetworkService } from '../../../components/navbar/navbar.component';
import { distinctUntilChanged, map, shareReplay } from 'rxjs';

export interface Wallet {
     name?: string;
     classicAddress: string;
     address: string;
     seed: string;
     mnemonic?: string;
     secretNumbers?: string;
     balance?: string;
     ownerCount?: string;
     xrpReserves?: string;
     spendableXrp?: string;
     showSecret?: boolean;
     lastUpdated?: any;
     isIssuer?: boolean;
     algorithm?: 'ed25519' | 'secp256k1';
     encryptionAlgorithm?: string;
}

@Injectable({
     providedIn: 'root',
})
export class WalletManagerService {
     private readonly walletsSubject = new BehaviorSubject<Wallet[]>([]);
     private readonly selectedIndexSource = new BehaviorSubject<number>(0);
     public wallets$ = this.walletsSubject.asObservable();
     selectedIndex$ = this.selectedIndexSource.asObservable();
     private editingIndex: number | null = null;
     private readonly tempName = '';
     private currentNetwork = 'devnet';

     public hasWallets$ = this.wallets$.pipe(
          map(w => w.length > 0),
          distinctUntilChanged(),
          shareReplay(1)
     );

     public hasWalletsFromWallets$ = this.wallets$.pipe(
          map((wallets: string | any[]) => wallets.length > 0),
          distinctUntilChanged()
     );

     constructor(
          private readonly storageService: StorageService,
          private readonly networkService: NetworkService
     ) {
          const net = this.storageService.getNet();
          this.currentNetwork = net?.environment || 'devnet';

          this.loadFromStorage();

          this.networkService.networkChanged$.subscribe(network => {
               this.currentNetwork = network;
               this.loadFromStorage();
          });
     }

     private loadFromStorage(): void {
          console.log('loadFromStorage called for network:', this.currentNetwork);
          const key = `wallets_${this.currentNetwork}`;
          const stored = this.storageService.get(key);

          let wallets: Wallet[] = [];

          if (stored) {
               try {
                    const parsed = JSON.parse(stored);
                    wallets = Array.isArray(parsed) ? parsed : [];
               } catch (e) {
                    console.error('Failed to parse wallets from storage', e);
                    wallets = [];
               }
          }

          // THIS IS THE MISSING LINE THAT FIXES EVERYTHING
          this.walletsSubject.next(wallets);
          console.log('wallets$ emitted:', wallets.length, 'wallets');

          // NEW: Load persisted selected index for this network
          const selectedKey = `selectedIndex_${this.currentNetwork}`;
          const storedIndex = this.storageService.get(selectedKey);
          if (storedIndex === null) {
               this.selectedIndexSource.next(0); // Default if none stored
          } else {
               const index = Number.parseInt(storedIndex, 10);
               if (!Number.isNaN(index) && index >= 0 && index < wallets.length) {
                    this.selectedIndexSource.next(index);
               } else {
                    this.selectedIndexSource.next(0); // Fallback to 0 if invalid
               }
          }
     }

     private saveToStorage(wallets: Wallet[]): void {
          const key = `wallets_${this.currentNetwork}`;
          this.storageService.set(key, JSON.stringify(wallets));
     }

     updateWallets(wallets: Wallet[]): void {
          this.walletsSubject.next(wallets);
          this.saveToStorage(wallets);
     }

     getWallets(): Wallet[] {
          return this.walletsSubject.value;
     }

     addWallet(wallet: Wallet): void {
          const wallets = [...this.getWallets(), wallet];
          this.updateWallets(wallets);
     }

     updateWallet(index: number, updates: Partial<Wallet>) {
          const wallets = this.getWallets().map((w, i) => (i === index ? { ...w, ...updates } : w));
          this.setWallets(wallets);
     }

     updateWalletByAddress(address: string, updates: Partial<Wallet>) {
          const wallets = this.getWallets().map(w => {
               const addr = w.classicAddress || w.address;
               return addr === address ? { ...w, ...updates } : w;
          });
          this.setWallets(wallets);
     }

     setWallets(wallets: Wallet[]): void {
          this.updateWallets(wallets);
     }

     deleteWallet(index: number): void {
          const wallets = this.getWallets().filter((_, i) => i !== index);
          this.updateWallets(wallets);
     }

     clearWallets(): void {
          this.updateWallets([]);
     }

     startEdit(index: number) {
          this.editingIndex = index;
     }

     saveEdit(newName: string) {
          if (this.editingIndex === null) return;

          const index = this.editingIndex;
          const finalName = newName.trim() || `Wallet ${index + 1}`;
          const wallets = this.getWallets().map((w, i) => (i === index ? { ...w, name: finalName } : w));

          this.updateWallets(wallets);
          setTimeout(() => this.resetEdit(), 0);
     }

     cancelEdit() {
          this.resetEdit();
     }

     private resetEdit() {
          this.editingIndex = null;
     }

     isEditing(index: number): boolean {
          return this.editingIndex === index;
     }

     getTempName(): string {
          return this.tempName;
     }

     setSelectedIndex(index: number) {
          this.selectedIndexSource.next(index);
          const selectedKey = `selectedIndex_${this.currentNetwork}`;
          this.storageService.set(selectedKey, index.toString());
     }

     getSelectedIndex(): number {
          return this.selectedIndexSource.value;
     }

     getDestinationFromDisplay(displayString: string, destinations: any) {
          // Extract the short form inside parentheses: r4sTo7...Vze2Jh
          const match = displayString.match(/\((.+)\)/);
          if (!match) return null;

          const shortAddr = match[1]; // r4sTo7...Vze2Jh

          // Loop all destinations and look for a match
          for (const dest of destinations) {
               const full = dest.address;
               const first = full.slice(0, 6);
               const last = full.slice(-6);

               if (shortAddr === `${first}...${last}`) {
                    return dest; // Found it
               }
          }

          return null; // No match
     }

     getSelectedWallet(): Wallet | null {
          const wallets = this.walletsSubject.value;
          const index = this.selectedIndexSource.value;
          if (!wallets.length || index < 0 || index >= wallets.length) {
               return null; // ← changed: no throw when no wallets or invalid index
          }
          return wallets[index];
     }
}
