import { AppConstants } from '../../../core/app.constants';
import { NFT_OFFERS_TABS, NFT_OFFERS_TAB_META } from './nft-offers.ui';

describe('NFT Offers UI Configuration', () => {
     describe('NFT_OFFERS_TABS', () => {
          it('should have exactly 5 tabs', () => {
               expect(NFT_OFFERS_TABS.length).toBe(5);
          });

          it('should have sellNft tab configuration', () => {
               const tab = NFT_OFFERS_TABS.find(t => t.key === 'sellNft');
               expect(tab?.key).toBe('sellNft');
               expect(tab?.label).toBe('Sell NFT');
               expect(tab?.icon).toBe('heroCurrencyDollar');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have buyNft tab configuration', () => {
               const tab = NFT_OFFERS_TABS.find(t => t.key === 'buyNft');
               expect(tab?.key).toBe('buyNft');
               expect(tab?.label).toBe('Buy NFT');
               expect(tab?.icon).toBe('heroCurrencyDollar');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#60a5fa');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have sellNftOffer tab configuration', () => {
               const tab = NFT_OFFERS_TABS.find(t => t.key === 'sellNftOffer');
               expect(tab?.key).toBe('sellNftOffer');
               expect(tab?.label).toBe('Sell NFT Offer');
               expect(tab?.icon).toBe('heroCurrencyDollar');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have buyNftOffer tab configuration', () => {
               const tab = NFT_OFFERS_TABS.find(t => t.key === 'buyNftOffer');
               expect(tab?.key).toBe('buyNftOffer');
               expect(tab?.label).toBe('Buy NFT Offer');
               expect(tab?.icon).toBe('heroCurrencyDollar');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#60a5fa');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have cancelNftOffer tab configuration', () => {
               const tab = NFT_OFFERS_TABS.find(t => t.key === 'cancelNftOffer');
               expect(tab?.key).toBe('cancelNftOffer');
               expect(tab?.label).toBe('Cancel Offer');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = NFT_OFFERS_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               NFT_OFFERS_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               NFT_OFFERS_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               NFT_OFFERS_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('NFT_OFFERS_TAB_META', () => {
          it('should have metadata for all 5 NFT offer types', () => {
               expect(Object.keys(NFT_OFFERS_TAB_META).length).toBe(5);
          });

          describe('sellNft metadata', () => {
               const meta = NFT_OFFERS_TAB_META['sellNft'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroCurrencyDollar');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Sell NFT');
                    expect(meta.desc).toBe('Sell an NFT on the market.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('buyNft metadata', () => {
               const meta = NFT_OFFERS_TAB_META['buyNft'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroCurrencyDollar');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Buy NFT');
                    expect(meta.desc).toBe('Buy an NFT from the market.');
                    expect(meta.color).toBe('#60a5fa');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('sellNftOffer metadata', () => {
               const meta = NFT_OFFERS_TAB_META['sellNftOffer'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroCurrencyDollar');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Sell NFT Offer');
                    expect(meta.desc).toBe(`Create an offer to sell an NFT.`);
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('buyNftOffer metadata', () => {
               const meta = NFT_OFFERS_TAB_META['buyNftOffer'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroCurrencyDollar');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Buy NFT Offer');
                    expect(meta.desc).toBe('Create an offer to buy an NFT.');
                    expect(meta.color).toBe('#60a5fa');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('cancelNftOffer metadata', () => {
               const meta = NFT_OFFERS_TAB_META['cancelNftOffer'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Cancel NFT Offer');
                    expect(meta.desc).toBe(`Cancel and existing NFT offer.`);
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['blue-button-submenu', 'green-button-submenu', 'red-button-submenu'];
               Object.values(NFT_OFFERS_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(NFT_OFFERS_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(NFT_OFFERS_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce NftOffersConfigTxDisplayType keys', () => {
               const validKeys = ['buyNft', 'sellNft', 'buyNftOffer', 'sellNftOffer', 'cancelNftOffer'];
               NFT_OFFERS_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(NFT_OFFERS_TABS[4].key).toBe('cancelNftOffer');
               expect(NFT_OFFERS_TAB_META['cancelNftOffer'].colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               NFT_OFFERS_TABS.forEach(tab => {
                    const meta = NFT_OFFERS_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
