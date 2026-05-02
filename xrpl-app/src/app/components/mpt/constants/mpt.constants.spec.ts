import { MPT_TAB, MptTab, MPT_TX_TYPE_MAP, MPT_TX_TYPES, MPT_CONFIG_TX_DISPLAY_TYPES, MptTxTypes, MptConfigTxDisplayType, MPT_VALIDATION_RULES, MPT_FLAGS_CONFIG } from './mpt.constants';

describe('MPT Constants', () => {
     describe('MPT_TAB', () => {
          it('should have exactly 8 tab values', () => {
               expect(MPT_TAB.length).toBe(8);
          });

          it('should contain all expected tabs', () => {
               expect(MPT_TAB).toContain('createMpt');
               expect(MPT_TAB).toContain('authorizeMpt');
               expect(MPT_TAB).toContain('unauthorizeMpt');
               expect(MPT_TAB).toContain('sendMpt');
               expect(MPT_TAB).toContain('lockMpt');
               expect(MPT_TAB).toContain('unlockMpt');
               expect(MPT_TAB).toContain('clawbackMpt');
               expect(MPT_TAB).toContain('destroyMpt');
          });

          it('should have values in correct order', () => {
               expect(MPT_TAB).toEqual(['createMpt', 'authorizeMpt', 'unauthorizeMpt', 'sendMpt', 'lockMpt', 'unlockMpt', 'clawbackMpt', 'destroyMpt']);
          });

          it('should be readonly (as const)', () => {
               expect(MPT_TAB).toEqual(['createMpt', 'authorizeMpt', 'unauthorizeMpt', 'sendMpt', 'lockMpt', 'unlockMpt', 'clawbackMpt', 'destroyMpt']);
          });
     });

     describe('MptTab type', () => {
          it('should allow all valid tab values', () => {
               const validTabs: MptTab[] = ['createMpt', 'authorizeMpt', 'unauthorizeMpt', 'sendMpt', 'lockMpt', 'unlockMpt', 'clawbackMpt', 'destroyMpt'];
               validTabs.forEach(tab => {
                    expect(MPT_TAB).toContain(tab);
               });
          });
     });

     describe('MPT_TX_TYPE_MAP', () => {
          it('should map all operations correctly', () => {
               expect(MPT_TX_TYPE_MAP.createMpt).toBe('createMpt');
               expect(MPT_TX_TYPE_MAP.authorizeMpt).toBe('authorizeMpt');
               expect(MPT_TX_TYPE_MAP.unauthorizeMpt).toBe('unauthorizeMpt');
               expect(MPT_TX_TYPE_MAP.sendMpt).toBe('sendMpt');
               expect(MPT_TX_TYPE_MAP.lockMpt).toBe('lockMpt');
               expect(MPT_TX_TYPE_MAP.unlockMpt).toBe('unlockMpt');
               expect(MPT_TX_TYPE_MAP.clawbackMpt).toBe('clawbackMpt');
               expect(MPT_TX_TYPE_MAP.destroyMpt).toBe('destroyMpt');
          });

          it('should have exactly 8 keys', () => {
               expect(Object.keys(MPT_TX_TYPE_MAP).length).toBe(8);
          });
     });

     describe('MPT_TX_TYPES', () => {
          it('should have all properties correctly set', () => {
               expect(MPT_TX_TYPES.CREATE).toBe('createMpt');
               expect(MPT_TX_TYPES.AUTHORIZE).toBe('authorizeMpt');
               expect(MPT_TX_TYPES.UNAUTHORIZE).toBe('unauthorizeMpt');
               expect(MPT_TX_TYPES.SEND).toBe('sendMpt');
               expect(MPT_TX_TYPES.LOCK).toBe('lockMpt');
               expect(MPT_TX_TYPES.UNLOCK).toBe('unlockMpt');
               expect(MPT_TX_TYPES.CLAWBACK).toBe('clawbackMpt');
               expect(MPT_TX_TYPES.DESTROY).toBe('destroyMpt');
          });

          it('should have exactly 8 properties', () => {
               expect(Object.keys(MPT_TX_TYPES).length).toBe(8);
          });

          it('should be readonly', () => {
               expect(MPT_TX_TYPES).toEqual({
                    CREATE: 'createMpt',
                    AUTHORIZE: 'authorizeMpt',
                    UNAUTHORIZE: 'unauthorizeMpt',
                    SEND: 'sendMpt',
                    LOCK: 'lockMpt',
                    UNLOCK: 'unlockMpt',
                    CLAWBACK: 'clawbackMpt',
                    DESTROY: 'destroyMpt',
               });
          });
     });

     describe('MPT_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match MPT_TX_TYPES exactly', () => {
               expect(MPT_CONFIG_TX_DISPLAY_TYPES).toEqual(MPT_TX_TYPES);
          });

          it('should have exactly 8 properties', () => {
               expect(Object.keys(MPT_CONFIG_TX_DISPLAY_TYPES).length).toBe(8);
          });
     });

     describe('MptTxTypes & MptConfigTxDisplayType', () => {
          it('should allow valid MptTxTypes', () => {
               const valid: MptTxTypes[] = Object.values(MPT_TX_TYPES);
               valid.forEach(type => {
                    expect(Object.values(MPT_TX_TYPES)).toContain(type);
               });
          });

          it('should allow valid MptConfigTxDisplayType', () => {
               const valid: MptConfigTxDisplayType[] = Object.values(MPT_CONFIG_TX_DISPLAY_TYPES);
               valid.forEach(type => {
                    expect(Object.values(MPT_CONFIG_TX_DISPLAY_TYPES)).toContain(type);
               });
          });
     });

     describe('MPT_VALIDATION_RULES', () => {
          it('should have validation rule for every MPT_TX_TYPES', () => {
               expect(MPT_VALIDATION_RULES[MPT_TX_TYPES.CREATE]).toBe('CreateMpt');
               expect(MPT_VALIDATION_RULES[MPT_TX_TYPES.AUTHORIZE]).toBe('AuthorizeMpt');
               expect(MPT_VALIDATION_RULES[MPT_TX_TYPES.UNAUTHORIZE]).toBe('UnauthorizeMpt');
               expect(MPT_VALIDATION_RULES[MPT_TX_TYPES.SEND]).toBe('SendMpt');
               expect(MPT_VALIDATION_RULES[MPT_TX_TYPES.LOCK]).toBe('LockMpt');
               expect(MPT_VALIDATION_RULES[MPT_TX_TYPES.UNLOCK]).toBe('UnlockMpt');
               expect(MPT_VALIDATION_RULES[MPT_TX_TYPES.CLAWBACK]).toBe('ClawbackMpt');
               expect(MPT_VALIDATION_RULES[MPT_TX_TYPES.DESTROY]).toBe('DestroyMpt');
          });

          it('should have exactly 8 rules', () => {
               expect(Object.keys(MPT_VALIDATION_RULES).length).toBe(8);
          });

          it('should be readonly', () => {
               expect(MPT_VALIDATION_RULES).toEqual({
                    createMpt: 'CreateMpt',
                    authorizeMpt: 'AuthorizeMpt',
                    unauthorizeMpt: 'UnauthorizeMpt',
                    sendMpt: 'SendMpt',
                    lockMpt: 'LockMpt',
                    unlockMpt: 'UnlockMpt',
                    clawbackMpt: 'ClawbackMpt',
                    destroyMpt: 'DestroyMpt',
               });
          });
     });

     describe('MPT_FLAGS_CONFIG', () => {
          it('should have exactly 6 flag options', () => {
               expect(MPT_FLAGS_CONFIG.length).toBe(6);
          });

          it('should contain all expected flag keys', () => {
               const keys = MPT_FLAGS_CONFIG.map(f => f.key);
               expect(keys).toEqual(['canLock', 'isRequireAuth', 'canEscrow', 'canTrade', 'canTransfer', 'canClawback']);
          });

          it('should have valid FlagOption structure for each entry', () => {
               MPT_FLAGS_CONFIG.forEach(flag => {
                    expect(flag.key).toBeDefined();
                    expect(flag.label).toBeDefined();
                    expect(flag.hex).toMatch(/^0x[0-9A-Fa-f]+$/);
                    expect(flag.description.length).toBeGreaterThan(10);
               });
          });

          it('should have unique hex values', () => {
               const hexes = MPT_FLAGS_CONFIG.map(f => f.hex);
               expect(new Set(hexes).size).toBe(hexes.length);
          });

          it('should have unique keys', () => {
               const keys = MPT_FLAGS_CONFIG.map(f => f.key);
               expect(new Set(keys).size).toBe(keys.length);
          });
     });

     describe('Cross-reference consistency', () => {
          it('should have consistent values across all MPT constants', () => {
               const tabValues = [...MPT_TAB];
               const txTypeMapValues = Object.values(MPT_TX_TYPE_MAP);
               const txTypesValues = Object.values(MPT_TX_TYPES);
               const configDisplayValues = Object.values(MPT_CONFIG_TX_DISPLAY_TYPES);
               const validationKeys = Object.keys(MPT_VALIDATION_RULES);

               expect(tabValues).toEqual(jasmine.arrayContaining(txTypeMapValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(txTypesValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(configDisplayValues));
               expect(tabValues).toEqual(jasmine.arrayContaining(validationKeys));
          });

          it('should use identical string literals where expected', () => {
               const expected = ['createMpt', 'authorizeMpt', 'unauthorizeMpt', 'sendMpt', 'lockMpt', 'unlockMpt', 'clawbackMpt', 'destroyMpt'] as const;

               expect(MPT_TAB).toEqual(expected);
               expect(Object.values(MPT_TX_TYPE_MAP)).toEqual(expected);
               expect(Object.values(MPT_TX_TYPES)).toEqual(expected);
               expect(Object.values(MPT_CONFIG_TX_DISPLAY_TYPES)).toEqual(expected);
          });
     });
});
