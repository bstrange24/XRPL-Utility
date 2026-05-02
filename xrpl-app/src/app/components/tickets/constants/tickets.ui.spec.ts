import { AppConstants } from '../../../core/app.constants';
import { TICKET_TABS, TICKET_TAB_META } from './tickets.ui';

describe('Tickets UI Configuration', () => {
     describe('TICKET_TABS', () => {
          it('should have exactly 2 tabs', () => {
               expect(TICKET_TABS.length).toBe(2);
          });

          it('should have createTicket tab configuration', () => {
               const tab = TICKET_TABS.find(t => t.key === 'createTicket');
               expect(tab?.key).toBe('createTicket');
               expect(tab?.label).toBe('Create');
               expect(tab?.icon).toBe('heroTicket');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have deleteTicket tab configuration', () => {
               const tab = TICKET_TABS.find(t => t.key === 'deleteTicket');
               expect(tab?.key).toBe('deleteTicket');
               expect(tab?.label).toBe('Delete');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = TICKET_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               TICKET_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               TICKET_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               TICKET_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('TICKET_TAB_META', () => {
          it('should have metadata for both ticket types', () => {
               expect(Object.keys(TICKET_TAB_META).length).toBe(2);
          });

          describe('createTicket metadata', () => {
               const meta = TICKET_TAB_META.createTicket;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTicket');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Create Ticket');
                    expect(meta.desc).toBe('Create Ticket to another XRPL address.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('deleteTicket metadata', () => {
               const meta = TICKET_TAB_META.deleteTicket;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Delete Ticket');
                    expect(meta.desc).toBe('Delete Ticket to another XRPL address.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['blue-button-submenu', 'red-button-submenu'];
               Object.values(TICKET_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(TICKET_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(TICKET_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce TicketConfigTxDisplayType keys', () => {
               const validKeys = ['createTicket', 'deleteTicket'];
               TICKET_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(TICKET_TABS[0].key).toBe('createTicket');
               expect(TICKET_TAB_META.deleteTicket.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               TICKET_TABS.forEach(tab => {
                    const meta = TICKET_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
