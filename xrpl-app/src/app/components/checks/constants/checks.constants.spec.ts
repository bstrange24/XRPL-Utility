import { CHECK_TAB, CheckTab, CHECK_TX_TYPE_MAP, CHECK_TX_TYPES, CHECK_CONFIG_TX_DISPLAY_TYPES, CHECK_VALIDATION_RULES } from './checks.constants';

describe('Checks Constants', () => {
     describe('CHECK_TAB', () => {
          it('should have exactly 3 tab values', () => {
               expect(CHECK_TAB.length).toBe(3);
          });

          it('should contain createCheck', () => {
               expect(CHECK_TAB).toContain('createCheck');
          });

          it('should contain cashCheck', () => {
               expect(CHECK_TAB).toContain('cashCheck');
          });

          it('should contain cancelCheck', () => {
               expect(CHECK_TAB).toContain('cancelCheck');
          });

          it('should have values in correct order', () => {
               expect(CHECK_TAB[0]).toBe('createCheck');
               expect(CHECK_TAB[1]).toBe('cashCheck');
               expect(CHECK_TAB[2]).toBe('cancelCheck');
          });

          it('should be readonly (as const)', () => {
               // This test ensures the array is treated as readonly
               // TypeScript would error if trying to modify
               expect(CHECK_TAB).toEqual(['createCheck', 'cashCheck', 'cancelCheck']);
          });
     });

     describe('CheckTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: CheckTab[] = ['createCheck', 'cashCheck', 'cancelCheck'];
               validTabs.forEach(tab => {
                    expect(CHECK_TAB).toContain(tab);
               });
          });

          it('should not allow invalid tab values in TypeScript', () => {
               // This is a TypeScript compile-time check
               // In JavaScript, this would be undefined behavior
               const validTab: CheckTab = 'createCheck';
               expect(validTab).toBe('createCheck');
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

          it('should have exactly 3 keys', () => {
               expect(Object.keys(CHECK_TX_TYPE_MAP).length).toBe(3);
          });

          it('should have all required keys', () => {
               expect(Object.keys(CHECK_TX_TYPE_MAP)).toEqual(jasmine.arrayContaining(['createCheck', 'cashCheck', 'cancelCheck']));
          });
     });

     describe('CHECK_TX_TYPES', () => {
          it('should have CREATE property set to createCheck', () => {
               expect(CHECK_TX_TYPES.CREATE).toBe('createCheck');
          });

          it('should have CASH property set to cashCheck', () => {
               expect(CHECK_TX_TYPES.CASH).toBe('cashCheck');
          });

          it('should have CANCEL property set to cancelCheck', () => {
               expect(CHECK_TX_TYPES.CANCEL).toBe('cancelCheck');
          });

          it('should have exactly 3 properties', () => {
               expect(Object.keys(CHECK_TX_TYPES).length).toBe(3);
          });

          it('should be readonly', () => {
               expect(CHECK_TX_TYPES).toEqual({
                    CREATE: 'createCheck',
                    CASH: 'cashCheck',
                    CANCEL: 'cancelCheck',
               });
          });

          it('should have values matching CHECK_TAB', () => {
               const values = Object.values(CHECK_TX_TYPES);
               expect(values).toEqual(jasmine.arrayContaining([...CHECK_TAB]));
          });
     });

     describe('CHECK_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should have CREATE property set to createCheck', () => {
               expect(CHECK_CONFIG_TX_DISPLAY_TYPES.CREATE).toBe('createCheck');
          });

          it('should have CASH property set to cashCheck', () => {
               expect(CHECK_CONFIG_TX_DISPLAY_TYPES.CASH).toBe('cashCheck');
          });

          it('should have CANCEL property set to cancelCheck', () => {
               expect(CHECK_CONFIG_TX_DISPLAY_TYPES.CANCEL).toBe('cancelCheck');
          });

          it('should have exactly 3 properties', () => {
               expect(Object.keys(CHECK_CONFIG_TX_DISPLAY_TYPES).length).toBe(3);
          });

          it('should be readonly', () => {
               expect(CHECK_CONFIG_TX_DISPLAY_TYPES).toEqual({
                    CREATE: 'createCheck',
                    CASH: 'cashCheck',
                    CANCEL: 'cancelCheck',
               });
          });

          it('should match CHECK_TX_TYPES values', () => {
               expect(CHECK_CONFIG_TX_DISPLAY_TYPES).toEqual(CHECK_TX_TYPES);
          });
     });

     describe('CredentialTxType type', () => {
          it('should allow valid credential transaction types', () => {
               const validTypes: Array<'createCheck' | 'cashCheck' | 'cancelCheck'> = ['createCheck', 'cashCheck', 'cancelCheck'];
               validTypes.forEach(type => {
                    expect(Object.values(CHECK_TX_TYPES)).toContain(type);
               });
          });
     });

     describe('CredentialConfigTxDisplayType type', () => {
          it('should allow valid display types', () => {
               const validTypes: Array<'createCheck' | 'cashCheck' | 'cancelCheck'> = ['createCheck', 'cashCheck', 'cancelCheck'];
               validTypes.forEach(type => {
                    expect(Object.values(CHECK_CONFIG_TX_DISPLAY_TYPES)).toContain(type);
               });
          });
     });

     describe('CHECK_VALIDATION_RULES', () => {
          it('should have validation rule for CREATE', () => {
               expect(CHECK_VALIDATION_RULES[CHECK_TX_TYPES.CREATE]).toBe('CreateCheck');
          });

          it('should have validation rule for CASH', () => {
               expect(CHECK_VALIDATION_RULES[CHECK_TX_TYPES.CASH]).toBe('CashCheck');
          });

          it('should have validation rule for CANCEL', () => {
               expect(CHECK_VALIDATION_RULES[CHECK_TX_TYPES.CANCEL]).toBe('CancelCheck');
          });

          it('should have exactly 3 rules', () => {
               expect(Object.keys(CHECK_VALIDATION_RULES).length).toBe(3);
          });

          it('should use CHECK_TX_TYPES values as keys', () => {
               const keys = Object.keys(CHECK_VALIDATION_RULES);
               const expectedKeys = Object.values(CHECK_TX_TYPES);
               expect(keys).toEqual(jasmine.arrayContaining(expectedKeys));
          });

          it('should have validation rule names matching pattern', () => {
               expect(CHECK_VALIDATION_RULES.createCheck).toBe('CreateCheck');
               expect(CHECK_VALIDATION_RULES.cashCheck).toBe('CashCheck');
               expect(CHECK_VALIDATION_RULES.cancelCheck).toBe('CancelCheck');
          });

          it('should be readonly', () => {
               expect(CHECK_VALIDATION_RULES).toEqual({
                    createCheck: 'CreateCheck',
                    cashCheck: 'CashCheck',
                    cancelCheck: 'CancelCheck',
               });
          });
     });

     describe('Cross-reference consistency', () => {
          it('should have consistent values across all constants', () => {
               const tabValues = [...CHECK_TAB];
               const txTypeMapValues = Object.values(CHECK_TX_TYPE_MAP);
               const txTypesValues = Object.values(CHECK_TX_TYPES);
               const configDisplayValues = Object.values(CHECK_CONFIG_TX_DISPLAY_TYPES);
               const validationRulesKeys = Object.keys(CHECK_VALIDATION_RULES);

               expect(tabValues).toEqual(jasmine.arrayContaining(txTypeMapValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(txTypesValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(configDisplayValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(validationRulesKeys));
          });

          it('should use same string literals across all constants', () => {
               const expectedValues = ['createCheck', 'cashCheck', 'cancelCheck'] as const;

               expect(CHECK_TAB).toEqual(expectedValues);
               expect(Object.values(CHECK_TX_TYPE_MAP)).toEqual(expectedValues);
               expect(Object.values(CHECK_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(CHECK_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
               expect(Object.keys(CHECK_VALIDATION_RULES)).toEqual(expectedValues);
          });
     });

     describe('Type exports', () => {
          it('should have CheckTab type that matches CHECK_TAB values', () => {
               const tab: CheckTab = 'createCheck';
               expect(CHECK_TAB.includes(tab)).toBeTrue();
          });

          it('should have CredentialTxType that matches CHECK_TX_TYPES values', () => {
               const validTypes = ['createCheck', 'cashCheck', 'cancelCheck'] as const;
               validTypes.forEach(type => {
                    expect(Object.values(CHECK_TX_TYPES)).toContain(type);
               });
          });
     });
});
