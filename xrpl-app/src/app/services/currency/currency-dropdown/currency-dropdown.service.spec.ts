import { TestBed } from '@angular/core/testing';
import { CurrencyDropdownService, CurrencyItem } from './currency-dropdown.service';

describe('CurrencyDropdownService', () => {
     let service: CurrencyDropdownService;

     const mockItems: CurrencyItem[] = [{ code: 'USD' }, { code: 'EUR' }, { code: 'XRP' }, { code: 'BTC' }, { code: 'USDC', isCustom: true }];

     beforeEach(() => {
          TestBed.configureTestingModule({});
          service = TestBed.inject(CurrencyDropdownService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('initial state', () => {
          it('should have isOpen as false', () => {
               expect(service.isOpen()).toBeFalse();
          });

          it('should have empty filtered list', () => {
               expect(service.filtered()).toEqual([]);
          });
     });

     describe('setItems', () => {
          it('should set items and update filtered list', () => {
               service.setItems(mockItems);
               expect(service.filtered()).toEqual(mockItems);
          });

          it('should handle null items', () => {
               service.setItems(null);
               expect(service.filtered()).toEqual([]);
          });

          it('should handle undefined items', () => {
               service.setItems(undefined);
               expect(service.filtered()).toEqual([]);
          });

          it('should handle empty array', () => {
               service.setItems([]);
               expect(service.filtered()).toEqual([]);
          });

          it('should preserve custom property in items', () => {
               service.setItems(mockItems);
               expect(service.filtered()[4].isCustom).toBeTrue();
          });
     });

     describe('openDropdown', () => {
          it('should set isOpen to true', () => {
               service.openDropdown();
               expect(service.isOpen()).toBeTrue();
          });

          it('should do nothing if already open', () => {
               service.openDropdown();
               service.openDropdown();
               expect(service.isOpen()).toBeTrue();
          });
     });

     describe('closeDropdown', () => {
          it('should set isOpen to false', () => {
               service.openDropdown();
               expect(service.isOpen()).toBeTrue();
               service.closeDropdown();
               expect(service.isOpen()).toBeFalse();
          });

          it('should do nothing if already closed', () => {
               service.closeDropdown();
               expect(service.isOpen()).toBeFalse();
          });
     });

     describe('toggleDropdown', () => {
          it('should toggle from false to true', () => {
               expect(service.isOpen()).toBeFalse();
               service.toggleDropdown();
               expect(service.isOpen()).toBeTrue();
          });

          it('should toggle from true to false', () => {
               service.openDropdown();
               expect(service.isOpen()).toBeTrue();
               service.toggleDropdown();
               expect(service.isOpen()).toBeFalse();
          });

          it('should toggle multiple times correctly', () => {
               service.toggleDropdown();
               expect(service.isOpen()).toBeTrue();
               service.toggleDropdown();
               expect(service.isOpen()).toBeFalse();
               service.toggleDropdown();
               expect(service.isOpen()).toBeTrue();
          });
     });

     describe('filter', () => {
          beforeEach(() => {
               service.setItems(mockItems);
          });

          it('should return all items when query is empty', () => {
               service.filter('');
               expect(service.filtered()).toEqual(mockItems);
          });

          it('should return all items when query is null', () => {
               service.filter(null as any);
               expect(service.filtered()).toEqual(mockItems);
          });

          it('should return all items when query is whitespace', () => {
               service.filter('   ');
               expect(service.filtered()).toEqual(mockItems);
          });

          it('should filter items by code (case insensitive)', () => {
               service.filter('us');
               expect(service.filtered()).toEqual([{ code: 'USD' }, { code: 'USDC', isCustom: true }]);
          });

          it('should filter by uppercase query', () => {
               service.filter('XRP');
               expect(service.filtered()).toEqual([{ code: 'XRP' }]);
          });

          it('should filter by lowercase query', () => {
               service.filter('xrp');
               expect(service.filtered()).toEqual([{ code: 'XRP' }]);
          });

          it('should return empty array when no matches', () => {
               service.filter('GBP');
               expect(service.filtered()).toEqual([]);
          });

          it('should handle partial matches', () => {
               service.filter('EU');
               expect(service.filtered()).toEqual([{ code: 'EUR' }]);
          });
     });

     describe('getFiltered', () => {
          beforeEach(() => {
               service.setItems(mockItems);
          });

          it('should return all items when query is empty', () => {
               const result = service.getFiltered('');
               expect(result).toEqual(mockItems);
          });

          it('should return filtered items without mutating state', () => {
               const result = service.getFiltered('US');
               expect(result).toEqual([{ code: 'USD' }, { code: 'USDC', isCustom: true }]);
               // Verify that original filtered state remains unchanged
               expect(service.filtered()).toEqual(mockItems);
          });

          it('should return empty array when no matches', () => {
               const result = service.getFiltered('GBP');
               expect(result).toEqual([]);
          });

          it('should return all items when query is null', () => {
               const result = service.getFiltered(null as any);
               expect(result).toEqual(mockItems);
          });
     });

     describe('Edge Cases', () => {
          it('should handle items with empty code strings', () => {
               const itemsWithEmpty = [{ code: 'USD' }, { code: '' }, { code: 'XRP' }];
               service.setItems(itemsWithEmpty);
               expect(service.filtered().length).toBe(3);
          });

          it('should handle items with duplicate codes', () => {
               const duplicateItems = [{ code: 'USD' }, { code: 'USD' }];
               service.setItems(duplicateItems);
               service.filter('USD');
               expect(service.filtered().length).toBe(2);
          });

          it('should handle filter with special characters', () => {
               const specialItems = [{ code: 'USD$' }, { code: 'EUR€' }];
               service.setItems(specialItems);
               service.filter('$');
               expect(service.filtered()).toEqual([{ code: 'USD$' }]);
          });

          it('should handle filter with numbers', () => {
               const numberItems = [{ code: 'USD123' }, { code: 'EUR456' }];
               service.setItems(numberItems);
               service.filter('123');
               expect(service.filtered()).toEqual([{ code: 'USD123' }]);
          });

          it('should handle very large item list', () => {
               const largeList: CurrencyItem[] = [];
               for (let i = 0; i < 1000; i++) {
                    largeList.push({ code: `CURRENCY${i}` });
               }
               service.setItems(largeList);
               service.filter('CURRENCY500');
               expect(service.filtered().length).toBe(1);
          });

          // it('should preserve isCustom property after filter', () => {
          //      service.filter('USDC');
          //      expect(service.filtered()[0].isCustom).toBeTrue();
          // });
     });

     describe('Signal immutability', () => {
          it('should return readonly signal for isOpen', () => {
               expect(() => (service.isOpen as any).set(true)).toThrow();
          });

          it('should return readonly signal for filtered', () => {
               expect(() => (service.filtered as any).set([])).toThrow();
          });
     });
});
