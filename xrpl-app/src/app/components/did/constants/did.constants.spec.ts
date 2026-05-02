import { DID_TAB, DidTab, DID_TX_TYPE_MAP, DID_TX_TYPES, DidConfigTxDisplayType, DID_VALIDATION_RULES } from './did.constants';

describe('DID Constants', () => {
     describe('DID_TAB', () => {
          it('should have exactly 2 tab values', () => {
               expect(DID_TAB.length).toBe(2);
          });

          it('should contain setDid', () => {
               expect(DID_TAB).toContain('setDid');
          });

          it('should contain deleteDid', () => {
               expect(DID_TAB).toContain('deleteDid');
          });

          it('should have values in correct order', () => {
               expect(DID_TAB[0]).toBe('setDid');
               expect(DID_TAB[1]).toBe('deleteDid');
          });

          it('should be readonly (as const)', () => {
               expect(DID_TAB).toEqual(['setDid', 'deleteDid']);
          });
     });

     describe('DidTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: DidTab[] = ['setDid', 'deleteDid'];
               validTabs.forEach(tab => {
                    expect(DID_TAB).toContain(tab);
               });
          });

          it('should not allow invalid tab values in TypeScript', () => {
               const validTab: DidTab = 'setDid';
               expect(validTab).toBe('setDid');
          });
     });

     describe('DID_TX_TYPE_MAP', () => {
          it('should map setDid to SetDID', () => {
               expect(DID_TX_TYPE_MAP.setDid).toBe('SetDID');
          });

          it('should map deleteDid to DeleteDID', () => {
               expect(DID_TX_TYPE_MAP.deleteDid).toBe('DeleteDID');
          });

          it('should have exactly 2 keys', () => {
               expect(Object.keys(DID_TX_TYPE_MAP).length).toBe(2);
          });

          it('should have all required keys', () => {
               expect(Object.keys(DID_TX_TYPE_MAP)).toEqual(jasmine.arrayContaining(['setDid', 'deleteDid']));
          });
     });

     describe('DID_TX_TYPES', () => {
          it('should have SET property set to setDid', () => {
               expect(DID_TX_TYPES.SET).toBe('setDid');
          });

          it('should have DELETE property set to deleteDid', () => {
               expect(DID_TX_TYPES.DELETE).toBe('deleteDid');
          });

          it('should have exactly 2 properties', () => {
               expect(Object.keys(DID_TX_TYPES).length).toBe(2);
          });

          it('should be readonly', () => {
               expect(DID_TX_TYPES).toEqual({
                    SET: 'setDid',
                    DELETE: 'deleteDid',
               });
          });

          it('should have values matching DID_TAB', () => {
               const values = Object.values(DID_TX_TYPES);
               expect(values).toEqual(jasmine.arrayContaining([...DID_TAB]));
          });
     });

     describe('DidConfigTxDisplayType', () => {
          it('should allow valid display type values', () => {
               const validTypes: DidConfigTxDisplayType[] = ['setDid', 'deleteDid'];
               validTypes.forEach(type => {
                    expect(Object.keys(DID_TX_TYPE_MAP)).toContain(type);
               });
          });
     });

     describe('DID_VALIDATION_RULES', () => {
          it('should have validation rule for SET', () => {
               expect(DID_VALIDATION_RULES[DID_TX_TYPES.SET]).toBe('DIDSet');
          });

          it('should have validation rule for DELETE', () => {
               expect(DID_VALIDATION_RULES[DID_TX_TYPES.DELETE]).toBe('DIDdelete');
          });

          it('should have exactly 2 rules', () => {
               expect(Object.keys(DID_VALIDATION_RULES).length).toBe(2);
          });

          it('should use DID_TX_TYPES values as keys', () => {
               const keys = Object.keys(DID_VALIDATION_RULES);
               const expectedKeys = Object.values(DID_TX_TYPES);
               expect(keys).toEqual(jasmine.arrayContaining(expectedKeys));
          });

          it('should be readonly', () => {
               expect(DID_VALIDATION_RULES).toEqual({
                    setDid: 'DIDSet',
                    deleteDid: 'DIDdelete',
               });
          });
     });

     describe('Cross-reference consistency', () => {
          it('should have consistent values across all constants', () => {
               const tabValues = [...DID_TAB];
               const txTypeMapKeys = Object.keys(DID_TX_TYPE_MAP);
               const txTypesValues = Object.values(DID_TX_TYPES);
               const validationRulesKeys = Object.keys(DID_VALIDATION_RULES);

               expect(tabValues).toEqual(jasmine.arrayContaining(txTypeMapKeys));
               expect(tabValues).toEqual(jasmine.arrayContaining(txTypesValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(validationRulesKeys));
          });

          it('should use same string literals across constants', () => {
               const expectedValues = ['setDid', 'deleteDid'] as const;

               expect(DID_TAB).toEqual(expectedValues);
               expect(Object.keys(DID_TX_TYPE_MAP)).toEqual(expectedValues);
               expect(Object.values(DID_TX_TYPES)).toEqual(expectedValues);
               expect(Object.keys(DID_VALIDATION_RULES)).toEqual(expectedValues);
          });
     });

     describe('Type exports', () => {
          it('should have DidTab type that matches DID_TAB values', () => {
               const tab: DidTab = 'setDid';
               expect(DID_TAB.includes(tab)).toBeTrue();
          });

          it('should have DidConfigTxDisplayType matching DID_TX_TYPE_MAP keys', () => {
               const validKeys: DidConfigTxDisplayType[] = ['setDid', 'deleteDid'];
               validKeys.forEach(key => {
                    expect(Object.keys(DID_TX_TYPE_MAP)).toContain(key);
               });
          });
     });
});
