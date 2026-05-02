import { AppConstants } from '../../../core/app.constants';
import { DID_TABS, DID_TAB_META } from './did.ui';

describe('DID UI Configuration', () => {
     describe('DID_TABS', () => {
          it('should have exactly 2 tabs', () => {
               expect(DID_TABS.length).toBe(2);
          });

          it('should have setDid tab configuration', () => {
               const tab = DID_TABS.find(t => t.key === 'setDid');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('setDid');
               expect(tab?.label).toBe('Set');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have deleteDid tab configuration', () => {
               const tab = DID_TABS.find(t => t.key === 'deleteDid');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('deleteDid');
               expect(tab?.label).toBe('Delete');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = DID_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               DID_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               DID_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               DID_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });

          it('should have non-empty labels', () => {
               DID_TABS.forEach(tab => {
                    expect(tab.label.length).toBeGreaterThan(0);
               });
          });
     });

     describe('DID_TAB_META', () => {
          it('should have metadata for all DID types', () => {
               expect(Object.keys(DID_TAB_META)).toEqual(['setDid', 'deleteDid']);
               expect(Object.keys(DID_TAB_META).length).toBe(2);
          });

          describe('setDid metadata', () => {
               const meta = DID_TAB_META.setDid;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Set DID');
                    expect(meta.desc).toBe('Set DID for the selected account.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('deleteDid metadata', () => {
               const meta = DID_TAB_META.deleteDid;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Delete DID');
                    expect(meta.desc).toBe('Delete DID for the selected account.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use ng-icon for all meta entries', () => {
               Object.values(DID_TAB_META).forEach(meta => {
                    expect(meta.iconType).toBe('ng-icon');
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(DID_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(DID_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });

          it('should have unique color classes', () => {
               const colorClasses = Object.values(DID_TAB_META).map(m => m.colorClass);
               expect(new Set(colorClasses).size).toBe(colorClasses.length);
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce DidConfigTxDisplayType keys', () => {
               const validKeys = ['setDid', 'deleteDid'];

               DID_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(DID_TABS[0].key).toBe('setDid');
               expect(DID_TABS[1].key).toBe('deleteDid');
               expect(DID_TAB_META.deleteDid.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors between tabs and meta', () => {
               DID_TABS.forEach(tab => {
                    const meta = DID_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
               });
          });

          it('should have matching icons between tabs and meta', () => {
               DID_TABS.forEach(tab => {
                    const meta = DID_TAB_META[tab.key];
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
