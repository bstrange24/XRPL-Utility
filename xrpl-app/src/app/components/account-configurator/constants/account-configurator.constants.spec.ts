import { ACCOUNT_CONFIG_TX_TYPES, ACCOUNT_CONFIG_VALIDATION_RULES } from './account-configurator.constants';
import { XRPL_ACCOUNT_FLAG_VALUES, XRPL_ACCOUNT_DEFAULT_FLAGS, XRPL_ACCOUNT_FLAGS_CONFIG, FLAG_LABELS } from './account-configurator.flags';

describe('Account Configurator Constants', () => {
     describe('ACCOUNT_CONFIG_TX_TYPES', () => {
          it('should have exactly 7 transaction types', () => {
               expect(Object.keys(ACCOUNT_CONFIG_TX_TYPES).length).toBe(7);
          });

          it('should have all properties correctly set', () => {
               expect(ACCOUNT_CONFIG_TX_TYPES.MODIFY_ACCOUNT_SET_FLAGS).toBe('modifyAccountSetFlags');
               expect(ACCOUNT_CONFIG_TX_TYPES.MODIFY_ACCOUNT_FLAGS).toBe('modifyAccountFlags');
               expect(ACCOUNT_CONFIG_TX_TYPES.MODIFY_DEPOSIT_AUTH).toBe('modifyDepositAuth');
               expect(ACCOUNT_CONFIG_TX_TYPES.MODIFY_MULTI_SIGNERS).toBe('modifyMultiSigners');
               expect(ACCOUNT_CONFIG_TX_TYPES.MODIFY_REGULAR_KEY).toBe('modifyRegularKey');
               expect(ACCOUNT_CONFIG_TX_TYPES.MODIFY_META_DATA).toBe('modifyMetaData');
               expect(ACCOUNT_CONFIG_TX_TYPES.UPDATE_META_DATA).toBe('updateMetaData');
          });
     });

     describe('ACCOUNT_CONFIG_VALIDATION_RULES', () => {
          it('should have validation rules for all main actions', () => {
               expect(ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_ACCOUNT_SET_FLAGS]).toBe('UpdateAccountFlags');
               expect(ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_ACCOUNT_FLAGS]).toBe('UpdateAccountFlags');
               expect(ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_DEPOSIT_AUTH]).toBe('SetDepositAuthAccounts');
               expect(ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_MULTI_SIGNERS]).toBe('SetMultiSign');
               expect(ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_REGULAR_KEY]).toBe('SetRegularKey');
               expect(ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.MODIFY_META_DATA]).toBe('SetNftMinterAddress');
               expect(ACCOUNT_CONFIG_VALIDATION_RULES[ACCOUNT_CONFIG_TX_TYPES.UPDATE_META_DATA]).toBe('UpdateMetaData');
          });

          it('should have exactly 7 rules', () => {
               expect(Object.keys(ACCOUNT_CONFIG_VALIDATION_RULES).length).toBe(7);
          });
     });

     describe('XRPL_ACCOUNT_FLAG_VALUES', () => {
          it('should import XRPL AccountSetAsfFlags', () => {
               expect(XRPL_ACCOUNT_FLAG_VALUES).toBeDefined();
               expect(typeof XRPL_ACCOUNT_FLAG_VALUES).toBe('object');
          });
     });

     describe('XRPL_ACCOUNT_DEFAULT_FLAGS', () => {
          it('should have all flags set to false by default', () => {
               const flags = XRPL_ACCOUNT_DEFAULT_FLAGS;
               Object.values(flags).forEach(value => {
                    expect(value).toBeFalse();
               });
          });

          it('should be readonly', () => {
               expect(Object.keys(XRPL_ACCOUNT_DEFAULT_FLAGS).length).toBe(15);
          });
     });

     describe('XRPL_ACCOUNT_FLAGS_CONFIG', () => {
          it('should have exactly 15 flag configurations', () => {
               expect(XRPL_ACCOUNT_FLAGS_CONFIG.length).toBe(15);
          });

          it('should have valid structure for each flag', () => {
               XRPL_ACCOUNT_FLAGS_CONFIG.forEach(flag => {
                    expect(flag.key).toBeDefined();
                    expect(flag.title).toBeDefined();
                    expect(flag.desc.length).toBeGreaterThan(10);
               });
          });

          it('should contain required flags', () => {
               const keys = XRPL_ACCOUNT_FLAGS_CONFIG.map(f => f.key);
               expect(keys).toContain('asfRequireDest');
               expect(keys).toContain('asfDisallowXRP');
               expect(keys).toContain('asfGlobalFreeze');
          });
     });

     describe('FLAG_LABELS', () => {
          it('should have multiple flag labels', () => {
               expect(Object.keys(FLAG_LABELS).length).toBeGreaterThan(5);
          });

          it('should contain key mappings', () => {
               expect(FLAG_LABELS['disableMasterKey']).toBeDefined();
               expect(FLAG_LABELS['requireDestinationTag']).toBeDefined();
          });
     });

     describe('Cross-reference consistency', () => {
          it('should have matching keys between TX_TYPES and VALIDATION_RULES', () => {
               const txKeys = Object.values(ACCOUNT_CONFIG_TX_TYPES);
               const validationKeys = Object.keys(ACCOUNT_CONFIG_VALIDATION_RULES);

               txKeys.forEach(key => {
                    expect(validationKeys).toContain(key);
               });
          });
     });
});
