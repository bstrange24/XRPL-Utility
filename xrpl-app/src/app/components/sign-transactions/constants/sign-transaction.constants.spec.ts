import { SIGN_TRANSACTION_TAB, SendXrpTab, SIGN_TRANSACTION_TX_TYPE_MAP, SIGN_TRANSACTION_TX_TYPES, SIGN_TRANSACTION_CONFIG_TX_DISPLAY_TYPES, SendXrpTxType, SignTransactionConfigTxDisplayType, SIGN_TRANSACTION_VALIDATION_RULES } from './sign-transaction.constants';

describe('Sign Transaction Constants', () => {
     describe('SIGN_TRANSACTION_TAB', () => {
          it('should have exactly 1 tab value', () => {
               expect(SIGN_TRANSACTION_TAB.length).toBe(1);
          });

          it('should contain sendXrp', () => {
               expect(SIGN_TRANSACTION_TAB).toContain('sendXrp');
          });

          it('should have correct value', () => {
               expect(SIGN_TRANSACTION_TAB[0]).toBe('sendXrp');
          });

          it('should be readonly (as const)', () => {
               expect(SIGN_TRANSACTION_TAB).toEqual(['sendXrp']);
          });
     });

     describe('SendXrpTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: SendXrpTab[] = ['sendXrp'];
               validTabs.forEach(tab => {
                    expect(SIGN_TRANSACTION_TAB).toContain(tab);
               });
          });
     });

     describe('SIGN_TRANSACTION_TX_TYPE_MAP', () => {
          it('should map send to PaymentXrp', () => {
               expect(SIGN_TRANSACTION_TX_TYPE_MAP.send).toBe('PaymentXrp');
          });

          it('should have exactly 1 key', () => {
               expect(Object.keys(SIGN_TRANSACTION_TX_TYPE_MAP).length).toBe(1);
          });
     });

     describe('SIGN_TRANSACTION_TX_TYPES', () => {
          it('should have SEND property set to sendXrp', () => {
               expect(SIGN_TRANSACTION_TX_TYPES.SEND).toBe('sendXrp');
          });

          it('should have exactly 1 property', () => {
               expect(Object.keys(SIGN_TRANSACTION_TX_TYPES).length).toBe(1);
          });
     });

     describe('SIGN_TRANSACTION_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match SIGN_TRANSACTION_TX_TYPES', () => {
               expect(SIGN_TRANSACTION_CONFIG_TX_DISPLAY_TYPES).toEqual(SIGN_TRANSACTION_TX_TYPES);
          });
     });

     describe('SIGN_TRANSACTION_VALIDATION_RULES', () => {
          it('should have validation rule for SEND', () => {
               expect(SIGN_TRANSACTION_VALIDATION_RULES[SIGN_TRANSACTION_TX_TYPES.SEND]).toBe('PaymentXrp');
          });

          it('should have exactly 1 rule', () => {
               expect(Object.keys(SIGN_TRANSACTION_VALIDATION_RULES).length).toBe(1);
          });

          it('should be readonly', () => {
               expect(SIGN_TRANSACTION_VALIDATION_RULES).toEqual({
                    sendXrp: 'PaymentXrp',
               });
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValue = ['sendXrp'] as const;

          it('should have consistent values across constants', () => {
               expect([...SIGN_TRANSACTION_TAB]).toEqual(expectedValue);
               expect(Object.values(SIGN_TRANSACTION_TX_TYPES)).toEqual(expectedValue);
               expect(Object.values(SIGN_TRANSACTION_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValue);
          });
     });
});
