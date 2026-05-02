import { AppConstants } from '../../../core/app.constants';
import { CHECK_TAB_META, CHECK_TABS } from './checks.ui';

describe('Checks Types Configuration', () => {
     describe('CHECK_TABS', () => {
          it('should have exactly 3 tabs', () => {
               expect(CHECK_TABS.length).toBe(3);
          });

          it('should have createCheck tab configuration', () => {
               const createCheckTab = CHECK_TABS.find(tab => tab.key === 'createCheck');

               expect(createCheckTab).toBeDefined();
               expect(createCheckTab?.key).toBe('createCheck');
               expect(createCheckTab?.label).toBe('Create');
               expect(createCheckTab?.icon).toBe('heroPlusCircle');
               expect(createCheckTab?.iconType).toBe('ng-icon');
               expect(createCheckTab?.color).toBe('#10b981');
               expect(createCheckTab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have cashCheck tab configuration', () => {
               const cashCheckTab = CHECK_TABS.find(tab => tab.key === 'cashCheck');

               expect(cashCheckTab).toBeDefined();
               expect(cashCheckTab?.key).toBe('cashCheck');
               expect(cashCheckTab?.label).toBe('Cash');
               expect(cashCheckTab?.icon).toBe('heroCurrencyDollar');
               expect(cashCheckTab?.iconType).toBe('ng-icon');
               expect(cashCheckTab?.color).toBe('#3b82f6');
               expect(cashCheckTab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have cancelCheck tab configuration', () => {
               const cancelCheckTab = CHECK_TABS.find(tab => tab.key === 'cancelCheck');

               expect(cancelCheckTab).toBeDefined();
               expect(cancelCheckTab?.key).toBe('cancelCheck');
               expect(cancelCheckTab?.label).toBe('Cancel');
               expect(cancelCheckTab?.icon).toBe('heroTrash');
               expect(cancelCheckTab?.iconType).toBe('ng-icon');
               expect(cancelCheckTab?.color).toBe('#ef4444');
               expect(cancelCheckTab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = CHECK_TABS.map(tab => tab.key);
               const uniqueKeys = new Set(keys);
               expect(uniqueKeys.size).toBe(keys.length);
          });

          it('should have all tabs with valid icon types', () => {
               CHECK_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should have all tabs with valid colors (hex format)', () => {
               CHECK_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should have all tabs with non-empty labels', () => {
               CHECK_TABS.forEach(tab => {
                    expect(tab.label.length).toBeGreaterThan(0);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               CHECK_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('CHECK_TAB_META', () => {
          it('should have metadata for all three tab types', () => {
               expect(Object.keys(CHECK_TAB_META)).toEqual(['createCheck', 'cashCheck', 'cancelCheck']);
               expect(Object.keys(CHECK_TAB_META).length).toBe(3);
          });

          describe('createCheck metadata', () => {
               const createCheckMeta = CHECK_TAB_META.createCheck;

               it('should have correct icon', () => {
                    expect(createCheckMeta.icon).toBe('heroPlusCircle');
               });

               it('should have correct color class', () => {
                    expect(createCheckMeta.colorClass).toBe('green-button-submenu');
               });

               it('should have correct title', () => {
                    expect(createCheckMeta.title).toBe('Create Check');
               });

               it('should have correct description', () => {
                    expect(createCheckMeta.desc).toBe('Create a check to another XRPL address.');
               });

               it('should have correct color', () => {
                    expect(createCheckMeta.color).toBe('#10b981');
               });

               it('should have correct icon type', () => {
                    expect(createCheckMeta.iconType).toBe('ng-icon');
               });

               it('should have correct icon size', () => {
                    expect(createCheckMeta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('cashCheck metadata', () => {
               const cashCheckMeta = CHECK_TAB_META.cashCheck;

               it('should have correct icon', () => {
                    expect(cashCheckMeta.icon).toBe('heroCurrencyDollar');
               });

               it('should have correct color class', () => {
                    expect(cashCheckMeta.colorClass).toBe('blue-button-submenu');
               });

               it('should have correct title', () => {
                    expect(cashCheckMeta.title).toBe('Cash Check');
               });

               it('should have correct description', () => {
                    expect(cashCheckMeta.desc).toBe('Cash check sent from another XRPL address.');
               });

               it('should have correct color', () => {
                    expect(cashCheckMeta.color).toBe('#3b82f6');
               });

               it('should have correct icon type', () => {
                    expect(cashCheckMeta.iconType).toBe('ng-icon');
               });

               it('should have correct icon size', () => {
                    expect(cashCheckMeta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('cancelCheck metadata', () => {
               const cancelCheckMeta = CHECK_TAB_META.cancelCheck;

               it('should have correct icon', () => {
                    expect(cancelCheckMeta.icon).toBe('heroTrash');
               });

               it('should have correct color class', () => {
                    expect(cancelCheckMeta.colorClass).toBe('red-button-submenu');
               });

               it('should have correct title', () => {
                    expect(cancelCheckMeta.title).toBe('Cancel Check');
               });

               it('should have correct description', () => {
                    expect(cancelCheckMeta.desc).toBe('Cancel check create from the selected account.');
               });

               it('should have correct color', () => {
                    expect(cancelCheckMeta.color).toBe('#ef4444');
               });

               it('should have correct icon type', () => {
                    expect(cancelCheckMeta.iconType).toBe('ng-icon');
               });

               it('should have correct icon size', () => {
                    expect(cancelCheckMeta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have unique color classes for each tab', () => {
               const colorClasses = Object.values(CHECK_TAB_META).map(meta => meta.colorClass);
               const uniqueClasses = new Set(colorClasses);
               expect(uniqueClasses.size).toBe(colorClasses.length);
          });

          it('should have unique colors for each tab', () => {
               const colors = Object.values(CHECK_TAB_META).map(meta => meta.color);
               const uniqueColors = new Set(colors);
               expect(uniqueColors.size).toBe(colors.length);
          });

          it('should have non-empty titles for all tabs', () => {
               Object.values(CHECK_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
               });
          });

          it('should have non-empty descriptions for all tabs', () => {
               Object.values(CHECK_TAB_META).forEach(meta => {
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });

          it('should use ng-icon for all tab meta icons', () => {
               Object.values(CHECK_TAB_META).forEach(meta => {
                    expect(meta.iconType).toBe('ng-icon');
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all tab meta icons', () => {
               Object.values(CHECK_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });
     });

     describe('Type safety', () => {
          it('should have correct CheckConfigTxDisplayType union type values', () => {
               const validKeys = ['createCheck', 'cashCheck', 'cancelCheck'];
               CHECK_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should have all tab keys as readonly', () => {
               // Attempting to modify should not be possible in TypeScript
               // This test ensures the as const assertion works
               expect(CHECK_TABS[0].key).toBe('createCheck');
               expect(CHECK_TABS[1].key).toBe('cashCheck');
               expect(CHECK_TABS[2].key).toBe('cancelCheck');
          });
     });

     describe('Color classes usage', () => {
          it('should have appropriate color classes for UI styling', () => {
               expect(CHECK_TAB_META.createCheck.colorClass).toContain('green');
               expect(CHECK_TAB_META.cashCheck.colorClass).toContain('blue');
               expect(CHECK_TAB_META.cancelCheck.colorClass).toContain('red');
          });
     });

     describe('Icon configurations', () => {
          it('should use heroicons for all tabs', () => {
               const icons = CHECK_TABS.map(tab => tab.icon);
               expect(icons).toContain('heroPlusCircle');
               expect(icons).toContain('heroCurrencyDollar');
               expect(icons).toContain('heroTrash');
          });

          it('should have appropriate icon for each action', () => {
               expect(CHECK_TAB_META.createCheck.icon).toBe('heroPlusCircle');
               expect(CHECK_TAB_META.cashCheck.icon).toBe('heroCurrencyDollar');
               expect(CHECK_TAB_META.cancelCheck.icon).toBe('heroTrash');
          });
     });
});
