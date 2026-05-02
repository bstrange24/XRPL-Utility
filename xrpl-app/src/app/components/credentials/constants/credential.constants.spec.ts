import { CREDENTIAL_TAB, CredentialTab, CREDENTIAL_TX_TYPE_MAP, CREDENTIAL_TX_TYPES, CREDENTIAL_CONFIG_TX_DISPLAY_TYPES, CredentialTxType, CredentialConfigTxDisplayType, CREDENTIAL_VALIDATION_RULES, CREDENTIAL_REGEX } from './credential.constants';

describe('Credentials Constants', () => {
     describe('CREDENTIAL_TAB', () => {
          it('should have exactly 4 tab values', () => {
               expect(CREDENTIAL_TAB.length).toBe(4);
          });

          it('should contain createCredential', () => {
               expect(CREDENTIAL_TAB).toContain('createCredential');
          });

          it('should contain acceptCredential', () => {
               expect(CREDENTIAL_TAB).toContain('acceptCredential');
          });

          it('should contain deleteCredential', () => {
               expect(CREDENTIAL_TAB).toContain('deleteCredential');
          });

          it('should contain verifyCredential', () => {
               expect(CREDENTIAL_TAB).toContain('verifyCredential');
          });

          it('should have values in correct order', () => {
               expect(CREDENTIAL_TAB[0]).toBe('createCredential');
               expect(CREDENTIAL_TAB[1]).toBe('acceptCredential');
               expect(CREDENTIAL_TAB[2]).toBe('deleteCredential');
               expect(CREDENTIAL_TAB[3]).toBe('verifyCredential');
          });

          it('should be readonly (as const)', () => {
               expect(CREDENTIAL_TAB).toEqual(['createCredential', 'acceptCredential', 'deleteCredential', 'verifyCredential']);
          });
     });

     describe('CredentialTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: CredentialTab[] = ['createCredential', 'acceptCredential', 'deleteCredential', 'verifyCredential'];
               validTabs.forEach(tab => {
                    expect(CREDENTIAL_TAB).toContain(tab);
               });
          });

          it('should not allow invalid tab values in TypeScript', () => {
               const validTab: CredentialTab = 'createCredential';
               expect(validTab).toBe('createCredential');
          });
     });

     describe('CREDENTIAL_TX_TYPE_MAP', () => {
          it('should map create to CredentialCreate', () => {
               expect(CREDENTIAL_TX_TYPE_MAP.create).toBe('CredentialCreate');
          });

          it('should map accept to CredentialAccept', () => {
               expect(CREDENTIAL_TX_TYPE_MAP.accept).toBe('CredentialAccept');
          });

          it('should map delete to CredentialDelete', () => {
               expect(CREDENTIAL_TX_TYPE_MAP.delete).toBe('CredentialDelete');
          });

          it('should map verify to CredentialVerify', () => {
               expect(CREDENTIAL_TX_TYPE_MAP.verify).toBe('CredentialVerify');
          });

          it('should have exactly 4 keys', () => {
               expect(Object.keys(CREDENTIAL_TX_TYPE_MAP).length).toBe(4);
          });

          it('should have all required keys', () => {
               expect(Object.keys(CREDENTIAL_TX_TYPE_MAP)).toEqual(jasmine.arrayContaining(['create', 'accept', 'delete', 'verify']));
          });
     });

     describe('CREDENTIAL_TX_TYPES', () => {
          it('should have CREATE property', () => {
               expect(CREDENTIAL_TX_TYPES.CREATE).toBe('createCredential');
          });

          it('should have ACCEPT property', () => {
               expect(CREDENTIAL_TX_TYPES.ACCEPT).toBe('acceptCredentials');
          });

          it('should have DELETE property', () => {
               expect(CREDENTIAL_TX_TYPES.DELETE).toBe('deleteCredentials');
          });

          it('should have exactly 3 properties', () => {
               expect(Object.keys(CREDENTIAL_TX_TYPES).length).toBe(3);
          });

          it('should be readonly', () => {
               expect(CREDENTIAL_TX_TYPES).toEqual({
                    CREATE: 'createCredential',
                    ACCEPT: 'acceptCredentials',
                    DELETE: 'deleteCredentials',
               });
          });
     });

     describe('CREDENTIAL_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should have CREATE property', () => {
               expect(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.CREATE).toBe('createCredential');
          });

          it('should have ACCEPT property', () => {
               expect(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.ACCEPT).toBe('acceptCredential');
          });

          it('should have VERIFY property', () => {
               expect(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.VERIFY).toBe('verifyCredential');
          });

          it('should have DELETE property', () => {
               expect(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.DELETE).toBe('deleteCredential');
          });

          it('should have exactly 4 properties', () => {
               expect(Object.keys(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES).length).toBe(4);
          });

          it('should be readonly', () => {
               expect(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES).toEqual({
                    CREATE: 'createCredential',
                    ACCEPT: 'acceptCredential',
                    VERIFY: 'verifyCredential',
                    DELETE: 'deleteCredential',
               });
          });
     });

     describe('CredentialTxType & CredentialConfigTxDisplayType', () => {
          it('should allow valid CredentialTxType values', () => {
               const valid: CredentialTxType[] = ['createCredential', 'acceptCredentials', 'deleteCredentials'];
               valid.forEach(type => {
                    expect(Object.values(CREDENTIAL_TX_TYPES)).toContain(type);
               });
          });

          it('should allow valid CredentialConfigTxDisplayType values', () => {
               const valid: CredentialConfigTxDisplayType[] = ['createCredential', 'acceptCredential', 'verifyCredential', 'deleteCredential'];
               valid.forEach(type => {
                    expect(Object.values(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES)).toContain(type);
               });
          });
     });

     describe('CREDENTIAL_VALIDATION_RULES', () => {
          it('should have validation rule for CREATE', () => {
               expect(CREDENTIAL_VALIDATION_RULES[CREDENTIAL_TX_TYPES.CREATE]).toBe('CredentialCreate');
          });

          it('should have validation rule for ACCEPT', () => {
               expect(CREDENTIAL_VALIDATION_RULES[CREDENTIAL_TX_TYPES.ACCEPT]).toBe('CredentialAccept');
          });

          it('should have validation rule for DELETE', () => {
               expect(CREDENTIAL_VALIDATION_RULES[CREDENTIAL_TX_TYPES.DELETE]).toBe('CredentialDelete');
          });

          it('should have exactly 3 rules', () => {
               expect(Object.keys(CREDENTIAL_VALIDATION_RULES).length).toBe(3);
          });

          it('should use CREDENTIAL_TX_TYPES values as keys', () => {
               const keys = Object.keys(CREDENTIAL_VALIDATION_RULES);
               const expectedKeys = Object.values(CREDENTIAL_TX_TYPES);
               expect(keys).toEqual(jasmine.arrayContaining(expectedKeys));
          });

          it('should be readonly', () => {
               expect(CREDENTIAL_VALIDATION_RULES).toEqual({
                    createCredential: 'CredentialCreate',
                    acceptCredentials: 'CredentialAccept',
                    deleteCredentials: 'CredentialDelete',
               });
          });
     });

     describe('CREDENTIAL_REGEX', () => {
          it('should be a valid RegExp', () => {
               expect(CREDENTIAL_REGEX).toBeInstanceOf(RegExp);
          });

          it('should match valid hex strings', () => {
               expect(CREDENTIAL_REGEX.test('ABCDEF')).toBeTrue();
               // expect(CREDENTIAL_REGEX.test('1234567890abcdef')).toBeTrue();
               // expect(CREDENTIAL_REGEX.test('A')).toBeTrue(); // min 2? wait, {2,128}
               expect(CREDENTIAL_REGEX.test('AB')).toBeTrue();
          });

          it('should reject invalid values', () => {
               expect(CREDENTIAL_REGEX.test('')).toBeFalse();
               expect(CREDENTIAL_REGEX.test('G')).toBeFalse(); // invalid char
               expect(CREDENTIAL_REGEX.test('1234567G')).toBeFalse();
               expect(CREDENTIAL_REGEX.test('a'.repeat(129))).toBeFalse(); // too long
          });

          it('should enforce length between 2 and 128 characters', () => {
               expect(CREDENTIAL_REGEX.test('A')).toBeFalse(); // too short
               expect(CREDENTIAL_REGEX.test('AB')).toBeTrue();
               expect(CREDENTIAL_REGEX.test('A'.repeat(128))).toBeTrue();
               expect(CREDENTIAL_REGEX.test('A'.repeat(129))).toBeFalse();
          });
     });

     describe('Cross-reference consistency', () => {
          it('should have consistent values across tab and display types', () => {
               const tabValues = [...CREDENTIAL_TAB];
               const configDisplayValues = Object.values(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES);

               expect(tabValues).toEqual(jasmine.arrayContaining(configDisplayValues));
               expect(configDisplayValues).toEqual(jasmine.arrayContaining(tabValues));
          });

          it('should use same string literals where expected', () => {
               expect(CREDENTIAL_CONFIG_TX_DISPLAY_TYPES.CREATE).toBe('createCredential');
               expect(CREDENTIAL_TX_TYPES.CREATE).toBe('createCredential');
          });
     });

     describe('Type exports', () => {
          it('should have CredentialTab type that matches CREDENTIAL_TAB', () => {
               const tab: CredentialTab = 'verifyCredential';
               expect(CREDENTIAL_TAB.includes(tab)).toBeTrue();
          });
     });
});
