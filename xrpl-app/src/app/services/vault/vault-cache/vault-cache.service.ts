import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { VaultUtilService } from '../vault-util/vault-util.service';

@Injectable({
     providedIn: 'root',
})
export class VaultCacheService {
     private vaultCache = new Map<string, any>(); // vaultId -> vault data
     private currentWalletAddress: string | null = null;

     /**
      * Set the current wallet address - clears cache when wallet changes
      */
     setWalletAddress(address: string | null): void {
          if (this.currentWalletAddress !== address) {
               this.vaultCache.clear();
               this.currentWalletAddress = address;
          }
     }

     /**
      * Get a vault from the cache by ID
      */
     getVault(vaultId: string): any | null {
          return this.vaultCache.get(vaultId) || null;
     }

     /**
      * Store a vault in the cache
      */
     setVault(vaultId: string, vaultData: any): void {
          if (vaultId && vaultData) {
               this.vaultCache.set(vaultId, vaultData);
          }
     }

     /**
      * Get all cached vaults as an array
      */
     getAllVaults(): any[] {
          return Array.from(this.vaultCache.values());
     }

     /**
      * Check if a vault exists in the cache
      */
     hasVault(vaultId: string): boolean {
          return this.vaultCache.has(vaultId);
     }

     /**
      * Remove a vault from the cache
      */
     removeVault(vaultId: string): void {
          this.vaultCache.delete(vaultId);
     }

     /**
      * Clear all cached vaults
      */
     clear(): void {
          this.vaultCache.clear();
     }

     /**
      * Get the number of cached vaults
      */
     size(): number {
          return this.vaultCache.size;
     }

     /**
      * Update a vault in the cache (for refreshing after transactions)
      */
     updateVault(vaultId: string, vaultData: any): void {
          if (this.vaultCache.has(vaultId) && vaultData) {
               this.vaultCache.set(vaultId, vaultData);
          }
     }

     async refreshVault(client: xrpl.Client, vaultId: string, vaultUtilService: VaultUtilService): Promise<any | null> {
          try {
               const freshVault = await vaultUtilService.getVaultById(client, vaultId);
               if (freshVault) {
                    this.setVault(vaultId, freshVault);
                    return freshVault;
               }
               return null;
          } catch (error) {
               console.error(`Failed to refresh vault ${vaultId}:`, error);
               return null;
          }
     }
}
