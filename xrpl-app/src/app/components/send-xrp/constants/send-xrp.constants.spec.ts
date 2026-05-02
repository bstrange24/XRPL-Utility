import { SEND_XRP_TAB, SendXrpTab, SEND_XRP_TX_TYPE_MAP, SEND_XRP_TX_TYPES, SEND_XRP_CONFIG_TX_DISPLAY_TYPES, SendXrpTxType, SendXrpConfigTxDisplayType, SEND_XRP_VALIDATION_RULES } from './send-xrp.constants';

describe('Send XRP Constants', () => {
     describe('SEND_XRP_TAB', () => {
          it('should have exactly 1 tab value', () => {
               expect(SEND_XRP_TAB.length).toBe(1);
          });

          it('should contain sendXrp', () => {
               expect(SEND_XRP_TAB).toContain('sendXrp');
          });

          it('should have correct value', () => {
               expect(SEND_XRP_TAB[0]).toBe('sendXrp');
          });

          it('should be readonly (as const)', () => {
               expect(SEND_XRP_TAB).toEqual(['sendXrp']);
          });
     });

     describe('SendXrpTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: SendXrpTab[] = ['sendXrp'];
               validTabs.forEach(tab => {
                    expect(SEND_XRP_TAB).toContain(tab);
               });
          });
     });

     describe('SEND_XRP_TX_TYPE_MAP', () => {
          it('should map send to PaymentXrp', () => {
               expect(SEND_XRP_TX_TYPE_MAP.send).toBe('PaymentXrp');
          });

          it('should have exactly 1 key', () => {
               expect(Object.keys(SEND_XRP_TX_TYPE_MAP).length).toBe(1);
          });
     });

     describe('SEND_XRP_TX_TYPES', () => {
          it('should have SEND property set to sendXrp', () => {
               expect(SEND_XRP_TX_TYPES.SEND).toBe('sendXrp');
          });

          it('should have exactly 1 property', () => {
               expect(Object.keys(SEND_XRP_TX_TYPES).length).toBe(1);
          });
     });

     describe('SEND_XRP_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match SEND_XRP_TX_TYPES', () => {
               expect(SEND_XRP_CONFIG_TX_DISPLAY_TYPES).toEqual(SEND_XRP_TX_TYPES);
          });
     });

     describe('SEND_XRP_VALIDATION_RULES', () => {
          it('should have validation rule for SEND', () => {
               expect(SEND_XRP_VALIDATION_RULES[SEND_XRP_TX_TYPES.SEND]).toBe('PaymentXrp');
          });

          it('should have exactly 1 rule', () => {
               expect(Object.keys(SEND_XRP_VALIDATION_RULES).length).toBe(1);
          });

          it('should be readonly', () => {
               expect(SEND_XRP_VALIDATION_RULES).toEqual({
                    sendXrp: 'PaymentXrp',
               });
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValue = ['sendXrp'] as const;

          it('should have consistent values across constants', () => {
               expect([...SEND_XRP_TAB]).toEqual(expectedValue);
               expect(Object.values(SEND_XRP_TX_TYPES)).toEqual(expectedValue);
               expect(Object.values(SEND_XRP_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValue);
          });
     });
});
