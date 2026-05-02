import { PERMISSION_DOMAIN_TAB, PermissionDomainTab, PERMISSION_DOMAIN_TX_TYPES, PERMISSION_DOMAIN_TX_TYPES_FULL, PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES, PERMISSION_DOMAIN_VALIDATION_RULES, PERMISSION_DOMAIN_DEFAULTS, getPermissionDomainTxTypeFull, isPermissionDomainTab } from './permissioned-domain.constants';

describe('Permissioned Domain Constants', () => {
     describe('PERMISSION_DOMAIN_TAB', () => {
          it('should have exactly 2 tab values', () => {
               expect(PERMISSION_DOMAIN_TAB.length).toBe(2);
          });

          it('should contain all expected tabs', () => {
               expect(PERMISSION_DOMAIN_TAB).toContain('setPermissionedDomain');
               expect(PERMISSION_DOMAIN_TAB).toContain('deletePermissionedDomain');
          });

          it('should have values in correct order', () => {
               expect(PERMISSION_DOMAIN_TAB).toEqual(['setPermissionedDomain', 'deletePermissionedDomain']);
          });

          it('should be readonly (as const)', () => {
               expect(PERMISSION_DOMAIN_TAB).toEqual(['setPermissionedDomain', 'deletePermissionedDomain']);
          });
     });

     describe('PermissionDomainTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: PermissionDomainTab[] = ['setPermissionedDomain', 'deletePermissionedDomain'];
               validTabs.forEach(tab => {
                    expect(PERMISSION_DOMAIN_TAB).toContain(tab);
               });
          });
     });

     describe('PERMISSION_DOMAIN_TX_TYPES', () => {
          it('should have all properties correctly set', () => {
               expect(PERMISSION_DOMAIN_TX_TYPES.SET).toBe('setPermissionedDomain');
               expect(PERMISSION_DOMAIN_TX_TYPES.DELETE).toBe('deletePermissionedDomain');
          });

          it('should have exactly 2 properties', () => {
               expect(Object.keys(PERMISSION_DOMAIN_TX_TYPES).length).toBe(2);
          });
     });

     describe('PERMISSION_DOMAIN_TX_TYPES_FULL & CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match the base transaction types', () => {
               expect(PERMISSION_DOMAIN_TX_TYPES_FULL).toEqual(PERMISSION_DOMAIN_TX_TYPES);
               expect(PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES).toEqual(PERMISSION_DOMAIN_TX_TYPES);
          });
     });

     describe('PERMISSION_DOMAIN_VALIDATION_RULES', () => {
          it('should have validation rule for SET', () => {
               expect(PERMISSION_DOMAIN_VALIDATION_RULES[PERMISSION_DOMAIN_TX_TYPES.SET]).toBe('PermissionedDomainSet');
          });

          it('should have validation rule for DELETE', () => {
               expect(PERMISSION_DOMAIN_VALIDATION_RULES[PERMISSION_DOMAIN_TX_TYPES.DELETE]).toBe('PermissionedDomainDelete');
          });

          it('should have exactly 2 rules', () => {
               expect(Object.keys(PERMISSION_DOMAIN_VALIDATION_RULES).length).toBe(2);
          });

          it('should be readonly', () => {
               expect(PERMISSION_DOMAIN_VALIDATION_RULES).toEqual({
                    setPermissionedDomain: 'PermissionedDomainSet',
                    deletePermissionedDomain: 'PermissionedDomainDelete',
               });
          });
     });

     describe('PERMISSION_DOMAIN_DEFAULTS', () => {
          it('should have all default values as empty strings', () => {
               expect(PERMISSION_DOMAIN_DEFAULTS.CREDENTIAL_TYPE).toBe('');
               expect(PERMISSION_DOMAIN_DEFAULTS.CREDENTIAL_ISSUER).toBe('');
               expect(PERMISSION_DOMAIN_DEFAULTS.SUBJECT).toBe('');
               expect(PERMISSION_DOMAIN_DEFAULTS.DOMAIN_ID).toBe('');
               expect(PERMISSION_DOMAIN_DEFAULTS.SEARCH_QUERY).toBe('');
          });

          it('should be readonly', () => {
               expect(Object.keys(PERMISSION_DOMAIN_DEFAULTS).length).toBe(5);
          });
     });

     describe('Helper Functions', () => {
          it('should return correct full tx type', () => {
               expect(getPermissionDomainTxTypeFull('setPermissionedDomain')).toBe('setPermissionedDomain');
               expect(getPermissionDomainTxTypeFull('deletePermissionedDomain')).toBe('deletePermissionedDomain');
          });

          it('should correctly identify PermissionedDomainTab', () => {
               expect(isPermissionDomainTab('setPermissionedDomain')).toBeTrue();
               expect(isPermissionDomainTab('deletePermissionedDomain')).toBeTrue();
               expect(isPermissionDomainTab('invalidTab')).toBeFalse();
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['setPermissionedDomain', 'deletePermissionedDomain'] as const;

          it('should have consistent values across constants', () => {
               expect([...PERMISSION_DOMAIN_TAB]).toEqual(expectedValues);
               expect(Object.values(PERMISSION_DOMAIN_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(PERMISSION_DOMAIN_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
          });
     });
});
