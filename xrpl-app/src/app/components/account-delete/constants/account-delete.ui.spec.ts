import { AppConstants } from '../../../core/app.constants';
import { ACCOUNT_DELETE_TABS, ACCOUNT_DELETE_TAB_META } from './account-delete.ui';

describe('Account Delete UI Configuration', () => {
     describe('ACCOUNT_DELETE_TABS', () => {
          it('should have exactly 1 tab', () => {
               expect(ACCOUNT_DELETE_TABS.length).toBe(1);
          });

          it('should have deleteAccount tab configuration', () => {
               const tab = ACCOUNT_DELETE_TABS[0];
               expect(tab.key).toBe('deleteAccount');
               expect(tab.label).toBe('Delete Wallet');
               expect(tab.icon).toBe('heroTrash');
               expect(tab.iconType).toBe('ng-icon');
               expect(tab.color).toBe(''); // Empty color as defined
               expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should use valid icon type', () => {
               ACCOUNT_DELETE_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE', () => {
               ACCOUNT_DELETE_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('ACCOUNT_DELETE_TAB_META', () => {
          it('should have metadata for deleteAccount', () => {
               expect(Object.keys(ACCOUNT_DELETE_TAB_META).length).toBe(1);
          });

          describe('deleteAccount metadata', () => {
               const meta = ACCOUNT_DELETE_TAB_META.deleteAccount;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Delete Wallet');
                    expect(meta.desc).toBe('Delete currently selected wallet.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE', () => {
               Object.values(ACCOUNT_DELETE_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty title and description', () => {
               const meta = ACCOUNT_DELETE_TAB_META.deleteAccount;
               expect(meta.title.length).toBeGreaterThan(0);
               expect(meta.desc.length).toBeGreaterThan(0);
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce AccountDeleteConfigTxDisplayType keys', () => {
               const validKeys = ['deleteAccount'];
               ACCOUNT_DELETE_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(ACCOUNT_DELETE_TABS[0].key).toBe('deleteAccount');
               expect(ACCOUNT_DELETE_TAB_META.deleteAccount.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching icon', () => {
               const tab = ACCOUNT_DELETE_TABS[0];
               const meta = ACCOUNT_DELETE_TAB_META[tab.key];
               expect(meta.icon).toBe(tab.icon);
          });
     });
});
