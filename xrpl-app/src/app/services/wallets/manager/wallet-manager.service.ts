import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from '../../local-storage/storage.service';
import { NetworkService } from '../../../components/navbar/navbar.component';

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
     // Internal writable signals
     private readonly _wallets = signal<Wallet[]>([]);
     private readonly _selectedIndex = signal<number>(0);

     // Public readonly API – consumers should use these
     readonly wallets = this._wallets.asReadonly();
     readonly selectedIndex = this._selectedIndex.asReadonly();
     readonly hasWallets = computed(() => this._wallets().length > 0);

     private editingIndex: number | null = null;
     private currentNetwork = 'devnet';

     constructor(
          private readonly storageService: StorageService,
          private readonly networkService: NetworkService
     ) {
          const net = this.storageService.getNet();
          this.currentNetwork = net?.environment || 'devnet';

          this.loadFromStorage();

          // React to network changes (assuming networkChanged$ still exists)
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

          this._wallets.set(wallets);
          console.log('wallets updated:', wallets.length, 'wallets');

          // Load persisted selected index for this network
          const selectedKey = `selectedIndex_${this.currentNetwork}`;
          const storedIndex = this.storageService.get(selectedKey);

          if (storedIndex === null) {
               this._selectedIndex.set(0);
          } else {
               const index = Number.parseInt(storedIndex, 10);
               if (!Number.isNaN(index) && index >= 0 && index < wallets.length) {
                    this._selectedIndex.set(index);
               } else {
                    this._selectedIndex.set(0);
               }
          }
     }

     private saveToStorage(wallets: Wallet[]): void {
          const key = `wallets_${this.currentNetwork}`;
          this.storageService.set(key, JSON.stringify(wallets));
     }

     // Public mutation methods – update internal signals
     updateWallets(wallets: Wallet[]): void {
          this._wallets.set(wallets);
          this.saveToStorage(wallets);
     }

     addWallet(wallet: Wallet): void {
          this._wallets.update(current => [...current, wallet]);
          this.saveToStorage(this._wallets());
     }

     updateWallet(index: number, updates: Partial<Wallet>): void {
          this._wallets.update(wallets => wallets.map((w, i) => (i === index ? { ...w, ...updates } : w)));
          this.saveToStorage(this._wallets());
     }

     updateWalletByAddress(address: string, updates: Partial<Wallet>): void {
          this._wallets.update(wallets =>
               wallets.map(w => {
                    const addr = w.classicAddress || w.address;
                    return addr === address ? { ...w, ...updates } : w;
               })
          );
          this.saveToStorage(this._wallets());
     }

     setWallets(wallets: Wallet[]): void {
          this.updateWallets(wallets);
     }

     deleteWallet(index: number): void {
          this._wallets.update(current => current.filter((_, i) => i !== index));
          this.saveToStorage(this._wallets());

          // Optional: adjust selected index if needed
          if (this._selectedIndex() >= this._wallets().length) {
               this.setSelectedIndex(Math.max(0, this._wallets().length - 1));
          }
     }

     clearWallets(): void {
          this._wallets.set([]);
          this.saveToStorage([]);
          this.setSelectedIndex(0);
     }

     // Editing logic
     startEdit(index: number) {
          this.editingIndex = index;
     }

     saveEdit(newName: string) {
          if (this.editingIndex === null) return;

          const index = this.editingIndex;
          const finalName = newName.trim() || `Wallet ${index + 1}`;

          this._wallets.update(wallets => wallets.map((w, i) => (i === index ? { ...w, name: finalName } : w)));
          this.saveToStorage(this._wallets());

          this.resetEdit();
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

     // Selection
     setSelectedIndex(index: number): void {
          this._selectedIndex.set(index);
          const selectedKey = `selectedIndex_${this.currentNetwork}`;
          this.storageService.set(selectedKey, index.toString());
     }

     getSelectedIndex(): number {
          return this._selectedIndex();
     }

     getSelectedWallet(): Wallet | null {
          const wallets = this._wallets();
          const index = this._selectedIndex();
          if (!wallets.length || index < 0 || index >= wallets.length) {
               return null;
          }
          return wallets[index];
     }

     // Utility
     getDestinationFromDisplay(displayString: string, destinations: any) {
          const match = new RegExp(/\((.+)\)/).exec(displayString);
          if (!match) return null;

          const shortAddr = match[1];
          for (const dest of destinations) {
               const full = dest.address;
               const first = full.slice(0, 6);
               const last = full.slice(-6);
               if (shortAddr === `${first}...${last}`) {
                    return dest;
               }
          }
          return null;
     }
}
