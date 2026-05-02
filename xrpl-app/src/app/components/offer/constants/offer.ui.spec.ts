import { AppConstants } from '../../../core/app.constants';
import { OFFER_TABS, OFFER_TAB_META } from './offer.ui';

describe('Offers UI Configuration', () => {
     describe('OFFER_TABS', () => {
          it('should have exactly 3 tabs', () => {
               expect(OFFER_TABS.length).toBe(3);
          });

          it('should have createOffer tab configuration', () => {
               const tab = OFFER_TABS.find(t => t.key === 'createOffer');
               expect(tab?.key).toBe('createOffer');
               expect(tab?.label).toBe('Create Offer');
               expect(tab?.icon).toBe('heroCurrencyDollar');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have getOrderBook tab configuration', () => {
               const tab = OFFER_TABS.find(t => t.key === 'getOrderBook');
               expect(tab?.key).toBe('getOrderBook');
               expect(tab?.label).toBe('Order Book');
               expect(tab?.icon).toBe('heroChartBar');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#60a5fa');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have cancelOffer tab configuration', () => {
               const tab = OFFER_TABS.find(t => t.key === 'cancelOffer');
               expect(tab?.key).toBe('cancelOffer');
               expect(tab?.label).toBe('Cancel Offer');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = OFFER_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               OFFER_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               OFFER_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               OFFER_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('OFFER_TAB_META', () => {
          it('should have metadata for all 3 offer types', () => {
               expect(Object.keys(OFFER_TAB_META).length).toBe(3);
          });

          describe('createOffer metadata', () => {
               const meta = OFFER_TAB_META['createOffer'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroCurrencyDollar');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Create Offer');
                    expect(meta.desc).toBe('Create an offer on the XRPL DEX.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('getOrderBook metadata', () => {
               const meta = OFFER_TAB_META['getOrderBook'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroChartBar');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Get Order Book');
                    expect(meta.desc).toBe('Get the order book for a currency pair on the XRPL DEX.');
                    expect(meta.color).toBe('#60a5fa');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('cancelOffer metadata', () => {
               const meta = OFFER_TAB_META['cancelOffer'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Cancel Offer');
                    expect(meta.desc).toBe('Cancel an existing offer on the XRPL DEX.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['blue-button-submenu', 'green-button-submenu', 'red-button-submenu'];
               Object.values(OFFER_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(OFFER_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(OFFER_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should be readonly due to as const', () => {
               expect(OFFER_TABS[0].key).toBe('createOffer');
               expect(OFFER_TAB_META['cancelOffer'].colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               OFFER_TABS.forEach(tab => {
                    const meta = OFFER_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
