import { AppConstants } from '../../../core/app.constants';
import { MPT_TABS, MPT_TAB_META } from './mpt.ui';

describe('MPT UI Configuration', () => {
     describe('MPT_TABS', () => {
          it('should have exactly 6 tabs', () => {
               expect(MPT_TABS.length).toBe(6);
          });

          it('should have createMpt tab configuration', () => {
               const tab = MPT_TABS.find(t => t.key === 'createMpt');
               expect(tab?.key).toBe('createMpt');
               expect(tab?.label).toBe('Create');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have authorizeMpt tab configuration', () => {
               const tab = MPT_TABS.find(t => t.key === 'authorizeMpt');
               expect(tab?.key).toBe('authorizeMpt');
               expect(tab?.label).toBe('Authorize');
               expect(tab?.icon).toBe('shield-check');
               expect(tab?.iconType).toBe('lucide-icon');
               expect(tab?.color).toBe('#fbbf24');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have sendMpt tab configuration', () => {
               const tab = MPT_TABS.find(t => t.key === 'sendMpt');
               expect(tab?.key).toBe('sendMpt');
               expect(tab?.label).toBe('Send');
               expect(tab?.icon).toBe('heroPaperAirplane');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have lockMpt tab configuration', () => {
               const tab = MPT_TABS.find(t => t.key === 'lockMpt');
               expect(tab?.key).toBe('lockMpt');
               expect(tab?.label).toBe('Lock/Unlock');
               expect(tab?.icon).toBe('heroLockOpen');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#c084fc');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have clawbackMpt tab configuration', () => {
               const tab = MPT_TABS.find(t => t.key === 'clawbackMpt');
               expect(tab?.key).toBe('clawbackMpt');
               expect(tab?.label).toBe('Clawback');
               expect(tab?.icon).toBe('heroArrowUturnLeft');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#60a5fa');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have destroyMpt tab configuration', () => {
               const tab = MPT_TABS.find(t => t.key === 'destroyMpt');
               expect(tab?.key).toBe('destroyMpt');
               expect(tab?.label).toBe('Destroy');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = MPT_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               MPT_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               MPT_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               MPT_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('MPT_TAB_META', () => {
          it('should have metadata for all 6 MPT types', () => {
               expect(Object.keys(MPT_TAB_META).length).toBe(6);
          });

          describe('createMpt metadata', () => {
               const meta = MPT_TAB_META.createMpt;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Create MPT Token');
                    expect(meta.desc).toBe('Create a new MPT Token for the selected account.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('authorizeMpt metadata', () => {
               const meta = MPT_TAB_META.authorizeMpt;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('shield-check');
                    expect(meta.colorClass).toBe('orange-button-submenu');
                    expect(meta.title).toBe('Authorize/Unauthorize MPT Token');
                    expect(meta.desc).toBe('Authorize/Unauthorize MPT Tokens for the selected account.');
                    expect(meta.color).toBe('#fbbf24');
                    expect(meta.iconType).toBe('lucide-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('sendMpt metadata', () => {
               const meta = MPT_TAB_META.sendMpt;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPaperAirplane');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Send MPT');
                    expect(meta.desc).toBe('Send created MPT to another XRPL address.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('lockMpt metadata', () => {
               const meta = MPT_TAB_META.lockMpt;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroLockOpen');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Lock/Unlock MPT');
                    expect(meta.desc).toBe(`Lock/Unlock MPT so another XRPL address can't send it.`);
                    expect(meta.color).toBe('#c084fc');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('clawbackMpt metadata', () => {
               const meta = MPT_TAB_META.clawbackMpt;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroArrowUturnLeft');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Clawback MPT');
                    expect(meta.desc).toBe(`Clawback a previously created MPT.`);
                    expect(meta.color).toBe('#60a5fa');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('destroyMpt metadata', () => {
               const meta = MPT_TAB_META.destroyMpt;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Destroy MPT');
                    expect(meta.desc).toBe(`Destroy a previously created MPT.`);
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use valid color classes', () => {
               const validColorClasses = ['green-button-submenu', 'orange-button-submenu', 'red-button-submenu'];

               Object.values(MPT_TAB_META).forEach(meta => {
                    expect(validColorClasses).toContain(meta.colorClass);
               });
          });

          it('should use ng-icon or lucide-icon', () => {
               Object.values(MPT_TAB_META).forEach(meta => {
                    expect(['ng-icon', 'lucide-icon']).toContain(meta.iconType);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(MPT_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(MPT_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce MptConfigTxDisplayType keys', () => {
               const validKeys = ['createMpt', 'authorizeMpt', 'sendMpt', 'lockMpt', 'clawbackMpt', 'destroyMpt'];

               MPT_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(MPT_TABS[0].key).toBe('createMpt');
               expect(MPT_TAB_META.destroyMpt.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors', () => {
               MPT_TABS.forEach(tab => {
                    expect(MPT_TAB_META[tab.key].color).toBe(tab.color);
               });
          });

          it('should have matching icons', () => {
               MPT_TABS.forEach(tab => {
                    expect(MPT_TAB_META[tab.key].icon).toBe(tab.icon);
               });
          });
     });
});
