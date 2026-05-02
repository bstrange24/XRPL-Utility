import { AMM_TX_TYPES, AMM_CONFIG_TX_DISPLAY_TYPES, AmmTxTypes, AmmConfigTxDisplayType, AMM_VALIDATION_RULES } from './amm.constants';

describe('AMM Constants', () => {
     describe('AMM_TX_TYPES', () => {
          it('should have exactly 6 transaction types', () => {
               expect(Object.keys(AMM_TX_TYPES).length).toBe(6);
          });

          it('should have all properties correctly set', () => {
               expect(AMM_TX_TYPES.CREATE_AMM).toBe('createAMM');
               expect(AMM_TX_TYPES.DEPOSIT_TO_AMM).toBe('depositToAMM');
               expect(AMM_TX_TYPES.WITHDRAWL_FROM_AMM).toBe('withdrawalFromAMM');
               expect(AMM_TX_TYPES.CLAWBACK).toBe('clawbackFromAMM');
               expect(AMM_TX_TYPES.SWAP).toBe('swapViaAMM');
               expect(AMM_TX_TYPES.DELETE).toBe('deleteAMM');
          });
     });

     describe('AMM_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match AMM_TX_TYPES', () => {
               expect(AMM_CONFIG_TX_DISPLAY_TYPES).toEqual(AMM_TX_TYPES);
          });
     });

     describe('AMM_VALIDATION_RULES', () => {
          it('should have validation rule for every type', () => {
               expect(AMM_VALIDATION_RULES[AMM_TX_TYPES.CREATE_AMM]).toBe('CreateAMM');
               expect(AMM_VALIDATION_RULES[AMM_TX_TYPES.DEPOSIT_TO_AMM]).toBe('DepositToAMM');
               expect(AMM_VALIDATION_RULES[AMM_TX_TYPES.WITHDRAWL_FROM_AMM]).toBe('WithdrawalFromAMM');
               expect(AMM_VALIDATION_RULES[AMM_TX_TYPES.CLAWBACK]).toBe('ClawbackFromAMM');
               expect(AMM_VALIDATION_RULES[AMM_TX_TYPES.SWAP]).toBe('SwapViaAMM');
               expect(AMM_VALIDATION_RULES[AMM_TX_TYPES.DELETE]).toBe('DeleteAMM');
          });

          it('should have exactly 6 rules', () => {
               expect(Object.keys(AMM_VALIDATION_RULES).length).toBe(6);
          });

          it('should be readonly', () => {
               expect(AMM_VALIDATION_RULES).toEqual({
                    createAMM: 'CreateAMM',
                    depositToAMM: 'DepositToAMM',
                    withdrawalFromAMM: 'WithdrawalFromAMM',
                    clawbackFromAMM: 'ClawbackFromAMM',
                    swapViaAMM: 'SwapViaAMM',
                    deleteAMM: 'DeleteAMM',
               });
          });
     });

     describe('Type definitions', () => {
          it('should allow valid AmmTxTypes', () => {
               const valid: AmmTxTypes[] = Object.values(AMM_TX_TYPES);
               valid.forEach(type => {
                    expect(Object.values(AMM_TX_TYPES)).toContain(type);
               });
          });

          it('should allow valid AmmConfigTxDisplayType', () => {
               const valid: AmmConfigTxDisplayType[] = Object.values(AMM_CONFIG_TX_DISPLAY_TYPES);
               valid.forEach(type => {
                    expect(Object.values(AMM_CONFIG_TX_DISPLAY_TYPES)).toContain(type);
               });
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['createAMM', 'depositToAMM', 'withdrawalFromAMM', 'clawbackFromAMM', 'swapViaAMM', 'deleteAMM'] as const;

          it('should have consistent values across constants', () => {
               expect(Object.values(AMM_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(AMM_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
          });
     });
});
