import { CHECK_TAB, CHECK_TX_TYPES, CHECK_TX_TYPE_MAP, CHECK_VALIDATION_RULES } from './checks.constants';

describe('checks.constants', () => {
     describe('CHECK_TAB', () => {
          it('should contain createCheck', () => {
               expect(CHECK_TAB).toContain('createCheck');
          });

          it('should contain cashCheck', () => {
               expect(CHECK_TAB).toContain('cashCheck');
          });

          it('should contain cancelCheck', () => {
               expect(CHECK_TAB).toContain('cancelCheck');
          });

          it('should have exactly 3 tabs', () => {
               expect(CHECK_TAB.length).toBe(3);
          });
     });

     describe('CHECK_TX_TYPES', () => {
          it('should have CREATE = createCheck', () => {
               expect(CHECK_TX_TYPES.CREATE).toBe('createCheck');
          });

          it('should have CASH = cashCheck', () => {
               expect(CHECK_TX_TYPES.CASH).toBe('cashCheck');
          });

          it('should have CANCEL = cancelCheck', () => {
               expect(CHECK_TX_TYPES.CANCEL).toBe('cancelCheck');
          });
     });

     describe('CHECK_TX_TYPE_MAP', () => {
          it('should map createCheck to createCheck', () => {
               expect(CHECK_TX_TYPE_MAP.createCheck).toBe('createCheck');
          });

          it('should map cashCheck to cashCheck', () => {
               expect(CHECK_TX_TYPE_MAP.cashCheck).toBe('cashCheck');
          });

          it('should map cancelCheck to cancelCheck', () => {
               expect(CHECK_TX_TYPE_MAP.cancelCheck).toBe('cancelCheck');
          });
     });

     describe('CHECK_VALIDATION_RULES', () => {
          it('should map createCheck to CreateCheck rule', () => {
               expect(CHECK_VALIDATION_RULES['createCheck']).toBe('CreateCheck');
          });

          it('should map cashCheck to CashCheck rule', () => {
               expect(CHECK_VALIDATION_RULES['cashCheck']).toBe('CashCheck');
          });

          it('should map cancelCheck to CancelCheck rule', () => {
               expect(CHECK_VALIDATION_RULES['cancelCheck']).toBe('CancelCheck');
          });

          it('should have exactly 3 rules', () => {
               expect(Object.keys(CHECK_VALIDATION_RULES).length).toBe(3);
          });
     });
});
