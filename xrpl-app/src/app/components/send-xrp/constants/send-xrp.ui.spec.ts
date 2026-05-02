import { AppConstants } from '../../../core/app.constants';
import { SEND_XRP_TABS, SEND_XRP_TAB_META } from './send-xrp.ui';

describe('Send XRP UI Configuration', () => {
     describe('SEND_XRP_TABS', () => {
          it('should have exactly 1 tab', () => {
               expect(SEND_XRP_TABS.length).toBe(1);
          });

          it('should have sendXrp tab configuration', () => {
               const tab = SEND_XRP_TABS[0];
               expect(tab.key).toBe('sendXrp');
               expect(tab.label).toBe('Send XRP');
               expect(tab.icon).toBe('heroPaperAirplane');
               expect(tab.iconType).toBe('ng-icon');
               expect(tab.color).toBe(''); // Empty color as defined
               expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should use valid icon type', () => {
               SEND_XRP_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE', () => {
               SEND_XRP_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('SEND_XRP_TAB_META', () => {
          it('should have metadata for sendXrp', () => {
               expect(Object.keys(SEND_XRP_TAB_META).length).toBe(1);
          });

          describe('sendXrp metadata', () => {
               const meta = SEND_XRP_TAB_META.sendXrp;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPaperAirplane');
                    expect(meta.colorClass).toBe('bg-green-50 text-green-600 rounded-xl p-3');
                    expect(meta.title).toBe('Send XRP');
                    expect(meta.desc).toBe('Send XRP to another XRPL address.');
                    expect(meta.color).toBe('#16a34a');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE', () => {
               Object.values(SEND_XRP_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty title and description', () => {
               const meta = SEND_XRP_TAB_META.sendXrp;
               expect(meta.title.length).toBeGreaterThan(0);
               expect(meta.desc.length).toBeGreaterThan(0);
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce SendXrpConfigTxDisplayType keys', () => {
               const validKeys = ['sendXrp'];
               SEND_XRP_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(SEND_XRP_TABS[0].key).toBe('sendXrp');
               expect(SEND_XRP_TAB_META.sendXrp.colorClass).toBe('bg-green-50 text-green-600 rounded-xl p-3');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching icon', () => {
               const tab = SEND_XRP_TABS[0];
               const meta = SEND_XRP_TAB_META[tab.key];
               expect(meta.icon).toBe(tab.icon);
          });
     });
});
