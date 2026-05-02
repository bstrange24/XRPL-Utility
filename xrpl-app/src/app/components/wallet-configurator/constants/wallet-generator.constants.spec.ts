import { WALLET_GENERATOR_TAB, WalletGeneratorTab, WALLET_GENERATOR_TX_TYPES, WALLET_GENERATOR_TX_TYPES_FULL, WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES, WALLET_GENERATOR_VALIDATION_RULES, WALLET_GENERATOR_DEFAULTS, getWalletGeneratorTxTypeFull, isWalletGeneratorTab } from './wallet-generator.constants';

describe('Wallet Generator Constants', () => {
     describe('WALLET_GENERATOR_TAB', () => {
          it('should have exactly 5 tab values', () => {
               expect(WALLET_GENERATOR_TAB.length).toBe(5);
          });

          it('should contain all expected tabs', () => {
               expect(WALLET_GENERATOR_TAB).toContain('generate');
               expect(WALLET_GENERATOR_TAB).toContain('deriveSeed');
               expect(WALLET_GENERATOR_TAB).toContain('deriveMnemonic');
               expect(WALLET_GENERATOR_TAB).toContain('deriveSecretNumbers');
               expect(WALLET_GENERATOR_TAB).toContain('removeCustomWallets');
          });

          it('should have values in correct order', () => {
               expect(WALLET_GENERATOR_TAB).toEqual(['generate', 'deriveSeed', 'deriveMnemonic', 'deriveSecretNumbers', 'removeCustomWallets']);
          });

          it('should be readonly (as const)', () => {
               expect(WALLET_GENERATOR_TAB).toEqual(['generate', 'deriveSeed', 'deriveMnemonic', 'deriveSecretNumbers', 'removeCustomWallets']);
          });
     });

     describe('WalletGeneratorTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: WalletGeneratorTab[] = ['generate', 'deriveSeed', 'deriveMnemonic', 'deriveSecretNumbers', 'removeCustomWallets'];
               validTabs.forEach(tab => {
                    expect(WALLET_GENERATOR_TAB).toContain(tab);
               });
          });
     });

     describe('WALLET_GENERATOR_TX_TYPES', () => {
          it('should have all properties correctly set', () => {
               expect(WALLET_GENERATOR_TX_TYPES.GENERATE).toBe('generate');
               expect(WALLET_GENERATOR_TX_TYPES.DERIVE_SEED).toBe('deriveSeed');
               expect(WALLET_GENERATOR_TX_TYPES.DERIVE_MNEMONIC).toBe('deriveMnemonic');
               expect(WALLET_GENERATOR_TX_TYPES.DERIVE_SECRET_NUMBERS).toBe('deriveSecretNumbers');
               expect(WALLET_GENERATOR_TX_TYPES.REMOVE_CUSTOM_WALLETS).toBe('removeCustomWallets');
          });

          it('should have exactly 5 properties', () => {
               expect(Object.keys(WALLET_GENERATOR_TX_TYPES).length).toBe(5);
          });
     });

     describe('WALLET_GENERATOR_TX_TYPES_FULL & CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match the base transaction types', () => {
               expect(WALLET_GENERATOR_TX_TYPES_FULL).toEqual(WALLET_GENERATOR_TX_TYPES);
               expect(WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES).toEqual(WALLET_GENERATOR_TX_TYPES);
          });
     });

     describe('WALLET_GENERATOR_VALIDATION_RULES', () => {
          it('should have validation rule for every type', () => {
               expect(WALLET_GENERATOR_VALIDATION_RULES[WALLET_GENERATOR_TX_TYPES.GENERATE]).toBe('generate');
               expect(WALLET_GENERATOR_VALIDATION_RULES[WALLET_GENERATOR_TX_TYPES.DERIVE_SEED]).toBe('deriveSeed');
               expect(WALLET_GENERATOR_VALIDATION_RULES[WALLET_GENERATOR_TX_TYPES.DERIVE_MNEMONIC]).toBe('deriveMnemonic');
               expect(WALLET_GENERATOR_VALIDATION_RULES[WALLET_GENERATOR_TX_TYPES.DERIVE_SECRET_NUMBERS]).toBe('deriveSecretNumbers');
               expect(WALLET_GENERATOR_VALIDATION_RULES[WALLET_GENERATOR_TX_TYPES.REMOVE_CUSTOM_WALLETS]).toBe('removeCustomWallets');
          });

          it('should have exactly 5 rules', () => {
               expect(Object.keys(WALLET_GENERATOR_VALIDATION_RULES).length).toBe(5);
          });

          it('should be readonly', () => {
               expect(WALLET_GENERATOR_VALIDATION_RULES).toEqual({
                    generate: 'generate',
                    deriveSeed: 'deriveSeed',
                    deriveMnemonic: 'deriveMnemonic',
                    deriveSecretNumbers: 'deriveSecretNumbers',
                    removeCustomWallets: 'removeCustomWallets',
               });
          });
     });

     describe('WALLET_GENERATOR_DEFAULTS', () => {
          it('should have all default values as empty strings', () => {
               expect(WALLET_GENERATOR_DEFAULTS.CREDENTIAL_TYPE).toBe('');
               expect(WALLET_GENERATOR_DEFAULTS.CREDENTIAL_ISSUER).toBe('');
               expect(WALLET_GENERATOR_DEFAULTS.SUBJECT).toBe('');
               expect(WALLET_GENERATOR_DEFAULTS.DOMAIN_ID).toBe('');
               expect(WALLET_GENERATOR_DEFAULTS.SEARCH_QUERY).toBe('');
          });
     });

     describe('Helper Functions', () => {
          it('should return correct full tx type', () => {
               expect(getWalletGeneratorTxTypeFull('generate')).toBe('generate');
               expect(getWalletGeneratorTxTypeFull('deriveSeed')).toBe('deriveSeed');
               expect(getWalletGeneratorTxTypeFull('removeCustomWallets')).toBe('removeCustomWallets');
          });

          it('should correctly identify WalletGeneratorTab', () => {
               expect(isWalletGeneratorTab('generate')).toBeTrue();
               expect(isWalletGeneratorTab('deriveMnemonic')).toBeTrue();
               expect(isWalletGeneratorTab('invalidTab')).toBeFalse();
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['generate', 'deriveSeed', 'deriveMnemonic', 'deriveSecretNumbers', 'removeCustomWallets'] as const;

          it('should have consistent values across constants', () => {
               expect([...WALLET_GENERATOR_TAB]).toEqual(expectedValues);
               expect(Object.values(WALLET_GENERATOR_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(WALLET_GENERATOR_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
          });
     });
});
