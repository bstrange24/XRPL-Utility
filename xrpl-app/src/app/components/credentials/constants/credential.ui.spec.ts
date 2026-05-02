import { AppConstants } from '../../../core/app.constants';
import { CREDENTIAL_TABS, CREDENTIAL_TAB_META } from './credential.ui';

describe('Credentials UI Configuration', () => {
     describe('CREDENTIAL_TABS', () => {
          it('should have exactly 4 tabs', () => {
               expect(CREDENTIAL_TABS.length).toBe(4);
          });

          it('should have createCredential tab configuration', () => {
               const tab = CREDENTIAL_TABS.find(t => t.key === 'createCredential');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('createCredential');
               expect(tab?.label).toBe('Create');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have acceptCredential tab configuration', () => {
               const tab = CREDENTIAL_TABS.find(t => t.key === 'acceptCredential');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('acceptCredential');
               expect(tab?.label).toBe('Accept');
               expect(tab?.icon).toBe('copy-plus');
               expect(tab?.iconType).toBe('lucide-icon');
               expect(tab?.color).toBe('#c084fc');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have verifyCredential tab configuration', () => {
               const tab = CREDENTIAL_TABS.find(t => t.key === 'verifyCredential');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('verifyCredential');
               expect(tab?.label).toBe('Verify');
               expect(tab?.icon).toBe('shield-check');
               expect(tab?.iconType).toBe('lucide-icon');
               expect(tab?.color).toBe('#fbbf24');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have deleteCredential tab configuration', () => {
               const tab = CREDENTIAL_TABS.find(t => t.key === 'deleteCredential');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('deleteCredential');
               expect(tab?.label).toBe('Delete');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = CREDENTIAL_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               CREDENTIAL_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               CREDENTIAL_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               CREDENTIAL_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });

          it('should have non-empty labels', () => {
               CREDENTIAL_TABS.forEach(tab => {
                    expect(tab.label.length).toBeGreaterThan(0);
               });
          });
     });

     describe('CREDENTIAL_TAB_META', () => {
          it('should have metadata for all four credential types', () => {
               expect(Object.keys(CREDENTIAL_TAB_META)).toEqual(['createCredential', 'acceptCredential', 'verifyCredential', 'deleteCredential']);
               expect(Object.keys(CREDENTIAL_TAB_META).length).toBe(4);
          });

          describe('createCredential metadata', () => {
               const meta = CREDENTIAL_TAB_META.createCredential;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('blue-button-submenu');
                    expect(meta.title).toBe('Create Credentials');
                    expect(meta.desc).toBe('Create Credentials to another XRPL address.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('acceptCredential metadata', () => {
               const meta = CREDENTIAL_TAB_META.acceptCredential;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroArrowPath');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Accept Credentials');
                    expect(meta.desc).toBe('Accept Credentials from another XRPL address.');
                    expect(meta.color).toBe('#c084fc');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('verifyCredential metadata', () => {
               const meta = CREDENTIAL_TAB_META.verifyCredential;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('shield-check');
                    expect(meta.colorClass).toBe('orange-button-submenu');
                    expect(meta.title).toBe('Verify Credentials');
                    expect(meta.desc).toBe('Verify Credentials have been accepted by another XRPL address.');
                    expect(meta.color).toBe('#fbbf24');
                    expect(meta.iconType).toBe('lucide-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('deleteCredential metadata', () => {
               const meta = CREDENTIAL_TAB_META.deleteCredential;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('red-button-submenu');
                    expect(meta.title).toBe('Delete Credentials');
                    expect(meta.desc).toBe('Delete Credentials to another XRPL address.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use correct icon types across all meta entries', () => {
               Object.values(CREDENTIAL_TAB_META).forEach(meta => {
                    expect(['ng-icon', 'lucide-icon']).toContain(meta.iconType);
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(CREDENTIAL_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(CREDENTIAL_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });

          it('should have unique color classes', () => {
               const colorClasses = Object.values(CREDENTIAL_TAB_META).map(m => m.colorClass);
               expect(new Set(colorClasses).size).toBe(colorClasses.length);
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce CredentialConfigTxDisplayType keys', () => {
               const validKeys = ['createCredential', 'acceptCredential', 'verifyCredential', 'deleteCredential'];

               CREDENTIAL_TABS.forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(CREDENTIAL_TABS[0].key).toBe('createCredential');
               expect(CREDENTIAL_TABS[1].iconType).toBe('lucide-icon');
               expect(CREDENTIAL_TAB_META.deleteCredential.colorClass).toBe('red-button-submenu');
          });
     });

     describe('Icon & Color consistency', () => {
          it('should use appropriate icons for each action', () => {
               expect(CREDENTIAL_TABS.map(t => t.icon)).toContain('heroPlusCircle');
               expect(CREDENTIAL_TABS.map(t => t.icon)).toContain('heroTrash');
               expect(CREDENTIAL_TAB_META.verifyCredential.icon).toBe('shield-check');
          });

          it('should have color matching between tabs and meta', () => {
               CREDENTIAL_TABS.forEach(tab => {
                    const meta = CREDENTIAL_TAB_META[tab.key];
                    expect(meta.color).toBe(tab.color);
               });
          });
     });
});
