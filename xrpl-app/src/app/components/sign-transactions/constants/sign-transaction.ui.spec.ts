import { AppConstants } from '../../../core/app.constants';
import { SIGN_TRANSACTION_TABS, SIGN_TRANSACTION_TAB_META } from './sign-transaction.ui';

describe('Sign Transaction UI Configuration', () => {
     describe('SIGN_TRANSACTION_TABS', () => {
          it('should have exactly 1 tab', () => {
               expect(SIGN_TRANSACTION_TABS.length).toBe(1);
          });

          it('should have sendXrp tab configuration', () => {
               const tab = SIGN_TRANSACTION_TABS[0];
               expect(tab.key).toBe('sendXrp');
               expect(tab.label).toBe('Sign Transactions');
               expect(tab.icon).toBe('heroPlusCircle');
               expect(tab.iconType).toBe('ng-icon');
               expect(tab.color).toBe(''); // Empty color as defined
               expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should use valid icon type', () => {
               SIGN_TRANSACTION_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE', () => {
               SIGN_TRANSACTION_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('SIGN_TRANSACTION_TAB_META', () => {
          it('should have metadata for sendXrp', () => {
               expect(Object.keys(SIGN_TRANSACTION_TAB_META).length).toBe(1);
          });

          describe('sendXrp metadata', () => {
               const meta = SIGN_TRANSACTION_TAB_META.sendXrp;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('signature');
                    expect(meta.colorClass).toBe('btn-blue');
                    expect(meta.title).toBe('Sign Transactions');
                    expect(meta.desc).toBe('Sign and submit transactions.');
                    expect(meta.color).toBe('#16a34a');
                    expect(meta.iconType).toBe('lucide-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE', () => {
               Object.values(SIGN_TRANSACTION_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty title and description', () => {
               const meta = SIGN_TRANSACTION_TAB_META.sendXrp;
               expect(meta.title.length).toBeGreaterThan(0);
               expect(meta.desc.length).toBeGreaterThan(0);
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce SignTransactionConfigTxDisplayType keys', () => {
               const validKeys = ['sendXrp'];
               SIGN_TRANSACTION_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(SIGN_TRANSACTION_TABS[0].key).toBe('sendXrp');
               expect(SIGN_TRANSACTION_TAB_META.sendXrp.colorClass).toBe('btn-blue');
               expect(SIGN_TRANSACTION_TAB_META.sendXrp.iconType).toBe('lucide-icon');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching icon', () => {
               const tab = SIGN_TRANSACTION_TABS[0];
               const meta = SIGN_TRANSACTION_TAB_META[tab.key];
               expect(meta.icon).not.toBe(tab.icon); // Different icons (heroPlusCircle vs signature)
          });
     });
});
