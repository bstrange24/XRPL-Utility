import { OFFER_TAB, OFFER_TX_TYPES, OfferTxTypes, OFFER_VALIDATION_RULES } from './offer.constants';

describe('Offers Constants', () => {
     describe('OFFER_TAB', () => {
          it('should have exactly 3 tab values', () => {
               expect(OFFER_TAB.length).toBe(3);
          });

          it('should contain all expected tabs', () => {
               expect(OFFER_TAB).toContain('createOffer');
               expect(OFFER_TAB).toContain('getOrderBook');
               expect(OFFER_TAB).toContain('cancelOffer');
          });

          it('should have values in correct order', () => {
               expect(OFFER_TAB).toEqual(['createOffer', 'getOrderBook', 'cancelOffer']);
          });

          it('should be readonly (as const)', () => {
               expect(OFFER_TAB).toEqual(['createOffer', 'getOrderBook', 'cancelOffer']);
          });
     });

     describe('OFFER_TX_TYPES', () => {
          it('should have all properties correctly set', () => {
               expect(OFFER_TX_TYPES.CREATE_OFFER).toBe('createOffer');
               expect(OFFER_TX_TYPES.GET_ORDER_BOOK).toBe('getOrderBook');
               expect(OFFER_TX_TYPES.CANCEL_OFFER).toBe('cancelOffer');
          });

          it('should have exactly 3 properties', () => {
               expect(Object.keys(OFFER_TX_TYPES).length).toBe(3);
          });

          it('should be readonly', () => {
               expect(OFFER_TX_TYPES).toEqual({
                    CREATE_OFFER: 'createOffer',
                    GET_ORDER_BOOK: 'getOrderBook',
                    CANCEL_OFFER: 'cancelOffer',
               });
          });
     });

     describe('OfferTxTypes type', () => {
          it('should allow valid transaction types', () => {
               const validTypes: OfferTxTypes[] = ['createOffer', 'getOrderBook', 'cancelOffer'];
               validTypes.forEach(type => {
                    expect(Object.values(OFFER_TX_TYPES)).toContain(type);
               });
          });
     });

     describe('OFFER_VALIDATION_RULES', () => {
          it('should have validation rules for supported operations', () => {
               expect(OFFER_VALIDATION_RULES[OFFER_TX_TYPES.CREATE_OFFER]).toBe('OfferCreate');
               expect(OFFER_VALIDATION_RULES[OFFER_TX_TYPES.CANCEL_OFFER]).toBe('OfferCancel');
          });

          it('should not have validation rule for GET_ORDER_BOOK (as it is Partial)', () => {
               expect(OFFER_VALIDATION_RULES[OFFER_TX_TYPES.GET_ORDER_BOOK]).toBeUndefined();
          });

          it('should have exactly 2 rules', () => {
               expect(Object.keys(OFFER_VALIDATION_RULES).length).toBe(2);
          });

          it('should be readonly', () => {
               expect(OFFER_VALIDATION_RULES).toEqual({
                    createOffer: 'OfferCreate',
                    cancelOffer: 'OfferCancel',
               });
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['createOffer', 'getOrderBook', 'cancelOffer'] as const;

          it('should have consistent values across constants', () => {
               expect([...OFFER_TAB]).toEqual(expectedValues);
               expect(Object.values(OFFER_TX_TYPES)).toEqual(expectedValues);
          });
     });
});
