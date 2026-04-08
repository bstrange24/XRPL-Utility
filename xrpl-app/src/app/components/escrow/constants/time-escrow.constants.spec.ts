import { ESCROW_TAB, ESCROW_TX_TYPES, ESCROW_TX_TYPE_MAP, ESCROW_VALIDATION_RULES, ESCROW_CONFIG_TX_DISPLAY_TYPES } from './time-escrow.constants';

describe('time-escrow.constants', () => {
     describe('ESCROW_TAB', () => {
          it('should contain createEscrow', () => {
               expect(ESCROW_TAB).toContain('createEscrow');
          });

          it('should contain finishEscrow', () => {
               expect(ESCROW_TAB).toContain('finishEscrow');
          });

          it('should contain cancelEscrow', () => {
               expect(ESCROW_TAB).toContain('cancelEscrow');
          });

          it('should have exactly 3 tabs', () => {
               expect(ESCROW_TAB.length).toBe(3);
          });
     });

     describe('ESCROW_TX_TYPES', () => {
          it('should have CREATE = createEscrow', () => {
               expect(ESCROW_TX_TYPES.CREATE).toBe('createEscrow');
          });

          it('should have FINISH = finishEscrow', () => {
               expect(ESCROW_TX_TYPES.FINISH).toBe('finishEscrow');
          });

          it('should have CANCEL = cancelEscrow', () => {
               expect(ESCROW_TX_TYPES.CANCEL).toBe('cancelEscrow');
          });
     });

     describe('ESCROW_TX_TYPE_MAP', () => {
          it('should map createEscrow to createEscrow', () => {
               expect(ESCROW_TX_TYPE_MAP.createEscrow).toBe('createEscrow');
          });

          it('should map finishEscrow to finishEscrow', () => {
               expect(ESCROW_TX_TYPE_MAP.finishEscrow).toBe('finishEscrow');
          });

          it('should map cancelEscrow to cancelEscrow', () => {
               expect(ESCROW_TX_TYPE_MAP.cancelEscrow).toBe('cancelEscrow');
          });
     });

     describe('ESCROW_VALIDATION_RULES', () => {
          it('should map createEscrow to CreateEscrow rule', () => {
               expect(ESCROW_VALIDATION_RULES['createEscrow']).toBe('CreateEscrow');
          });

          it('should map finishEscrow to FinishEscrow rule', () => {
               expect(ESCROW_VALIDATION_RULES['finishEscrow']).toBe('FinishEscrow');
          });

          it('should map cancelEscrow to CancelEscrow rule', () => {
               expect(ESCROW_VALIDATION_RULES['cancelEscrow']).toBe('CancelEscrow');
          });

          it('should have exactly 3 rules', () => {
               expect(Object.keys(ESCROW_VALIDATION_RULES).length).toBe(3);
          });
     });

     describe('ESCROW_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should have CREATE = createEscrow', () => {
               expect(ESCROW_CONFIG_TX_DISPLAY_TYPES.CREATE).toBe('createEscrow');
          });

          it('should have FINISH = finishEscrow', () => {
               expect(ESCROW_CONFIG_TX_DISPLAY_TYPES.FINISH).toBe('finishEscrow');
          });

          it('should have CANCEL = cancelEscrow', () => {
               expect(ESCROW_CONFIG_TX_DISPLAY_TYPES.CANCEL).toBe('cancelEscrow');
          });
     });
});
