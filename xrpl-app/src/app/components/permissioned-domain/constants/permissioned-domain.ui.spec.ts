import { AppConstants } from '../../../core/app.constants';
import { PERMISSION_DOMAIN_TABS, PERMISSION_DOMAIN_TAB_META, PERMISSION_DOMAIN_ACTION_CONFIG } from './permissioned-domain.ui';

describe('Permissioned Domain UI Configuration', () => {
     describe('PERMISSION_DOMAIN_TABS', () => {
          it('should have exactly 2 tabs', () => {
               expect(PERMISSION_DOMAIN_TABS.length).toBe(2);
          });

          it('should have setPermissionedDomain tab configuration', () => {
               const tab = PERMISSION_DOMAIN_TABS.find(t => t.key === 'setPermissionedDomain');
               expect(tab?.key).toBe('setPermissionedDomain');
               expect(tab?.label).toBe('Set');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have deletePermissionedDomain tab configuration', () => {
               const tab = PERMISSION_DOMAIN_TABS.find(t => t.key === 'deletePermissionedDomain');
               expect(tab?.key).toBe('deletePermissionedDomain');
               expect(tab?.label).toBe('Delete');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = PERMISSION_DOMAIN_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               PERMISSION_DOMAIN_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               PERMISSION_DOMAIN_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               PERMISSION_DOMAIN_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });
     });

     describe('PERMISSION_DOMAIN_TAB_META', () => {
          it('should have metadata for both domain types', () => {
               expect(Object.keys(PERMISSION_DOMAIN_TAB_META).length).toBe(2);
          });

          describe('setPermissionedDomain metadata', () => {
               const meta = PERMISSION_DOMAIN_TAB_META.setPermissionedDomain;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Set Permissioned Domain');
                    expect(meta.desc).toBe('Set Permissioned Domain for the selected account.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('deletePermissionedDomain metadata', () => {
               const meta = PERMISSION_DOMAIN_TAB_META.deletePermissionedDomain;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Delete Permissioned Domain');
                    expect(meta.desc).toBe('Delete Permissioned Domain for the selected account.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use valid color classes', () => {
               const validClasses = ['blue-button-submenu', 'red-button-submenu'];
               Object.values(PERMISSION_DOMAIN_TAB_META).forEach(meta => {
                    expect(validClasses).toContain(meta.colorClass);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(PERMISSION_DOMAIN_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });
     });

     describe('PERMISSION_DOMAIN_ACTION_CONFIG', () => {
          it('should have configuration for both actions', () => {
               expect(Object.keys(PERMISSION_DOMAIN_ACTION_CONFIG).length).toBe(2);
          });

          it('should have correct button config for setPermissionedDomain', () => {
               const config = PERMISSION_DOMAIN_ACTION_CONFIG.setPermissionedDomain;
               expect(config.buttonLabel).toBe('Set Domain');
               expect(config.buttonClass).toBe('btn-primary');
          });

          it('should have correct button config for deletePermissionedDomain', () => {
               const config = PERMISSION_DOMAIN_ACTION_CONFIG.deletePermissionedDomain;
               expect(config.buttonLabel).toBe('Delete Domain');
               expect(config.buttonClass).toBe('btn-red');
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce PermissionedDomainConfigTxDisplayType keys', () => {
               const validKeys = ['setPermissionedDomain', 'deletePermissionedDomain'];
               PERMISSION_DOMAIN_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(PERMISSION_DOMAIN_TABS[0].key).toBe('setPermissionedDomain');
               expect(PERMISSION_DOMAIN_TAB_META.deletePermissionedDomain.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Consistency between TABS and TAB_META', () => {
          it('should have matching colors and icons', () => {
               PERMISSION_DOMAIN_TABS.forEach(tab => {
                    const meta = PERMISSION_DOMAIN_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
                    expect(meta.icon).toBe(tab.icon);
               });
          });
     });
});
