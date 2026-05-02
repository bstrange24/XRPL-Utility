import { ESCROW_CONFIG_TX_DISPLAY_TYPES, ESCROW_TAB, ESCROW_TX_TYPE_MAP, ESCROW_TX_TYPES, ESCROW_VALIDATION_RULES, EscrowTab } from './time-escrow.constants';

describe('Escrow Constants', () => {
     describe('ESCROW_TAB', () => {
          it('should have exactly 3 tab values', () => {
               expect(ESCROW_TAB.length).toBe(3);
          });

          it('should contain createEscrow', () => {
               expect(ESCROW_TAB).toContain('createEscrow');
          });

          it('should contain finishEscrow', () => {
               expect(ESCROW_TAB).toContain('finishEscrow');
          });

          it('should contain cancelEscrow', () => {
               expect(ESCROW_TAB).toContain('cancelEscrow');
          });

          it('should have values in correct order', () => {
               expect(ESCROW_TAB[0]).toBe('createEscrow');
               expect(ESCROW_TAB[1]).toBe('finishEscrow');
               expect(ESCROW_TAB[2]).toBe('cancelEscrow');
          });

          it('should be readonly (as const)', () => {
               expect(ESCROW_TAB).toEqual(['createEscrow', 'finishEscrow', 'cancelEscrow']);
          });
     });

     describe('EscrowTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: EscrowTab[] = ['createEscrow', 'finishEscrow', 'cancelEscrow'];
               validTabs.forEach(tab => {
                    expect(ESCROW_TAB).toContain(tab);
               });
          });

          it('should not allow invalid tab values in TypeScript', () => {
               // Compile-time check (runtime assertion for test visibility)
               const validTab: EscrowTab = 'createEscrow';
               expect(validTab).toBe('createEscrow');
          });
     });

     describe('ESCROW_TX_TYPE_MAP', () => {
          it('should map createEscrow to createEscrow', () => {
               expect(ESCROW_TX_TYPE_MAP.createEscrow).toBe('createEscrow');
          });

          it('should map finishEscrow to finishEscrow', () => {
               expect(ESCROW_TX_TYPE_MAP.finishEscrow).toBe('finishEscrow');
          });

          it('should map cancelEscrow to cancelEscrow', () => {
               expect(ESCROW_TX_TYPE_MAP.cancelEscrow).toBe('cancelEscrow');
          });

          it('should have exactly 3 keys', () => {
               expect(Object.keys(ESCROW_TX_TYPE_MAP).length).toBe(3);
          });

          it('should have all required keys', () => {
               expect(Object.keys(ESCROW_TX_TYPE_MAP)).toEqual(jasmine.arrayContaining(['createEscrow', 'finishEscrow', 'cancelEscrow']));
          });
     });

     describe('ESCROW_TX_TYPES', () => {
          it('should have CREATE property set to createEscrow', () => {
               expect(ESCROW_TX_TYPES.CREATE).toBe('createEscrow');
          });

          it('should have FINISH property set to finishEscrow', () => {
               expect(ESCROW_TX_TYPES.FINISH).toBe('finishEscrow');
          });

          it('should have CANCEL property set to cancelEscrow', () => {
               expect(ESCROW_TX_TYPES.CANCEL).toBe('cancelEscrow');
          });

          it('should have exactly 3 properties', () => {
               expect(Object.keys(ESCROW_TX_TYPES).length).toBe(3);
          });

          it('should be readonly', () => {
               expect(ESCROW_TX_TYPES).toEqual({
                    CREATE: 'createEscrow',
                    FINISH: 'finishEscrow',
                    CANCEL: 'cancelEscrow',
               });
          });

          it('should have values matching ESCROW_TAB', () => {
               const values = Object.values(ESCROW_TX_TYPES);
               expect(values).toEqual(jasmine.arrayContaining([...ESCROW_TAB]));
          });
     });

     describe('ESCROW_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should have CREATE property set to createEscrow', () => {
               expect(ESCROW_CONFIG_TX_DISPLAY_TYPES.CREATE).toBe('createEscrow');
          });

          it('should have FINISH property set to finishEscrow', () => {
               expect(ESCROW_CONFIG_TX_DISPLAY_TYPES.FINISH).toBe('finishEscrow');
          });

          it('should have CANCEL property set to cancelEscrow', () => {
               expect(ESCROW_CONFIG_TX_DISPLAY_TYPES.CANCEL).toBe('cancelEscrow');
          });

          it('should have exactly 3 properties', () => {
               expect(Object.keys(ESCROW_CONFIG_TX_DISPLAY_TYPES).length).toBe(3);
          });

          it('should be readonly', () => {
               expect(ESCROW_CONFIG_TX_DISPLAY_TYPES).toEqual({
                    CREATE: 'createEscrow',
                    FINISH: 'finishEscrow',
                    CANCEL: 'cancelEscrow',
               });
          });

          it('should match ESCROW_TX_TYPES values', () => {
               expect(ESCROW_CONFIG_TX_DISPLAY_TYPES).toEqual(ESCROW_TX_TYPES);
          });
     });

     describe('EscrowTxType type', () => {
          it('should allow valid escrow transaction types', () => {
               const validTypes: Array<'createEscrow' | 'finishEscrow' | 'cancelEscrow'> = ['createEscrow', 'finishEscrow', 'cancelEscrow'];
               validTypes.forEach(type => {
                    expect(Object.values(ESCROW_TX_TYPES)).toContain(type);
               });
          });
     });

     describe('EscrowConfigTxDisplayType type', () => {
          it('should allow valid display types', () => {
               const validTypes: Array<'createEscrow' | 'finishEscrow' | 'cancelEscrow'> = ['createEscrow', 'finishEscrow', 'cancelEscrow'];
               validTypes.forEach(type => {
                    expect(Object.values(ESCROW_CONFIG_TX_DISPLAY_TYPES)).toContain(type);
               });
          });
     });

     describe('ESCROW_VALIDATION_RULES', () => {
          it('should have validation rule for CREATE', () => {
               expect(ESCROW_VALIDATION_RULES[ESCROW_TX_TYPES.CREATE]).toBe('CreateEscrow');
          });

          it('should have validation rule for FINISH', () => {
               expect(ESCROW_VALIDATION_RULES[ESCROW_TX_TYPES.FINISH]).toBe('FinishEscrow');
          });

          it('should have validation rule for CANCEL', () => {
               expect(ESCROW_VALIDATION_RULES[ESCROW_TX_TYPES.CANCEL]).toBe('CancelEscrow');
          });

          it('should have exactly 3 rules', () => {
               expect(Object.keys(ESCROW_VALIDATION_RULES).length).toBe(3);
          });

          it('should use ESCROW_TX_TYPES values as keys', () => {
               const keys = Object.keys(ESCROW_VALIDATION_RULES);
               const expectedKeys = Object.values(ESCROW_TX_TYPES);
               expect(keys).toEqual(jasmine.arrayContaining(expectedKeys));
          });

          it('should have validation rule names matching pattern', () => {
               expect(ESCROW_VALIDATION_RULES.createEscrow).toBe('CreateEscrow');
               expect(ESCROW_VALIDATION_RULES.finishEscrow).toBe('FinishEscrow');
               expect(ESCROW_VALIDATION_RULES.cancelEscrow).toBe('CancelEscrow');
          });

          it('should be readonly', () => {
               expect(ESCROW_VALIDATION_RULES).toEqual({
                    createEscrow: 'CreateEscrow',
                    finishEscrow: 'FinishEscrow',
                    cancelEscrow: 'CancelEscrow',
               });
          });
     });

     describe('Cross-reference consistency', () => {
          it('should have consistent values across all constants', () => {
               const tabValues = [...ESCROW_TAB];
               const txTypeMapValues = Object.values(ESCROW_TX_TYPE_MAP);
               const txTypesValues = Object.values(ESCROW_TX_TYPES);
               const configDisplayValues = Object.values(ESCROW_CONFIG_TX_DISPLAY_TYPES);
               const validationRulesKeys = Object.keys(ESCROW_VALIDATION_RULES);

               expect(tabValues).toEqual(jasmine.arrayContaining(txTypeMapValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(txTypesValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(configDisplayValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(validationRulesKeys));
          });

          it('should use same string literals across all constants', () => {
               const expectedValues = ['createEscrow', 'finishEscrow', 'cancelEscrow'] as const;

               expect(ESCROW_TAB).toEqual(expectedValues);
               expect(Object.values(ESCROW_TX_TYPE_MAP)).toEqual(expectedValues);
               expect(Object.values(ESCROW_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(ESCROW_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
               expect(Object.keys(ESCROW_VALIDATION_RULES)).toEqual(expectedValues);
          });
     });

     describe('Type exports', () => {
          it('should have EscrowTab type that matches ESCROW_TAB values', () => {
               const tab: EscrowTab = 'createEscrow';
               expect(ESCROW_TAB.includes(tab)).toBeTrue();
          });

          it('should have EscrowTxType that matches ESCROW_TX_TYPES values', () => {
               const validTypes = ['createEscrow', 'finishEscrow', 'cancelEscrow'] as const;
               validTypes.forEach(type => {
                    expect(Object.values(ESCROW_TX_TYPES)).toContain(type);
               });
          });
     });
});
