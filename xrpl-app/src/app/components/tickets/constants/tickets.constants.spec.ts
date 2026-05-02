import { TICKET_TAB, TicketTab, TICKET_TX_TYPE_MAP, TICKET_TX_TYPES, TICKET_CONFIG_TX_DISPLAY_TYPES, TicketTxType, TicketConfigTxDisplayType, TICKET_VALIDATION_RULES } from './tickets.constants';

describe('Tickets Constants', () => {
     describe('TICKET_TAB', () => {
          it('should have exactly 2 tab values', () => {
               expect(TICKET_TAB.length).toBe(2);
          });

          it('should contain all expected tabs', () => {
               expect(TICKET_TAB).toContain('createTicket');
               expect(TICKET_TAB).toContain('deleteTicket');
          });

          it('should have values in correct order', () => {
               expect(TICKET_TAB).toEqual(['createTicket', 'deleteTicket']);
          });

          it('should be readonly (as const)', () => {
               expect(TICKET_TAB).toEqual(['createTicket', 'deleteTicket']);
          });
     });

     describe('TicketTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: TicketTab[] = ['createTicket', 'deleteTicket'];
               validTabs.forEach(tab => {
                    expect(TICKET_TAB).toContain(tab);
               });
          });
     });

     describe('TICKET_TX_TYPE_MAP', () => {
          it('should map operations correctly', () => {
               expect(TICKET_TX_TYPE_MAP.create).toBe('CreateTicket');
               expect(TICKET_TX_TYPE_MAP.delete).toBe('DeleteTicket');
          });

          it('should have exactly 2 keys', () => {
               expect(Object.keys(TICKET_TX_TYPE_MAP).length).toBe(2);
          });
     });

     describe('TICKET_TX_TYPES', () => {
          it('should have all properties correctly set', () => {
               expect(TICKET_TX_TYPES.CREATE).toBe('createTicket');
               expect(TICKET_TX_TYPES.DELETE).toBe('deleteTicket');
          });

          it('should have exactly 2 properties', () => {
               expect(Object.keys(TICKET_TX_TYPES).length).toBe(2);
          });
     });

     describe('TICKET_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match TICKET_TX_TYPES', () => {
               expect(TICKET_CONFIG_TX_DISPLAY_TYPES).toEqual(TICKET_TX_TYPES);
          });
     });

     describe('TICKET_VALIDATION_RULES', () => {
          it('should have validation rule for CREATE', () => {
               expect(TICKET_VALIDATION_RULES[TICKET_TX_TYPES.CREATE]).toBe('CreateTicket');
          });

          it('should have validation rule for DELETE', () => {
               expect(TICKET_VALIDATION_RULES[TICKET_TX_TYPES.DELETE]).toBe('DeleteTicket');
          });

          it('should have exactly 2 rules', () => {
               expect(Object.keys(TICKET_VALIDATION_RULES).length).toBe(2);
          });

          it('should be readonly', () => {
               expect(TICKET_VALIDATION_RULES).toEqual({
                    createTicket: 'CreateTicket',
                    deleteTicket: 'DeleteTicket',
               });
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['createTicket', 'deleteTicket'] as const;

          it('should have consistent values across constants', () => {
               expect([...TICKET_TAB]).toEqual(expectedValues);
               expect(Object.values(TICKET_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(TICKET_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
          });
     });
});
