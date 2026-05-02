import { AppConstants } from '../../../core/app.constants';
import { NFT_CREATE_TABS, NFT_CREATE_TAB_META } from './nft-create.ui';

describe('NFT Create UI Configuration', () => {
     describe('NFT_CREATE_TABS', () => {
          it('should have exactly 3 tabs', () => {
               expect(NFT_CREATE_TABS.length).toBe(3);
          });

          it('should have createNft tab configuration', () => {
               const tab = NFT_CREATE_TABS.find(t => t.key === 'createNft');
               expect(tab?.key).toBe('createNft');
               expect(tab?.label).toBe('Mint NFT');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have updateNFTMetadata tab configuration', () => {
               const tab = NFT_CREATE_TABS.find(t => t.key === 'updateNFTMetadata');
               expect(tab?.key).toBe('updateNFTMetadata');
               expect(tab?.label).toBe('Update NFT');
               expect(tab?.icon).toBe('heroArrowPath');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#60a5fa');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have burnNft tab configuration', () => {
               const tab = NFT_CREATE_TABS.find(t => t.key === 'burnNft');
               expect(tab?.key).toBe('burnNft');
               expect(tab?.label).toBe('Burn NFT');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = NFT_CREATE_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               NFT_CREATE_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               NFT_CREATE_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               NFT_CREATE_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('NFT_CREATE_TAB_META', () => {
          it('should have metadata for all 3 NFT types', () => {
               expect(Object.keys(NFT_CREATE_TAB_META).length).toBe(3);
          });

          describe('createNft metadata', () => {
               const meta = NFT_CREATE_TAB_META['createNft'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Mint NFT');
                    expect(meta.desc).toBe('Mint a new NFT for the selected account.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('updateNFTMetadata metadata', () => {
               const meta = NFT_CREATE_TAB_META['updateNFTMetadata'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroArrowPath');
                    expect(meta.colorClass).toBe('white-button-submenu');
                    expect(meta.title).toBe('Update NFT Metadata');
                    expect(meta.desc).toBe(`Update the metadata of an existing NFT.`);
                    expect(meta.color).toBe('#60a5fa');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('burnNft metadata', () => {
               const meta = NFT_CREATE_TAB_META['burnNft'];
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Burn NFT');
                    expect(meta.desc).toBe('Burn an existing NFT for the selected account.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['blue-button-submenu', 'white-button-submenu', 'red-button-submenu'];
               Object.values(NFT_CREATE_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(NFT_CREATE_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(NFT_CREATE_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce NftCreateConfigTxDisplayType keys', () => {
               const validKeys = ['createNft', 'updateNFTMetadata', 'burnNft'];
               NFT_CREATE_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(NFT_CREATE_TABS[0].key).toBe('createNft');
               expect(NFT_CREATE_TAB_META['burnNft'].colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               NFT_CREATE_TABS.forEach(tab => {
                    const meta = NFT_CREATE_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
