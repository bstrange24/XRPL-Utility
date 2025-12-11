import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DropdownItem } from '../../models/dropdown-item.model';

export interface SelectItem {
     id: string;
     display: string;
     secondary?: string;
     isCurrentAccount?: boolean;
}

@Injectable({
     providedIn: 'root',
})
export class DestinationDropdownService {
     private _isOpen = new BehaviorSubject<boolean>(false);
     isOpen$ = this._isOpen.asObservable();

     private _allItems: DropdownItem[] = [];
     private _allSelectedItems: SelectItem[] = [];

     private _filtered = new BehaviorSubject<DropdownItem[]>([]);
     private _filteredSelectedItems = new BehaviorSubject<SelectItem[]>([]);

     filtered$ = this._filtered.asObservable();
     filteredSelectedItems$ = this._filteredSelectedItems.asObservable();

     setItems(items: DropdownItem[]): void {
          this._allItems = items || [];
          this._filtered.next(this._allItems);
     }

     setSelectedItems(items: SelectItem[]): void {
          this._allSelectedItems = items || [];
          this._filteredSelectedItems.next(this._allSelectedItems);
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
          if (!query) {
               this._filtered.next(this._allItems);
               return;
          }
          const q = query.toLowerCase();

          const results = this._allItems.filter(d => (d.name || '').toLowerCase().includes(q) || d.address.toLowerCase().includes(q));
          this._filtered.next(results);
     }

     formatShort(address: string): string {
          if (!address) return '';
          const first = address.slice(0, 6);
          const last = address.slice(-6);
          return `${first}...${last}`;
     }

     formatDisplay(item: DropdownItem): string {
          if (!item.address) return '';
          if (item.name) {
               return `${item.name} (${this.formatShort(item.address)})`;
          }
          return this.formatShort(item.address);
     }

     formatDomainId(id: string): string {
          return `${id.slice(0, 12)}...${id.slice(-10)}`;
     }
}
