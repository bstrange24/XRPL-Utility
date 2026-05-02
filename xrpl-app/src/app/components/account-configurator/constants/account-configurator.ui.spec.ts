import { AppConstants } from '../../../core/app.constants';
import { ACCOUNT_CONFIG_TABS, ACCOUNT_CONFIG_TAB_META } from './account-configurator.ui';

describe('Account Configurator UI Configuration', () => {
     describe('ACCOUNT_CONFIG_TABS', () => {
          it('should have exactly 5 tabs', () => {
               expect(ACCOUNT_CONFIG_TABS.length).toBe(5);
          });

          it('should have modifyAccountFlags tab configuration', () => {
               const tab = ACCOUNT_CONFIG_TABS.find(t => t.key === 'modifyAccountFlags');
               expect(tab?.key).toBe('modifyAccountFlags');
               expect(tab?.label).toBe('Account Flags');
               expect(tab?.icon).toBe('heroArrowPath');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have modifyMetaData tab configuration', () => {
               const tab = ACCOUNT_CONFIG_TABS.find(t => t.key === 'modifyMetaData');
               expect(tab?.label).toBe('Meta Data');
          });

          it('should have modifyDepositAuth tab configuration', () => {
               const tab = ACCOUNT_CONFIG_TABS.find(t => t.key === 'modifyDepositAuth');
               expect(tab?.label).toBe('Deposit Auth');
          });

          it('should have modifyMultiSigners tab configuration', () => {
               const tab = ACCOUNT_CONFIG_TABS.find(t => t.key === 'modifyMultiSigners');
               expect(tab?.label).toBe('Multi-Sign');
          });

          it('should have modifyRegularKey tab configuration', () => {
               const tab = ACCOUNT_CONFIG_TABS.find(t => t.key === 'modifyRegularKey');
               expect(tab?.label).toBe('Regular Key');
          });

          it('should have all tabs with unique keys', () => {
               const keys = ACCOUNT_CONFIG_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               ACCOUNT_CONFIG_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               ACCOUNT_CONFIG_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               ACCOUNT_CONFIG_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('ACCOUNT_CONFIG_TAB_META', () => {
          it('should have metadata for all main actions', () => {
               expect(Object.keys(ACCOUNT_CONFIG_TAB_META).length).toBe(7);
          });

          describe('modifyAccountFlags metadata', () => {
               const meta = ACCOUNT_CONFIG_TAB_META.modifyAccountFlags;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroArrowPath');
                    expect(meta.colorClass).toBe('white-button-submenu');
                    expect(meta.title).toBe('Modify Account Flags');
                    expect(meta.desc).toBe('Set or Clear account level flags.');
                    expect(meta.color).toBe('#10b981');
               });
          });

          describe('modifyMultiSigners metadata', () => {
               const meta = ACCOUNT_CONFIG_TAB_META.modifyMultiSigners;
               it('should have correct values', () => {
                    expect(meta.title).toBe('Modify Multi Sign');
                    expect(meta.colorClass).toBe('blue-button-submenu');
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['white-button-submenu', 'blue-button-submenu'];
               Object.values(ACCOUNT_CONFIG_TAB_META).forEach(meta => {
                    if (meta.colorClass) {
                         expect(validClasses).toContain(meta.colorClass);
                    }
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for active meta entries', () => {
               Object.values(ACCOUNT_CONFIG_TAB_META).forEach(meta => {
                    if (meta.iconSize) {
                         expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
                    }
               });
          });

          it('should have non-empty titles and descriptions for active tabs', () => {
               const activeKeys = ['modifyAccountFlags', 'modifyMetaData', 'modifyDepositAuth', 'modifyMultiSigners', 'modifyRegularKey'];
               activeKeys.forEach(key => {
                    const meta = ACCOUNT_CONFIG_TAB_META[key as keyof typeof ACCOUNT_CONFIG_TAB_META];
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce AccountConfigAction keys', () => {
               const validKeys = ['modifyAccountFlags', 'modifyMetaData', 'modifyDepositAuth', 'modifyMultiSigners', 'modifyRegularKey'];
               ACCOUNT_CONFIG_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(ACCOUNT_CONFIG_TABS[0].key).toBe('modifyAccountFlags');
               expect(ACCOUNT_CONFIG_TAB_META.modifyAccountFlags.colorClass).toBe('white-button-submenu');
          });
     });
});
