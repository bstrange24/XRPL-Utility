import { AppConstants } from '../../../core/app.constants';
import { WALLET_GENERATOR_TABS, WALLET_GENERATOR_TAB_META } from './wallet-generator.ui';

describe('Wallet Generator UI Configuration', () => {
     describe('WALLET_GENERATOR_TABS', () => {
          it('should have exactly 5 tabs', () => {
               expect(WALLET_GENERATOR_TABS.length).toBe(5);
          });

          it('should have generate tab configuration', () => {
               const tab = WALLET_GENERATOR_TABS.find(t => t.key === 'generate');
               expect(tab?.key).toBe('generate');
               expect(tab?.label).toBe('Generate New Wallet');
               expect(tab?.icon).toBe('heroWallet');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have deriveSeed tab configuration', () => {
               const tab = WALLET_GENERATOR_TABS.find(t => t.key === 'deriveSeed');
               expect(tab?.label).toBe('Derive from Seed');
               expect(tab?.color).toBe('#3b82f6');
          });

          it('should have deriveMnemonic tab configuration', () => {
               const tab = WALLET_GENERATOR_TABS.find(t => t.key === 'deriveMnemonic');
               expect(tab?.label).toBe('Derive from Mnemonic');
               expect(tab?.color).toBe('#3b82f6');
          });

          it('should have deriveSecretNumbers tab configuration', () => {
               const tab = WALLET_GENERATOR_TABS.find(t => t.key === 'deriveSecretNumbers');
               expect(tab?.label).toBe('Derive from Secret Numbers');
               expect(tab?.color).toBe('#3b82f6');
          });

          it('should have removeCustomWallets tab configuration', () => {
               const tab = WALLET_GENERATOR_TABS.find(t => t.key === 'removeCustomWallets');
               expect(tab?.label).toBe('Remove Custom Wallets');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.color).toBe('#ef4444');
          });

          it('should have all tabs with unique keys', () => {
               const keys = WALLET_GENERATOR_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               WALLET_GENERATOR_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               WALLET_GENERATOR_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               WALLET_GENERATOR_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('WALLET_GENERATOR_TAB_META', () => {
          it('should have metadata for all 5 types', () => {
               expect(Object.keys(WALLET_GENERATOR_TAB_META).length).toBe(5);
          });

          describe('generate metadata', () => {
               const meta = WALLET_GENERATOR_TAB_META.generate;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroWallet');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('New Wallet Generator');
                    expect(meta.desc).toBe(`Generate a new XRPL Wallet.`);
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('removeCustomWallets metadata', () => {
               const meta = WALLET_GENERATOR_TAB_META.removeCustomWallets;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Remove Custom Wallets');
                    expect(meta.desc).toBe(`Remove custom wallets entered in the destination dropdown menu.`);
                    expect(meta.color).toBe('#ef4444');
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['green-button-submenu', 'blue-button-submenu', 'red-button-submenu'];
               Object.values(WALLET_GENERATOR_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(WALLET_GENERATOR_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(WALLET_GENERATOR_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce WalletGeneratorConfigTxDisplayType keys', () => {
               const validKeys = ['generate', 'deriveSeed', 'deriveMnemonic', 'deriveSecretNumbers', 'removeCustomWallets'];
               WALLET_GENERATOR_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(WALLET_GENERATOR_TABS[0].key).toBe('generate');
               expect(WALLET_GENERATOR_TAB_META.removeCustomWallets.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               WALLET_GENERATOR_TABS.forEach(tab => {
                    const meta = WALLET_GENERATOR_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
