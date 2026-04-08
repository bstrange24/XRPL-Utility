import { CHECK_TABS, CHECK_TAB_META } from './checks.ui';

describe('checks.ui', () => {
     describe('CHECK_TABS', () => {
          it('should have 3 tabs', () => {
               expect(CHECK_TABS.length).toBe(3);
          });

          it('should have createCheck as first tab', () => {
               expect(CHECK_TABS[0].key).toBe('createCheck');
          });

          it('should have cashCheck as second tab', () => {
               expect(CHECK_TABS[1].key).toBe('cashCheck');
          });

          it('should have cancelCheck as third tab', () => {
               expect(CHECK_TABS[2].key).toBe('cancelCheck');
          });

          it('should have a label for each tab', () => {
               CHECK_TABS.forEach(tab => {
                    expect(tab.label).toBeTruthy();
               });
          });

          it('should have ng-icon as iconType for all tabs', () => {
               CHECK_TABS.forEach(tab => {
                    expect(tab.iconType).toBe('ng-icon');
               });
          });

          it('should have an icon for each tab', () => {
               CHECK_TABS.forEach(tab => {
                    expect(tab.icon).toBeTruthy();
               });
          });

          it('createCheck tab should have heroPlusCircle icon', () => {
               expect(CHECK_TABS[0].icon).toBe('heroPlusCircle');
          });

          it('cashCheck tab should have heroCurrencyDollar icon', () => {
               expect(CHECK_TABS[1].icon).toBe('heroCurrencyDollar');
          });

          it('cancelCheck tab should have heroTrash icon', () => {
               expect(CHECK_TABS[2].icon).toBe('heroTrash');
          });
     });

     describe('CHECK_TAB_META', () => {
          it('should have entries for createCheck, cashCheck, cancelCheck', () => {
               expect(CHECK_TAB_META['createCheck']).toBeDefined();
               expect(CHECK_TAB_META['cashCheck']).toBeDefined();
               expect(CHECK_TAB_META['cancelCheck']).toBeDefined();
          });

          it('createCheck meta should have correct title', () => {
               expect(CHECK_TAB_META['createCheck'].title).toBe('Create Check');
          });

          it('cashCheck meta should have correct title', () => {
               expect(CHECK_TAB_META['cashCheck'].title).toBe('Cash Check');
          });

          it('cancelCheck meta should have correct title', () => {
               expect(CHECK_TAB_META['cancelCheck'].title).toBe('Cancel Check');
          });

          it('createCheck should have blue colorClass', () => {
               expect(CHECK_TAB_META['createCheck'].colorClass).toContain('blue');
          });

          it('cashCheck should have green colorClass', () => {
               expect(CHECK_TAB_META['cashCheck'].colorClass).toContain('green');
          });

          it('cancelCheck should have red colorClass', () => {
               expect(CHECK_TAB_META['cancelCheck'].colorClass).toContain('red');
          });

          it('each meta entry should have ng-icon iconType', () => {
               Object.values(CHECK_TAB_META).forEach(meta => {
                    expect(meta.iconType).toBe('ng-icon');
               });
          });

          it('each meta entry should have a non-empty desc', () => {
               Object.values(CHECK_TAB_META).forEach(meta => {
                    expect(meta.desc).toBeTruthy();
               });
          });
     });
});
