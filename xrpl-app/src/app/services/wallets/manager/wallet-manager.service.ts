import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { StorageService } from '../../local-storage/storage.service';

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
}

@Injectable({
     providedIn: 'root',
})
export class WalletManagerService {
     private walletsSubject = new BehaviorSubject<Wallet[]>([]);
     public wallets$ = this.walletsSubject.asObservable();
     private editingIndex: number | null = null; // Wallet name change state
     private tempName = '';

     constructor(private storageService: StorageService) {
          this.loadFromStorage();
     }

     /** Load wallets from localStorage */
     private loadFromStorage(): void {
          const stored = this.storageService.get('wallets');
          if (stored) {
               try {
                    const parsed = JSON.parse(stored);
                    this.walletsSubject.next(Array.isArray(parsed) ? parsed : []);
               } catch (e) {
                    console.error('Failed to parse wallets from storage', e);
                    this.walletsSubject.next([]);
               }
          }
     }

     /** Get current wallets (snapshot) */
     getWallets(): Wallet[] {
          return this.walletsSubject.value;
     }

     /** Update wallets and persist */
     updateWallets(wallets: Wallet[]): void {
          this.walletsSubject.next(wallets);
          this.storageService.set('wallets', JSON.stringify(wallets));
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
