import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
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
     encryptionAlgorithm?: string | '';
}

@Injectable({
     providedIn: 'root',
})
export class WalletManagerService {
     private walletsSubject = new BehaviorSubject<Wallet[]>([]);
     public wallets$ = this.walletsSubject.asObservable();

     private editingIndex: number | null = null; // Wallet name change state
     private tempName = '';
     private currentNetwork = 'devnet';

     constructor(private storageService: StorageService, private networkService: NetworkService) {
          const net = this.storageService.getNet();
          this.currentNetwork = net?.environment || 'devnet';

          this.loadFromStorage();

          // Listen for network switches
          this.networkService.networkChanged$.subscribe(network => {
               this.currentNetwork = network;
               this.loadFromStorage(); // This clears old network wallets instantly
          });
     }

     /** Load wallets from localStorage */
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
     }

     private saveToStorage(wallets: Wallet[]): void {
          const key = `wallets_${this.currentNetwork}`;
          this.storageService.set(key, JSON.stringify(wallets));
     }

     /** Update wallets and persist */

     updateWallets(wallets: Wallet[]): void {
          this.walletsSubject.next(wallets);
          this.saveToStorage(wallets);
     }

     /** Get current wallets (snapshot) */
     getWallets(): Wallet[] {
          return this.walletsSubject.value;
     }

     /** Add a new wallet */
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

     /** Replace entire list */
     setWallets(wallets: Wallet[]): void {
          this.updateWallets(wallets);
     }

     /** Delete passed in wallet */
     deleteWallet(index: number): void {
          const wallets = this.getWallets().filter((_, i) => i !== index);
          this.updateWallets(wallets);
     }

     /** Clear all wallets */
     clearWallets(): void {
          this.updateWallets([]);
     }

     /** Wallet reanaming */
     startEdit(index: number) {
          this.editingIndex = index;
     }

     /** Save the Wallets new name */
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

     /** getter function */
     isEditing(index: number): boolean {
          return this.editingIndex === index;
     }

     /** getter function */
     getTempName(): string {
          return this.tempName;
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
}
