import { Injectable, signal } from '@angular/core';

export interface CurrencyItem {
     code: string;
     isCustom?: boolean;
}

@Injectable({
     providedIn: 'root',
})
export class CurrencyDropdownService {
     private readonly _isOpen = signal<boolean>(false);
     readonly isOpen = this._isOpen.asReadonly();

     private readonly _allItems = signal<CurrencyItem[]>([]);
     private readonly _filtered = signal<CurrencyItem[]>([]);

     // Public readonly access
     readonly filtered = this._filtered.asReadonly();

     setItems(items: CurrencyItem[] | null | undefined): void {
          const safeItems = items ?? [];
          this._allItems.set(safeItems);
          this._filtered.set(safeItems); // reset filtered to full list
     }

     openDropdown(): void {
          this._isOpen.set(true);
     }

     closeDropdown(): void {
          this._isOpen.set(false);
     }

     toggleDropdown(): void {
          this._isOpen.update(open => !open);
     }

     /**
      * Filters items based on query and updates the filtered signal
      */
     filter(query: string): void {
          const items = this._allItems();

          if (!query?.trim()) {
               this._filtered.set(items);
               return;
          }

          const q = query.toLowerCase().trim();
          const results = items.filter(item => item.code.toLowerCase().includes(q));

          this._filtered.set(results);
     }

     // Optional: if you want a version that returns the result instead of mutating state
     getFiltered(query: string): CurrencyItem[] {
          const items = this._allItems();

          if (!query?.trim()) {
               return items;
          }

          const q = query.toLowerCase().trim();
          return items.filter(item => item.code.toLowerCase().includes(q));
     }
}
