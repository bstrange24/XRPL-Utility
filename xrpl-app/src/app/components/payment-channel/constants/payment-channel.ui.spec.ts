import { AppConstants } from '../../../core/app.constants';
import { PAYMENT_CHANNEL_TAB_META, PAYMENT_CHANNEL_TABS } from './payment-channel.ui';

describe('Payment Channel UI Configuration', () => {
     describe('PAYMENT_CHANNEL_TABS', () => {
          it('should have exactly 5 tabs', () => {
               expect(PAYMENT_CHANNEL_TABS.length).toBe(5);
          });

          it('should have createPaymentChannel tab configuration', () => {
               const tab = PAYMENT_CHANNEL_TABS.find(t => t.key === 'createPaymentChannel');
               expect(tab?.key).toBe('createPaymentChannel');
               expect(tab?.label).toBe('Create');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have fundPaymentChannel tab configuration', () => {
               const tab = PAYMENT_CHANNEL_TABS.find(t => t.key === 'fundPaymentChannel');
               expect(tab?.key).toBe('fundPaymentChannel');
               expect(tab?.label).toBe('Fund');
               expect(tab?.icon).toBe('banknote-arrow-down');
               expect(tab?.iconType).toBe('lucide-icon');
               expect(tab?.color).toBe('#60a5fa');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have claimPaymentChannel tab configuration', () => {
               const tab = PAYMENT_CHANNEL_TABS.find(t => t.key === 'claimPaymentChannel');
               expect(tab?.key).toBe('claimPaymentChannel');
               expect(tab?.label).toBe('Claim');
               expect(tab?.icon).toBe('banknote-arrow-up');
               expect(tab?.iconType).toBe('lucide-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have renewPaymentChannel tab configuration', () => {
               const tab = PAYMENT_CHANNEL_TABS.find(t => t.key === 'renewPaymentChannel');
               expect(tab?.key).toBe('renewPaymentChannel');
               expect(tab?.label).toBe('Renew');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#60a5fa');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have closePaymentChannel tab configuration', () => {
               const tab = PAYMENT_CHANNEL_TABS.find(t => t.key === 'closePaymentChannel');
               expect(tab?.key).toBe('closePaymentChannel');
               expect(tab?.label).toBe('Close');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = PAYMENT_CHANNEL_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               PAYMENT_CHANNEL_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               PAYMENT_CHANNEL_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               PAYMENT_CHANNEL_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('PAYMENT_CHANNEL_TAB_META', () => {
          it('should have metadata for all 5 types', () => {
               expect(Object.keys(PAYMENT_CHANNEL_TAB_META).length).toBe(5);
          });

          describe('createPaymentChannel metadata', () => {
               const meta = PAYMENT_CHANNEL_TAB_META.createPaymentChannel;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Create Payment Channel');
                    expect(meta.desc).toBe('Create a payment channel to another XRPL address.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('fundPaymentChannel metadata', () => {
               const meta = PAYMENT_CHANNEL_TAB_META.fundPaymentChannel;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('banknote-arrow-down');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Fund Payment Channel');
                    expect(meta.desc).toBe('Fund existing payment channel created by the selected account.');
                    expect(meta.color).toBe('#60a5fa');
                    expect(meta.iconType).toBe('lucide-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('claimPaymentChannel metadata', () => {
               const meta = PAYMENT_CHANNEL_TAB_META.claimPaymentChannel;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('banknote-arrow-up');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Claim Payment Channel');
                    expect(meta.desc).toBe('Claim funds from payment channel.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('lucide-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('renewPaymentChannel metadata', () => {
               const meta = PAYMENT_CHANNEL_TAB_META.renewPaymentChannel;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Renew Payment Channel');
                    expect(meta.desc).toBe('Reset expiration as the source/creator (no funds claimed).');
                    expect(meta.color).toBe('#60a5fa');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('closePaymentChannel metadata', () => {
               const meta = PAYMENT_CHANNEL_TAB_META.closePaymentChannel;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Close Payment Channel');
                    expect(meta.desc).toBe('Close existing payment channel created by the selected account.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['blue-button-submenu', 'green-button-submenu', 'red-button-submenu'];
               Object.values(PAYMENT_CHANNEL_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(PAYMENT_CHANNEL_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(PAYMENT_CHANNEL_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce PaymentChannelConfigTxDisplayType keys', () => {
               const validKeys = ['createPaymentChannel', 'fundPaymentChannel', 'claimPaymentChannel', 'renewPaymentChannel', 'closePaymentChannel'];
               PAYMENT_CHANNEL_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(PAYMENT_CHANNEL_TABS[0].key).toBe('createPaymentChannel');
               expect(PAYMENT_CHANNEL_TAB_META.closePaymentChannel.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               PAYMENT_CHANNEL_TABS.forEach(tab => {
                    const meta = PAYMENT_CHANNEL_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
