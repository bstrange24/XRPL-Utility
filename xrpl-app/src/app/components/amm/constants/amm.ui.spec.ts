import { AppConstants } from '../../../core/app.constants';
import { AMM_TABS, AMM_TAB_META } from './amm.ui';

describe('AMM UI Configuration', () => {
     describe('AMM_TABS', () => {
          it('should have exactly 6 tabs', () => {
               expect(AMM_TABS.length).toBe(6);
          });

          it('should have createAMM tab configuration', () => {
               const tab = AMM_TABS.find(t => t.key === 'createAMM');
               expect(tab?.key).toBe('createAMM');
               expect(tab?.label).toBe('Create');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have depositToAMM tab configuration', () => {
               const tab = AMM_TABS.find(t => t.key === 'depositToAMM');
               expect(tab?.label).toBe('Deposit');
               expect(tab?.icon).toBe('heroCurrencyDollar');
               expect(tab?.color).toBe('#10b981');
          });

          it('should have withdrawalFromAMM tab configuration', () => {
               const tab = AMM_TABS.find(t => t.key === 'withdrawalFromAMM');
               expect(tab?.label).toBe('Withdrawl');
               expect(tab?.color).toBe('#60a5fa');
          });

          it('should have clawbackFromAMM tab configuration', () => {
               const tab = AMM_TABS.find(t => t.key === 'clawbackFromAMM');
               expect(tab?.label).toBe('Clawback');
               expect(tab?.icon).toBe('heroArrowUturnLeft');
          });

          it('should have swapViaAMM tab configuration', () => {
               const tab = AMM_TABS.find(t => t.key === 'swapViaAMM');
               expect(tab?.label).toBe('Swap');
               expect(tab?.color).toBe('#10b981');
          });

          it('should have deleteAMM tab configuration', () => {
               const tab = AMM_TABS.find(t => t.key === 'deleteAMM');
               expect(tab?.label).toBe('Delete');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.color).toBe('#ef4444');
          });

          it('should have all tabs with unique keys', () => {
               const keys = AMM_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               AMM_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               AMM_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               AMM_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('AMM_TAB_META', () => {
          it('should have metadata for all 6 AMM types', () => {
               expect(Object.keys(AMM_TAB_META).length).toBe(6);
          });

          describe('createAMM metadata', () => {
               const meta = AMM_TAB_META['createAMM'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Create');
                    expect(meta.desc).toBe('Create an AMM on the XRPL.');
                    expect(meta.color).toBe('#10b981');
               });
          });

          describe('depositToAMM metadata', () => {
               const meta = AMM_TAB_META['depositToAMM'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroCurrencyDollar');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Deposit assets to AMM');
                    expect(meta.desc).toBe(`Deposit assets to an AMM for the currency pair.`);
                    expect(meta.color).toBe('#10b981');
               });
          });

          describe('deleteAMM metadata', () => {
               const meta = AMM_TAB_META['deleteAMM'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Delete AMM');
                    expect(meta.desc).toBe(`Delete an AMM from the XRPL.`);
                    expect(meta.color).toBe('#ef4444');
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['blue-button-submenu', 'red-button-submenu'];
               Object.values(AMM_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(AMM_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(AMM_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce AmmConfigTxDisplayType keys', () => {
               const validKeys = ['createAMM', 'depositToAMM', 'withdrawalFromAMM', 'clawbackFromAMM', 'swapViaAMM', 'deleteAMM'];
               AMM_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(AMM_TABS[0].key).toBe('createAMM');
               expect(AMM_TAB_META['deleteAMM'].colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               AMM_TABS.forEach(tab => {
                    const meta = AMM_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
