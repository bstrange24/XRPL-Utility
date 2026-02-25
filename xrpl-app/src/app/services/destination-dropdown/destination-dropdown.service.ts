import { Injectable, signal, computed } from '@angular/core';
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
     private readonly _isOpen = signal<boolean>(false);
     readonly isOpen = this._isOpen.asReadonly();

     private readonly _allItems = signal<DropdownItem[]>([]);
     private readonly _allSelectedItems = signal<SelectItem[]>([]);

     // Derived / filtered signals (replacing .next() updates)
     readonly filtered = computed(() => this._allItems());

     readonly filteredSelectedItems = computed(() => this._allSelectedItems());

     setItems(items: DropdownItem[] | null): void {
          this._allItems.set(items ?? []);
     }

     setSelectedItems(items: SelectItem[] | null): void {
          this._allSelectedItems.set(items ?? []);
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
      * Filter the list based on search query
      * Now returns the filtered result instead of pushing to subject
      */
     filter(query: string): DropdownItem[] {
          if (!query?.trim()) {
               const all = this._allItems();
               // Optional: we can keep all items in filtered, or just return them
               return all;
          }

          const q = query.toLowerCase().trim();

          const results = this._allItems().filter(item => (item.name || '').toLowerCase().includes(q) || item.address.toLowerCase().includes(q));

          // If you still want a "filtered" signal that reacts to filter calls,
          // you can add a separate writable signal for filtered state:
          // this._filtered.set(results);

          return results; // ← most components will just use the return value
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

     formatOfferDisplay(offer: any): string {
          return `${offer.Sequence}: Taker Gets: ${offer.TakerGets} → Taker Pays: ${offer.TakerPays}`;
     }
}

// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { DropdownItem } from '../../models/dropdown-item.model';

// export interface SelectItem {
//      id: string;
//      display: string;
//      secondary?: string;
//      isCurrentAccount?: boolean;
// }

// @Injectable({
//      providedIn: 'root',
// })
// export class DestinationDropdownService {
//      private readonly _isOpen = new BehaviorSubject<boolean>(false);
//      isOpen$ = this._isOpen.asObservable();

//      private _allItems: DropdownItem[] = [];
//      private _allSelectedItems: SelectItem[] = [];

//      private readonly _filtered = new BehaviorSubject<DropdownItem[]>([]);
//      private readonly _filteredSelectedItems = new BehaviorSubject<SelectItem[]>([]);

//      filtered$ = this._filtered.asObservable();
//      filteredSelectedItems$ = this._filteredSelectedItems.asObservable();

//      setItems(items: DropdownItem[]): void {
//           this._allItems = items || [];
//           this._filtered.next(this._allItems);
//      }

//      setSelectedItems(items: SelectItem[]): void {
//           this._allSelectedItems = items || [];
//           this._filteredSelectedItems.next(this._allSelectedItems);
//      }

//      openDropdown(): void {
//           this._isOpen.next(true);
//      }

//      closeDropdown(): void {
//           this._isOpen.next(false);
//      }

//      toggleDropdown(): void {
//           this._isOpen.next(!this._isOpen.value);
//      }

//      filter(query: string): void {
//           if (!query) {
//                this._filtered.next(this._allItems);
//                return;
//           }
//           const q = query.toLowerCase();

//           const results = this._allItems.filter(d => (d.name || '').toLowerCase().includes(q) || d.address.toLowerCase().includes(q));
//           this._filtered.next(results);
//      }

//      formatShort(address: string): string {
//           if (!address) return '';
//           const first = address.slice(0, 6);
//           const last = address.slice(-6);
//           return `${first}...${last}`;
//      }

//      formatDisplay(item: DropdownItem): string {
//           if (!item.address) return '';
//           if (item.name) {
//                return `${item.name} (${this.formatShort(item.address)})`;
//           }
//           return this.formatShort(item.address);
//      }

//      formatDomainId(id: string): string {
//           return `${id.slice(0, 12)}...${id.slice(-10)}`;
//      }

//      formatOfferDisplay(offer: any): string {
//           return `${offer.Sequence}: Taker Gets: ${offer.TakerGets} → Taker Pays: ${offer.TakerPays}`;
//      }
// }
