import { ACCOUNT_CONFIG_TX_TYPES, ACCOUNT_CONFIG_VALIDATION_RULES } from './account-configurator.constants';
import { XRPL_ACCOUNT_FLAG_VALUES, XRPL_ACCOUNT_DEFAULT_FLAGS, XRPL_ACCOUNT_FLAGS_CONFIG, FLAG_LABELS } from './account-configurator.flags';

describe('Account Configurator Flags', () => {
     describe('XRPL_ACCOUNT_FLAG_VALUES', () => {
          it('should contain XRPL AccountSetAsfFlags', () => {
               expect(XRPL_ACCOUNT_FLAG_VALUES).toBeDefined();
               expect(typeof XRPL_ACCOUNT_FLAG_VALUES).toBe('object');
          });
     });

     describe('XRPL_ACCOUNT_DEFAULT_FLAGS', () => {
          it('should have all flags default to false', () => {
               const flags = XRPL_ACCOUNT_DEFAULT_FLAGS;
               Object.values(flags).forEach(value => {
                    expect(value).toBeFalse();
               });
          });

          it('should contain exactly 15 flags', () => {
               expect(Object.keys(XRPL_ACCOUNT_DEFAULT_FLAGS).length).toBe(15);
          });
     });

     describe('XRPL_ACCOUNT_FLAGS_CONFIG', () => {
          it('should have exactly 15 flag configurations', () => {
               expect(XRPL_ACCOUNT_FLAGS_CONFIG.length).toBe(15);
          });

          it('should have valid structure for each flag item', () => {
               XRPL_ACCOUNT_FLAGS_CONFIG.forEach(flag => {
                    expect(flag.key).toBeDefined();
                    expect(flag.title).toBeDefined();
                    expect(flag.desc).toBeDefined();
                    expect(flag.desc.length).toBeGreaterThan(10);
               });
          });

          it('should include all major flags', () => {
               const keys = XRPL_ACCOUNT_FLAGS_CONFIG.map(f => f.key);
               expect(keys).toContain('asfRequireDest');
               expect(keys).toContain('asfDisallowXRP');
               expect(keys).toContain('asfGlobalFreeze');
               expect(keys).toContain('asfDepositAuth');
               expect(keys).toContain('asfAuthorizedNFTokenMinter');
          });
     });

     describe('FLAG_LABELS', () => {
          it('should contain multiple human-readable labels', () => {
               expect(Object.keys(FLAG_LABELS).length).toBeGreaterThan(8);
          });

          it('should map technical keys to user-friendly labels', () => {
               expect(FLAG_LABELS['disableMasterKey']).toBeDefined();
               expect(FLAG_LABELS['requireDestinationTag']).toBeDefined();
               expect(FLAG_LABELS['noFreeze']).toBeDefined();
          });
     });

     describe('Cross-reference with TX_TYPES', () => {
          it('should have validation rules for all account config actions', () => {
               const txKeys = Object.values(ACCOUNT_CONFIG_TX_TYPES);
               const validationKeys = Object.keys(ACCOUNT_CONFIG_VALIDATION_RULES);

               expect(validationKeys.length).toBeGreaterThanOrEqual(6);
               txKeys.forEach(key => {
                    expect(validationKeys).toContain(key);
               });
          });
     });
});
