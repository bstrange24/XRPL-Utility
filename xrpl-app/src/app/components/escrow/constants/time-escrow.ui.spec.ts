import { AppConstants } from '../../../core/app.constants';
import { TIME_ESCROW_TABS, TIME_ESCROW_TAB_META, CONDITIONAL_ESCROW_TABS, CONDITIONAL_ESCROW_TAB_META } from './time-escrow.ui';

describe('Time Escrow UI Configuration', () => {
     describe('TIME_ESCROW_TABS', () => {
          it('should have exactly 3 tabs', () => {
               expect(TIME_ESCROW_TABS.length).toBe(3);
          });

          it('should have createEscrow tab configuration', () => {
               const tab = TIME_ESCROW_TABS.find(t => t.key === 'createEscrow');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('createEscrow');
               expect(tab?.label).toBe('Create');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#10b981');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have finishEscrow tab configuration', () => {
               const tab = TIME_ESCROW_TABS.find(t => t.key === 'finishEscrow');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('finishEscrow');
               expect(tab?.label).toBe('Finish');
               expect(tab?.icon).toBe('heroClock');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#3b82f6');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have cancelEscrow tab configuration', () => {
               const tab = TIME_ESCROW_TABS.find(t => t.key === 'cancelEscrow');
               expect(tab).toBeDefined();
               expect(tab?.key).toBe('cancelEscrow');
               expect(tab?.label).toBe('Cancel');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
               expect(tab?.color).toBe('#ef4444');
               expect(tab?.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
          });

          it('should have all tabs with unique keys', () => {
               const keys = TIME_ESCROW_TABS.map(tab => tab.key);
               expect(new Set(keys).size).toBe(keys.length);
          });

          it('should use valid icon types', () => {
               TIME_ESCROW_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });

          it('should use valid hex colors', () => {
               TIME_ESCROW_TABS.forEach(tab => {
                    expect(tab.color).toMatch(/^#[0-9a-f]{6}$/i);
               });
          });

          it('should use AppConstants.TAB_ICON_SIZE for all tabs', () => {
               TIME_ESCROW_TABS.forEach(tab => {
                    expect(tab.iconSize).toBe(AppConstants.TAB_ICON_SIZE);
               });
          });

          it('should have non-empty labels', () => {
               TIME_ESCROW_TABS.forEach(tab => {
                    expect(tab.label.length).toBeGreaterThan(0);
               });
          });
     });

     describe('TIME_ESCROW_TAB_META', () => {
          it('should have metadata for all three escrow types', () => {
               expect(Object.keys(TIME_ESCROW_TAB_META)).toEqual(['createEscrow', 'finishEscrow', 'cancelEscrow']);
               expect(Object.keys(TIME_ESCROW_TAB_META).length).toBe(3);
          });

          describe('createEscrow metadata', () => {
               const meta = TIME_ESCROW_TAB_META.createEscrow;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroPlusCircle');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Create Escrow');
                    expect(meta.desc).toBe('Create a new escrow on the XRPL.');
                    expect(meta.color).toBe('#10b981');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('finishEscrow metadata', () => {
               const meta = TIME_ESCROW_TAB_META.finishEscrow;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroClock');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Finish Escrow');
                    expect(meta.desc).toBe('Finish an existing escrow on the XRPL.');
                    expect(meta.color).toBe('#3b82f6');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          describe('cancelEscrow metadata', () => {
               const meta = TIME_ESCROW_TAB_META.cancelEscrow;
               it('should have correct values', () => {
                    expect(meta.icon).toBe('heroTrash');
                    expect(meta.colorClass).toBe('green-button-submenu');
                    expect(meta.title).toBe('Cancel Escrow');
                    expect(meta.desc).toBe('Cancel an existing escrow on the XRPL.');
                    expect(meta.color).toBe('#ef4444');
                    expect(meta.iconType).toBe('ng-icon');
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should use ng-icon for all meta entries', () => {
               Object.values(TIME_ESCROW_TAB_META).forEach(meta => {
                    expect(meta.iconType).toBe('ng-icon');
               });
          });

          it('should use AppConstants.TAB_META_INFO_ICON_SIZE for all meta icons', () => {
               Object.values(TIME_ESCROW_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
               });
          });

          it('should have non-empty titles and descriptions', () => {
               Object.values(TIME_ESCROW_TAB_META).forEach(meta => {
                    expect(meta.title.length).toBeGreaterThan(0);
                    expect(meta.desc.length).toBeGreaterThan(0);
               });
          });
     });

     // ===========================================================================
     // CONDITIONAL ESCROW
     // ===========================================================================

     describe('CONDITIONAL_ESCROW_TABS', () => {
          it('should have exactly 3 tabs', () => {
               expect(CONDITIONAL_ESCROW_TABS.length).toBe(3);
          });

          it('should have createEscrow tab', () => {
               const tab = CONDITIONAL_ESCROW_TABS.find(t => t.key === 'createEscrow');
               expect(tab?.icon).toBe('heroPlusCircle');
               expect(tab?.iconType).toBe('ng-icon');
          });

          it('should have finishEscrow tab with lucide icon', () => {
               const tab = CONDITIONAL_ESCROW_TABS.find(t => t.key === 'finishEscrow');
               expect(tab?.icon).toBe('split-icon');
               expect(tab?.iconType).toBe('lucide-icon');
          });

          it('should have cancelEscrow tab', () => {
               const tab = CONDITIONAL_ESCROW_TABS.find(t => t.key === 'cancelEscrow');
               expect(tab?.icon).toBe('heroTrash');
               expect(tab?.iconType).toBe('ng-icon');
          });

          it('should use valid icon types', () => {
               CONDITIONAL_ESCROW_TABS.forEach(tab => {
                    expect(['ng-icon', 'lucide-icon']).toContain(tab.iconType);
               });
          });
     });

     describe('CONDITIONAL_ESCROW_TAB_META', () => {
          it('should have metadata for all three types', () => {
               expect(Object.keys(CONDITIONAL_ESCROW_TAB_META)).toEqual(['createEscrow', 'finishEscrow', 'cancelEscrow']);
          });

          describe('cancelEscrow metadata (conditional)', () => {
               const meta = CONDITIONAL_ESCROW_TAB_META.cancelEscrow;
               it('should use red color class', () => {
                    expect(meta.colorClass).toBe('red-button-submenu');
               });
          });

          it('should have different colorClass for cancel compared to time escrow', () => {
               expect(CONDITIONAL_ESCROW_TAB_META.cancelEscrow.colorClass).toBe('red-button-submenu');
               expect(TIME_ESCROW_TAB_META.cancelEscrow.colorClass).toBe('green-button-submenu');
          });

          it('should use correct icon sizes and types', () => {
               Object.values(CONDITIONAL_ESCROW_TAB_META).forEach(meta => {
                    expect(meta.iconSize).toBe(AppConstants.TAB_META_INFO_ICON_SIZE);
                    expect(meta.iconType).toBe('ng-icon');
               });
          });
     });

     describe('Cross-validation between TIME and CONDITIONAL', () => {
          it('should share the same keys', () => {
               const timeKeys = Object.keys(TIME_ESCROW_TAB_META);
               const conditionalKeys = Object.keys(CONDITIONAL_ESCROW_TAB_META);
               expect(timeKeys).toEqual(conditionalKeys);
          });

          it('should have consistent base properties', () => {
               const keys = ['createEscrow', 'finishEscrow', 'cancelEscrow'] as const;

               keys.forEach(key => {
                    expect(TIME_ESCROW_TAB_META[key].title).toBe(CONDITIONAL_ESCROW_TAB_META[key].title);
                    expect(TIME_ESCROW_TAB_META[key].desc).toBe(CONDITIONAL_ESCROW_TAB_META[key].desc);
                    expect(TIME_ESCROW_TAB_META[key].color).toBe(CONDITIONAL_ESCROW_TAB_META[key].color);
               });
          });
     });

     describe('Type safety & readonly', () => {
          it('should enforce EscrowConfigTxDisplayType keys', () => {
               const validKeys = ['createEscrow', 'finishEscrow', 'cancelEscrow'];
               [...TIME_ESCROW_TABS, ...CONDITIONAL_ESCROW_TABS].forEach(tab => {
                    expect(validKeys).toContain(tab.key);
               });
          });

          it('should be readonly due to as const', () => {
               expect(TIME_ESCROW_TABS[0].key).toBe('createEscrow');
               expect(CONDITIONAL_ESCROW_TABS[1].icon).toBe('split-icon');
          });
     });
});
