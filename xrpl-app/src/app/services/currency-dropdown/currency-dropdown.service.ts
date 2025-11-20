// src/app/services/dropdown/currency-dropdown.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CurrencyItem {
     code: string;
     isCustom?: boolean;
}

@Injectable({
     providedIn: 'root',
})
export class CurrencyDropdownService {
     private _isOpen = new BehaviorSubject<boolean>(false);
     isOpen$ = this._isOpen.asObservable();

     private _allItems = new BehaviorSubject<CurrencyItem[]>([]);
     private _filtered = new BehaviorSubject<CurrencyItem[]>([]);
     filtered$ = this._filtered.asObservable();

     setItems(items: CurrencyItem[]): void {
          this._allItems.next(items || []);
          this._filtered.next(items || []);
     }

     openDropdown(): void {
          this._isOpen.next(true);
     }

     closeDropdown(): void {
          this._isOpen.next(false);
     }

     toggleDropdown(): void {
          this._isOpen.next(!this._isOpen.value);
     }

     filter(query: string): void {
          const items = this._allItems.value;
          if (!query?.trim()) {
               this._filtered.next(items);
               return;
          }
          const q = query.toLowerCase();
          const results = items.filter(item => item.code.toLowerCase().includes(q));
          this._filtered.next(results);
     }
}
