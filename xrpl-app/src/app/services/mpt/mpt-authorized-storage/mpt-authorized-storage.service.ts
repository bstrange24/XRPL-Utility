import { Injectable } from '@angular/core';

export interface AuthorizedHoldersData {
     [issuanceId: string]: {
          holders: string[];
          lastUpdated: number;
     };
}

@Injectable({
     providedIn: 'root',
})
export class MptAuthorizedStorageService {
     private readonly STORAGE_KEY = 'mpt_authorized_holders';

     constructor() {}

     // Save all authorized holders
     saveAuthorizedHolders(data: AuthorizedHoldersData): void {
          try {
               localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
          } catch (error) {
               console.error('Failed to save authorized holders to localStorage:', error);
          }
     }

     // Load all authorized holders
     loadAuthorizedHolders(): AuthorizedHoldersData {
          try {
               const data = localStorage.getItem(this.STORAGE_KEY);
               if (data) {
                    return JSON.parse(data);
               }
          } catch (error) {
               console.error('Failed to load authorized holders from localStorage:', error);
          }
          return {};
     }

     // Save holders for a specific issuance
     saveHoldersForIssuance(issuanceId: string, holders: string[]): void {
          const allData = this.loadAuthorizedHolders();
          allData[issuanceId] = {
               holders: holders,
               lastUpdated: Date.now(),
          };
          this.saveAuthorizedHolders(allData);
     }

     // Get holders for a specific issuance
     getHoldersForIssuance(issuanceId: string): string[] {
          const allData = this.loadAuthorizedHolders();
          return allData[issuanceId]?.holders || [];
     }

     // Remove holders for a specific issuance (when MPT is destroyed)
     removeIssuance(issuanceId: string): void {
          const allData = this.loadAuthorizedHolders();
          delete allData[issuanceId];
          this.saveAuthorizedHolders(allData);
     }

     // Clear all data (for testing or logout)
     clearAll(): void {
          localStorage.removeItem(this.STORAGE_KEY);
     }

     // Check if data is stale (older than X days)
     isStale(issuanceId: string, maxAgeDays: number = 7): boolean {
          const allData = this.loadAuthorizedHolders();
          const data = allData[issuanceId];
          if (!data) return true;

          const ageInDays = (Date.now() - data.lastUpdated) / (1000 * 60 * 60 * 24);
          return ageInDays > maxAgeDays;
     }
}
