import { ACCOUNT_DELETE_TX_TYPES, ACCOUNT_DELETE_CONFIG_TX_DISPLAY_TYPES, ACCOUNT_DELETE_VALIDATION_RULES } from './account-delete.constants';
import { BLOCKER_MAP } from './account-delete.ui';

describe('Account Delete Constants', () => {
     describe('ACCOUNT_DELETE_TX_TYPES', () => {
          it('should be defined as AccountDelete', () => {
               expect(ACCOUNT_DELETE_TX_TYPES).toBe('AccountDelete');
          });
     });

     describe('ACCOUNT_DELETE_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should have SEND key mapped to deleteAccount', () => {
               expect(ACCOUNT_DELETE_CONFIG_TX_DISPLAY_TYPES.SEND).toBe('deleteAccount');
          });

          it('should have exactly 1 property', () => {
               expect(Object.keys(ACCOUNT_DELETE_CONFIG_TX_DISPLAY_TYPES).length).toBe(1);
          });
     });

     describe('ACCOUNT_DELETE_VALIDATION_RULES', () => {
          it('should have ACCOUNT_DELETE rule', () => {
               expect(ACCOUNT_DELETE_VALIDATION_RULES.ACCOUNT_DELETE).toBe('AccountDelete');
          });

          it('should have exactly 1 rule', () => {
               expect(Object.keys(ACCOUNT_DELETE_VALIDATION_RULES).length).toBe(1);
          });
     });

     describe('BLOCKER_MAP', () => {
          it('should contain all expected blockers', () => {
               const keys = Object.keys(BLOCKER_MAP);
               expect(keys).toContain('RippleState');
               expect(keys).toContain('Offer');
               expect(keys).toContain('Escrow');
               expect(keys).toContain('Check');
               expect(keys).toContain('PayChannel');
               expect(keys).toContain('Ticket');
               expect(keys).toContain('SignerList');
               expect(keys).toContain('RegularKey');
               expect(keys).toContain('NFTokenPage');
               expect(keys).toContain('PermissionedDomain');
               expect(keys).toContain('Credential');
               expect(keys).toContain('DID');
               expect(keys).toContain('MPToken');
          });

          it('should have valid structure for each blocker', () => {
               Object.values(BLOCKER_MAP).forEach(blocker => {
                    expect(blocker.label).toBeDefined();
                    expect(blocker.route).toBeDefined();
                    expect(typeof blocker.label).toBe('string');
                    expect(typeof blocker.route).toBe('string');
               });
          });

          it('should have correct route and tab mappings', () => {
               expect(BLOCKER_MAP['RippleState'].route).toBe('/trustlines');
               expect(BLOCKER_MAP['Offer'].route).toBe('/create-offer');
               expect(BLOCKER_MAP['Escrow'].route).toBe('/time-escrow');
               expect(BLOCKER_MAP['NFTokenPage'].route).toBe('/create-nft');
          });
     });

     describe('Cross-reference consistency', () => {
          it('should link deleteAccount correctly', () => {
               expect(ACCOUNT_DELETE_CONFIG_TX_DISPLAY_TYPES.SEND).toBe('deleteAccount');
          });
     });
});
