import { TRUSTLINE_TAB, TrustlineTab, TRUSTLINE_TX_TYPE_MAP, TRUSTLINE_TX_TYPES, TRUSTLINE_CONFIG_TX_DISPLAY_TYPES, TrustlineTxType, TrustlineConfigTxDisplayType, TRUSTLINE_VALIDATION_RULES, SET_FLAGS, CLEAR_FLAGS, TRUSTLINE } from './trustline.constants';

describe('Trustline Constants', () => {
     describe('TRUSTLINE_TAB', () => {
          it('should have exactly 5 tab values', () => {
               expect(TRUSTLINE_TAB.length).toBe(5);
          });

          it('should contain all expected tabs', () => {
               expect(TRUSTLINE_TAB).toContain('setTrustline');
               expect(TRUSTLINE_TAB).toContain('removeTrustline');
               expect(TRUSTLINE_TAB).toContain('issueCurrency');
               expect(TRUSTLINE_TAB).toContain('clawbackTokens');
               expect(TRUSTLINE_TAB).toContain('addNewIssuers');
          });

          it('should have values in correct order', () => {
               expect(TRUSTLINE_TAB).toEqual(['setTrustline', 'removeTrustline', 'issueCurrency', 'clawbackTokens', 'addNewIssuers']);
          });

          it('should be readonly (as const)', () => {
               expect(TRUSTLINE_TAB).toEqual(['setTrustline', 'removeTrustline', 'issueCurrency', 'clawbackTokens', 'addNewIssuers']);
          });
     });

     describe('TrustlineTab & TrustlineTxType', () => {
          it('should allow valid tab values', () => {
               const validTabs: TrustlineTab[] = ['setTrustline', 'removeTrustline', 'issueCurrency', 'clawbackTokens', 'addNewIssuers'];
               validTabs.forEach(tab => expect(TRUSTLINE_TAB).toContain(tab));
          });
     });

     describe('TRUSTLINE_TX_TYPE_MAP', () => {
          it('should map all operations correctly', () => {
               expect(TRUSTLINE_TX_TYPE_MAP.setTrustline).toBe('TrustSet');
               expect(TRUSTLINE_TX_TYPE_MAP.removeTrustline).toBe('RemoveTrustline');
               expect(TRUSTLINE_TX_TYPE_MAP.issueCurrency).toBe('IssueCurrency');
               expect(TRUSTLINE_TX_TYPE_MAP.clawbackTokens).toBe('ClawbackTokens');
               expect(TRUSTLINE_TX_TYPE_MAP.addNewIssuers).toBe('AddNewIssuers');
          });

          it('should have exactly 5 keys', () => {
               expect(Object.keys(TRUSTLINE_TX_TYPE_MAP).length).toBe(5);
          });
     });

     describe('TRUSTLINE_TX_TYPES & CONFIG_TX_DISPLAY_TYPES', () => {
          it('should have all properties correctly set', () => {
               expect(TRUSTLINE_TX_TYPES.SET).toBe('setTrustline');
               expect(TRUSTLINE_TX_TYPES.REMOVE).toBe('removeTrustline');
               expect(TRUSTLINE_TX_TYPES.ISSUE).toBe('issueCurrency');
               expect(TRUSTLINE_TX_TYPES.CLAWBACK).toBe('clawbackTokens');
               expect(TRUSTLINE_TX_TYPES.ADD).toBe('addNewIssuers');
          });

          it('should match each other', () => {
               expect(TRUSTLINE_CONFIG_TX_DISPLAY_TYPES).toEqual(TRUSTLINE_TX_TYPES);
          });
     });

     describe('TRUSTLINE_VALIDATION_RULES', () => {
          it('should have validation rule for every type', () => {
               expect(TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.SET]).toBe('TrustSet');
               expect(TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.REMOVE]).toBe('RemoveTrustline');
               expect(TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.ISSUE]).toBe('IssueCurrency');
               expect(TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.CLAWBACK]).toBe('ClawbackTokens');
               expect(TRUSTLINE_VALIDATION_RULES[TRUSTLINE_TX_TYPES.ADD]).toBe('AddNewIssuers');
          });

          it('should have exactly 5 rules', () => {
               expect(Object.keys(TRUSTLINE_VALIDATION_RULES).length).toBe(5);
          });
     });

     describe('SET_FLAGS & CLEAR_FLAGS', () => {
          it('should have correct number of flags', () => {
               expect(SET_FLAGS.length).toBe(4);
               expect(CLEAR_FLAGS.length).toBe(3);
          });

          it('should have valid flag structure', () => {
               [...SET_FLAGS, ...CLEAR_FLAGS].forEach(flag => {
                    expect(flag.key).toBeDefined();
                    expect(flag.title).toBeDefined();
                    expect(flag.hex).toMatch(/^0x[0-9A-Fa-f]+$/);
                    expect(flag.desc.length).toBeGreaterThan(5);
               });
          });
     });

     describe('TRUSTLINE object', () => {
          it('should have all required properties', () => {
               expect(TRUSTLINE.FLAGS).toBeDefined();
               expect(TRUSTLINE.FLAG_LIST).toBeDefined();
               expect(TRUSTLINE.FLAG_MAP).toBeDefined();
               expect(TRUSTLINE.LEDGER_FLAG_MAP).toBeDefined();
               expect(TRUSTLINE.CONFLICTS).toBeDefined();
          });

          it('should have correct flag conflicts', () => {
               expect(TRUSTLINE.CONFLICTS['tfSetNoRipple']).toEqual(['tfClearNoRipple']);
               expect(TRUSTLINE.CONFLICTS['tfSetFreeze']).toEqual(['tfClearFreeze']);
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['setTrustline', 'removeTrustline', 'issueCurrency', 'clawbackTokens', 'addNewIssuers'] as const;

          it('should have consistent values across constants', () => {
               expect([...TRUSTLINE_TAB]).toEqual(expectedValues);
               expect(Object.values(TRUSTLINE_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(TRUSTLINE_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
          });
     });
});
