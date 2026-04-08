import { TIME_ESCROW_TABS, TIME_ESCROW_TAB_META, CONDITIONAL_ESCROW_TABS, CONDITIONAL_ESCROW_TAB_META } from './time-escrow.ui';

describe('time-escrow.ui', () => {
     describe('TIME_ESCROW_TABS', () => {
          it('should have 3 tabs', () => {
               expect(TIME_ESCROW_TABS.length).toBe(3);
          });

          it('should have createEscrow as first tab', () => {
               expect(TIME_ESCROW_TABS[0].key).toBe('createEscrow');
          });

          it('should have finishEscrow as second tab', () => {
               expect(TIME_ESCROW_TABS[1].key).toBe('finishEscrow');
          });

          it('should have cancelEscrow as third tab', () => {
               expect(TIME_ESCROW_TABS[2].key).toBe('cancelEscrow');
          });

          it('should have a label for each tab', () => {
               TIME_ESCROW_TABS.forEach(tab => {
                    expect(tab.label).toBeTruthy();
               });
          });

          it('should have ng-icon as iconType for all tabs', () => {
               TIME_ESCROW_TABS.forEach(tab => {
                    expect(tab.iconType).toBe('ng-icon');
               });
          });

          it('should have an icon for each tab', () => {
               TIME_ESCROW_TABS.forEach(tab => {
                    expect(tab.icon).toBeTruthy();
               });
          });

          it('createEscrow tab should have heroPlusCircle icon', () => {
               expect(TIME_ESCROW_TABS[0].icon).toBe('heroPlusCircle');
          });

          it('finishEscrow tab should have heroClock icon', () => {
               expect(TIME_ESCROW_TABS[1].icon).toBe('heroClock');
          });

          it('cancelEscrow tab should have heroTrash icon', () => {
               expect(TIME_ESCROW_TABS[2].icon).toBe('heroTrash');
          });
     });

     describe('TIME_ESCROW_TAB_META', () => {
          it('should have entries for createEscrow, finishEscrow, cancelEscrow', () => {
               expect(TIME_ESCROW_TAB_META['createEscrow']).toBeDefined();
               expect(TIME_ESCROW_TAB_META['finishEscrow']).toBeDefined();
               expect(TIME_ESCROW_TAB_META['cancelEscrow']).toBeDefined();
          });

          it('createEscrow meta should have correct title', () => {
               expect(TIME_ESCROW_TAB_META['createEscrow'].title).toBe('Create Escrow');
          });

          it('finishEscrow meta should have correct title', () => {
               expect(TIME_ESCROW_TAB_META['finishEscrow'].title).toBe('Finish Escrow');
          });

          it('cancelEscrow meta should have correct title', () => {
               expect(TIME_ESCROW_TAB_META['cancelEscrow'].title).toBe('Cancel Escrow');
          });

          it('createEscrow should have green-button-submenu colorClass', () => {
               expect(TIME_ESCROW_TAB_META['createEscrow'].colorClass).toContain('green');
          });

          it('each meta entry should have ng-icon iconType', () => {
               Object.values(TIME_ESCROW_TAB_META).forEach(meta => {
                    expect(meta.iconType).toBe('ng-icon');
               });
          });

          it('each meta entry should have a non-empty desc', () => {
               Object.values(TIME_ESCROW_TAB_META).forEach(meta => {
                    expect(meta.desc).toBeTruthy();
               });
          });
     });

     describe('CONDITIONAL_ESCROW_TABS', () => {
          it('should have 3 tabs', () => {
               expect(CONDITIONAL_ESCROW_TABS.length).toBe(3);
          });

          it('should have createEscrow as first tab', () => {
               expect(CONDITIONAL_ESCROW_TABS[0].key).toBe('createEscrow');
          });

          it('should have finishEscrow as second tab', () => {
               expect(CONDITIONAL_ESCROW_TABS[1].key).toBe('finishEscrow');
          });

          it('should have cancelEscrow as third tab', () => {
               expect(CONDITIONAL_ESCROW_TABS[2].key).toBe('cancelEscrow');
          });

          it('createEscrow tab should have ng-icon iconType', () => {
               expect(CONDITIONAL_ESCROW_TABS[0].iconType).toBe('ng-icon');
          });

          it('finishEscrow tab should have lucide-icon iconType (split-icon)', () => {
               expect(CONDITIONAL_ESCROW_TABS[1].iconType).toBe('lucide-icon');
               expect(CONDITIONAL_ESCROW_TABS[1].icon).toBe('split-icon');
          });

          it('cancelEscrow tab should have ng-icon iconType', () => {
               expect(CONDITIONAL_ESCROW_TABS[2].iconType).toBe('ng-icon');
          });

          it('createEscrow tab should have heroPlusCircle icon', () => {
               expect(CONDITIONAL_ESCROW_TABS[0].icon).toBe('heroPlusCircle');
          });

          it('cancelEscrow tab should have heroTrash icon', () => {
               expect(CONDITIONAL_ESCROW_TABS[2].icon).toBe('heroTrash');
          });
     });

     describe('CONDITIONAL_ESCROW_TAB_META', () => {
          it('should have entries for createEscrow, finishEscrow, cancelEscrow', () => {
               expect(CONDITIONAL_ESCROW_TAB_META['createEscrow']).toBeDefined();
               expect(CONDITIONAL_ESCROW_TAB_META['finishEscrow']).toBeDefined();
               expect(CONDITIONAL_ESCROW_TAB_META['cancelEscrow']).toBeDefined();
          });

          it('createEscrow meta should have correct title', () => {
               expect(CONDITIONAL_ESCROW_TAB_META['createEscrow'].title).toBe('Create Escrow');
          });

          it('finishEscrow meta should have correct title', () => {
               expect(CONDITIONAL_ESCROW_TAB_META['finishEscrow'].title).toBe('Finish Escrow');
          });

          it('cancelEscrow meta should have correct title', () => {
               expect(CONDITIONAL_ESCROW_TAB_META['cancelEscrow'].title).toBe('Cancel Escrow');
          });

          it('each meta entry should have a non-empty desc', () => {
               Object.values(CONDITIONAL_ESCROW_TAB_META).forEach(meta => {
                    expect(meta.desc).toBeTruthy();
               });
          });
     });
});
