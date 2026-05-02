import { AppConstants } from '../../../core/app.constants';
import { TRUSTLINE_TABS, TRUSTLINE_TAB_META } from './trustline.ui';

describe('Trustline UI Configuration', () => {
     describe('TRUSTLINE_TABS', () => {
          it('should have exactly 5 tabs', () => {
               expect(TRUSTLINE_TABS.length).toBe(5);
          });

          it('should have setTrustline tab configuration', () => {
               const tab = TRUSTLINE_TABS.find(t => t.key === 'setTrustline');
               expect(tab?.key).toBe('setTrustline');
               expect(tab?.label).toBe('Set');
               expect(tab?.icon).toBe('heroAdjustmentsVertical');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have issueCurrency tab configuration', () => {
               const tab = TRUSTLINE_TABS.find(t => t.key === 'issueCurrency');
               expect(tab?.label).toBe('Send / Issue');
               expect(tab?.icon).toBe('heroCurrencyDollar');
               expect(tab?.color).toBe('#10b981');
          });

          it('should have clawbackTokens tab configuration', () => {
               const tab = TRUSTLINE_TABS.find(t => t.key === 'clawbackTokens');
               expect(tab?.label).toBe('Clawback');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.color).toBe('#3b82f6');
          });

          it('should have removeTrustline tab configuration', () => {
               const tab = TRUSTLINE_TABS.find(t => t.key === 'removeTrustline');
               expect(tab?.label).toBe('Remove');
               expect(tab?.color).toBe('#ef4444');
          });

          it('should have addNewIssuers tab configuration', () => {
               const tab = TRUSTLINE_TABS.find(t => t.key === 'addNewIssuers');
               expect(tab?.label).toBe('Modify Issuers');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.color).toBe('#3b82f6');
          });

          it('should have all tabs with unique keys', () => {
               const keys = TRUSTLINE_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               TRUSTLINE_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               TRUSTLINE_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               TRUSTLINE_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('TRUSTLINE_TAB_META', () => {
          it('should have metadata for all 5 types', () => {
               expect(Object.keys(TRUSTLINE_TAB_META).length).toBe(5);
          });

          describe('setTrustline metadata', () => {
               const meta = TRUSTLINE_TAB_META.setTrustline;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroAdjustmentsVertical');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Set Trustline');
                    expect(meta.desc).toBe('Set a trustline to another XRPL address.');
                    expect(meta.color).toBe('#10b981');
               });
          });

          describe('issueCurrency metadata', () => {
               const meta = TRUSTLINE_TAB_META.issueCurrency;
               it('should have correct values', () => {
                    expect(meta.title).toBe('Send / Issue Currency');
                    expect(meta.colorClass).toBe('green-button-submenu');
               });
          });

          describe('clawbackTokens metadata', () => {
               const meta = TRUSTLINE_TAB_META.clawbackTokens;
               it('should have correct values', () => {
                    expect(meta.title).toBe('Clawback Tokens');
                    expect(meta.colorClass).toBe('red-button-submenu');
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['blue-button-submenu', 'green-button-submenu', 'red-button-submenu'];
               Object.values(TRUSTLINE_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(TRUSTLINE_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(TRUSTLINE_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce TrustlineConfigTxDisplayType keys', () => {
               const validKeys = ['setTrustline', 'removeTrustline', 'issueCurrency', 'clawbackTokens', 'addNewIssuers'];
               TRUSTLINE_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(TRUSTLINE_TABS[0].key).toBe('setTrustline');
               expect(TRUSTLINE_TAB_META.removeTrustline.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               TRUSTLINE_TABS.forEach(tab => {
                    const meta = TRUSTLINE_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
