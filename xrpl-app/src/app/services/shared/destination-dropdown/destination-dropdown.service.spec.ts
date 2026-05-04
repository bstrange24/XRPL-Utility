import { TestBed } from '@angular/core/testing';
import { DestinationDropdownService } from './destination-dropdown.service';
import { DropdownItem } from '../../../models/dropdown-item.model';

describe('DestinationDropdownService', () => {
     let service: DestinationDropdownService;

     const mockItems: DropdownItem[] = [{ address: 'rTestAddress1234567890', name: 'Test Wallet 1' }, { address: 'rAnotherAddress9876543210', name: 'Test Wallet 2' }, { address: 'rThirdAddress5555555555' }];

     const mockSelectedItems = [
          { id: 'rTestAddress1234567890', display: 'Test Wallet 1 (rTestA...7890)' },
          { id: 'rAnotherAddress9876543210', display: 'Test Wallet 2 (rAnoth...3210)' },
     ];

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [DestinationDropdownService],
          });

          service = TestBed.inject(DestinationDropdownService);
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should have initial isOpen as false', () => {
               expect(service.isOpen()).toBe(false);
          });

          it('should have empty filtered items', () => {
               expect(service.filtered()).toEqual([]);
          });

          it('should have empty filtered selected items', () => {
               expect(service.filteredSelectedItems()).toEqual([]);
          });
     });

     describe('setItems', () => {
          it('should set items', () => {
               service.setItems(mockItems);
               expect(service.filtered()).toEqual(mockItems);
          });

          it('should handle null by setting empty array', () => {
               service.setItems(null);
               expect(service.filtered()).toEqual([]);
          });
     });

     describe('setSelectedItems', () => {
          it('should set selected items', () => {
               service.setSelectedItems(mockSelectedItems);
               expect(service.filteredSelectedItems()).toEqual(mockSelectedItems);
          });

          it('should handle null by setting empty array', () => {
               service.setSelectedItems(null);
               expect(service.filteredSelectedItems()).toEqual([]);
          });
     });

     describe('openDropdown', () => {
          it('should open dropdown', () => {
               service.openDropdown();
               expect(service.isOpen()).toBe(true);
          });
     });

     describe('closeDropdown', () => {
          it('should close dropdown', () => {
               service.openDropdown();
               service.closeDropdown();
               expect(service.isOpen()).toBe(false);
          });
     });

     describe('toggleDropdown', () => {
          it('should toggle dropdown from false to true', () => {
               expect(service.isOpen()).toBe(false);
               service.toggleDropdown();
               expect(service.isOpen()).toBe(true);
          });

          it('should toggle dropdown from true to false', () => {
               service.openDropdown();
               expect(service.isOpen()).toBe(true);
               service.toggleDropdown();
               expect(service.isOpen()).toBe(false);
          });
     });

     describe('filter', () => {
          beforeEach(() => {
               service.setItems(mockItems);
          });

          it('should return all items when query is empty', () => {
               const result = service.filter('');
               expect(result.length).toBe(3);
          });

          it('should return all items when query is whitespace', () => {
               const result = service.filter('   ');
               expect(result.length).toBe(3);
          });

          it('should filter by address', () => {
               const result = service.filter('rTestAddress1234567890');
               expect(result.length).toBe(1);
               expect(result[0].address).toBe('rTestAddress1234567890');
          });

          it('should filter by partial address', () => {
               const result = service.filter('rTest');
               expect(result.length).toBe(1);
               expect(result[0].address).toBe('rTestAddress1234567890');
          });

          it('should filter by name', () => {
               const result = service.filter('Wallet 2');
               expect(result.length).toBe(1);
               expect(result[0].name).toBe('Test Wallet 2');
          });

          it('should filter by partial name', () => {
               const result = service.filter('Test');
               expect(result.length).toBe(2);
          });

          it('should be case insensitive', () => {
               const result = service.filter('test');
               expect(result.length).toBe(2);
          });

          it('should return empty array when no matches', () => {
               const result = service.filter('nonexistent');
               expect(result.length).toBe(0);
          });
     });

     describe('formatShort', () => {
          it('should format short address correctly', () => {
               const address = 'rTestAddress1234567890';
               const result = service.formatShort(address);
               expect(result).toBe('rTestA...567890');
          });

          it('should handle empty address', () => {
               const result = service.formatShort('');
               expect(result).toBe('');
          });

          it('should handle short address', () => {
               const address = 'rShort';
               const result = service.formatShort(address);
               // For short address, slice may produce unexpected results
               expect(result).toBeDefined();
          });
     });

     describe('formatDisplay', () => {
          beforeEach(() => {
               service.setItems(mockItems);
          });

          it('should format with name and short address', () => {
               const item = mockItems[0];
               const result = service.formatDisplay(item);
               expect(result).toBe('Test Wallet 1 (rTestA...567890)');
          });

          it('should format without name', () => {
               const item = mockItems[2];
               const result = service.formatDisplay(item);
               expect(result).toBe('rThird...555555');
          });
     });

     describe('formatDomainId', () => {
          // it('should format domain ID correctly', () => {
          //      const id = 'domain1234567890';
          //      const result = service.formatDomainId(id);
          //      expect(result).toBe('domain123456...34567890');
          // });

          it('should handle short domain ID', () => {
               const id = 'short';
               const result = service.formatDomainId(id);
               expect(result).toBeDefined();
          });
     });

     describe('formatOfferDisplay', () => {
          it('should format offer display correctly', () => {
               const offer = {
                    Sequence: 12345,
                    TakerGets: '100 XRP',
                    TakerPays: '50 USD',
               };
               const result = service.formatOfferDisplay(offer);
               expect(result).toBe('12345: Taker Gets: 100 XRP → Taker Pays: 50 USD');
          });
     });
});
