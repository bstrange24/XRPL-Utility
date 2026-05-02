import { AppConstants } from './app.constants';

describe('AppConstants', () => {
     it('should define all networks', () => {
          expect(AppConstants.NETWORKS.MAINNET.URL).toContain('ripple.com');
          expect(AppConstants.NETWORKS.TESTNET.NAME).toBe('testnet');
          expect(AppConstants.NETWORKS.DEVNET.URL).toContain('devnet');
     });

     it('should have valid XRPL explorer URLs', () => {
          expect(AppConstants.XRPL_EXPLORER_URL.MAINNET).toContain('xrpl.org');
          expect(AppConstants.XRPL_EXPLORER_URL.TX).toContain('/tx/');
     });

     it('should define XRP currency correctly', () => {
          expect(AppConstants.XRP_CURRENCY).toBe('XRP');
     });

     it('should define fee bounds', () => {
          expect(Number(AppConstants.MIN_FEE)).toBeLessThanOrEqual(Number(AppConstants.MAX_FEE));
     });

     it('should have correct ripple epoch offset', () => {
          expect(AppConstants.RIPPLE_EPOCH_OFFSET).toBe(946684800);
     });

     it('should match JS epoch conversion', () => {
          const expected = new Date('2000-01-01T00:00:00Z').getTime() / 1000;
          expect(AppConstants.RIPPLE_EPOCH_START).toBe(expected);
     });

     it('should have non-empty FLAGS array', () => {
          expect(AppConstants.FLAGS.length).toBeGreaterThan(0);
     });

     it('each flag should map correctly to FLAGMAP', () => {
          for (const flag of AppConstants.FLAGS) {
               expect(AppConstants.FLAGMAP[flag.name as keyof typeof AppConstants.FLAGMAP]).toBe(flag.xrplName);
          }
     });

     it('each flag should have a valid xrpl enum', () => {
          for (const flag of AppConstants.FLAGS) {
               expect(flag.xrplEnum).toBeDefined();
          }
     });

     it('flag values should be unique', () => {
          const values = AppConstants.FLAGS.map(f => f.value);
          const unique = new Set(values);
          expect(unique.size).toBe(values.length);
     });

     it('FLAGMAP keys should match FLAGS names', () => {
          const flagNames = AppConstants.FLAGS.map(f => f.name);

          for (const key of Object.keys(AppConstants.FLAGMAP)) {
               expect(flagNames).toContain(key);
          }
     });

     it('delegate actions should have unique IDs', () => {
          const ids = AppConstants.DELEGATE_ACTIONS.map(a => a.id);
          expect(new Set(ids).size).toBe(ids.length);
     });

     it('delegate actions should have required fields', () => {
          for (const action of AppConstants.DELEGATE_ACTIONS) {
               expect(action.key).toBeTruthy();
               expect(action.txType).toBeTruthy();
               expect(action.description).toBeTruthy();
          }
     });

     it('should contain known transaction labels', () => {
          expect(AppConstants.SIGN_TRANSACTION_LABEL_MAP.sendXrp).toBe('Send XRP');
          expect(AppConstants.SIGN_TRANSACTION_LABEL_MAP.createCheck).toContain('Check');
     });

     it('transaction labels should not be empty', () => {
          Object.values(AppConstants.SIGN_TRANSACTION_LABEL_MAP).forEach(label => {
               expect(label.length).toBeGreaterThan(0);
          });
     });

     it('should define encryption types', () => {
          expect(AppConstants.ENCRYPTION.ED25519).toBe('ed25519');
          expect(AppConstants.ENCRYPTION.SECP256K1).toBe('secp256k1');
     });

     it('toast durations should be positive', () => {
          Object.values(AppConstants.TOAST).forEach(val => {
               expect(val).toBeGreaterThan(0);
          });
     });

     it('batch flags should be powers of 2', () => {
          Object.values(AppConstants.BATCH_FLAGS).forEach(val => {
               expect(val & (val - 1)).toBe(0);
          });
     });

     it('should not have empty strings in critical constants', () => {
          expect(AppConstants.NETWORKS.MAINNET.URL).not.toBe('');
          expect(AppConstants.XRPL_WIN_URL.MAINNET).not.toBe('');
     });
});
