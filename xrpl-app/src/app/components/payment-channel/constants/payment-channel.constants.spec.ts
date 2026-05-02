import { PAYMENT_CHANNEL_TAB, PaymentChannelTab, PAYMENT_CHANNEL_TX_TYPE_MAP, PAYMENT_CHANNEL, PAYMENT_CHANNEL_CONFIG_TX_DISPLAY_TYPES, PaymentChannelTxType, PaymentChannelConfigTxDisplayType, PAYMENT_CHANNEL_VALIDATION_RULES } from './payment-channel.constants';

describe('Payment Channel Constants', () => {
     describe('PAYMENT_CHANNEL_TAB', () => {
          it('should have exactly 5 tab values', () => {
               expect(PAYMENT_CHANNEL_TAB.length).toBe(5);
          });

          it('should contain all expected tabs', () => {
               expect(PAYMENT_CHANNEL_TAB).toContain('createPaymentChannel');
               expect(PAYMENT_CHANNEL_TAB).toContain('fundPaymentChannel');
               expect(PAYMENT_CHANNEL_TAB).toContain('claimPaymentChannel');
               expect(PAYMENT_CHANNEL_TAB).toContain('renewPaymentChannel');
               expect(PAYMENT_CHANNEL_TAB).toContain('closePaymentChannel');
          });

          it('should have values in correct order', () => {
               expect(PAYMENT_CHANNEL_TAB).toEqual(['createPaymentChannel', 'fundPaymentChannel', 'claimPaymentChannel', 'renewPaymentChannel', 'closePaymentChannel']);
          });

          it('should be readonly (as const)', () => {
               expect(PAYMENT_CHANNEL_TAB).toEqual(['createPaymentChannel', 'fundPaymentChannel', 'claimPaymentChannel', 'renewPaymentChannel', 'closePaymentChannel']);
          });
     });

     describe('PaymentChannelTab & PaymentChannelTxType', () => {
          it('should allow valid tab values', () => {
               const validTabs: PaymentChannelTab[] = ['createPaymentChannel', 'fundPaymentChannel', 'claimPaymentChannel', 'renewPaymentChannel', 'closePaymentChannel'];
               validTabs.forEach(tab => expect(PAYMENT_CHANNEL_TAB).toContain(tab));
          });
     });

     describe('PAYMENT_CHANNEL_TX_TYPE_MAP', () => {
          it('should map all operations correctly', () => {
               expect(PAYMENT_CHANNEL_TX_TYPE_MAP.createPaymentChannel).toBe('PaymentChannelCreate');
               expect(PAYMENT_CHANNEL_TX_TYPE_MAP.fundPaymentChannel).toBe('PaymentChannelFund');
               expect(PAYMENT_CHANNEL_TX_TYPE_MAP.claimPaymentChannel).toBe('PaymentChannelClaim');
               expect(PAYMENT_CHANNEL_TX_TYPE_MAP.renewPaymentChannel).toBe('PaymentChannelRenew');
               expect(PAYMENT_CHANNEL_TX_TYPE_MAP.closePaymentChannel).toBe('PaymentChannelClose');
          });

          it('should have exactly 5 keys', () => {
               expect(Object.keys(PAYMENT_CHANNEL_TX_TYPE_MAP).length).toBe(5);
          });
     });

     describe('PAYMENT_CHANNEL', () => {
          it('should have all properties correctly set', () => {
               expect(PAYMENT_CHANNEL.CREATE).toBe('createPaymentChannel');
               expect(PAYMENT_CHANNEL.FUND).toBe('fundPaymentChannel');
               expect(PAYMENT_CHANNEL.CLAIM).toBe('claimPaymentChannel');
               expect(PAYMENT_CHANNEL.RENEW).toBe('renewPaymentChannel');
               expect(PAYMENT_CHANNEL.CLOSE).toBe('closePaymentChannel');
          });

          it('should have exactly 5 properties', () => {
               expect(Object.keys(PAYMENT_CHANNEL).length).toBe(5);
          });
     });

     describe('PAYMENT_CHANNEL_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match PAYMENT_CHANNEL', () => {
               expect(PAYMENT_CHANNEL_CONFIG_TX_DISPLAY_TYPES).toEqual(PAYMENT_CHANNEL);
          });
     });

     describe('PAYMENT_CHANNEL_VALIDATION_RULES', () => {
          it('should have validation rule for every type', () => {
               expect(PAYMENT_CHANNEL_VALIDATION_RULES['createPaymentChannel']).toBe('PaymentChannelCreate');
               expect(PAYMENT_CHANNEL_VALIDATION_RULES['fundPaymentChannel']).toBe('PaymentChannelFund');
               expect(PAYMENT_CHANNEL_VALIDATION_RULES['claimPaymentChannel']).toBe('PaymentChannelClaim');
               expect(PAYMENT_CHANNEL_VALIDATION_RULES['renewPaymentChannel']).toBe('PaymentChannelRenew');
               expect(PAYMENT_CHANNEL_VALIDATION_RULES['closePaymentChannel']).toBe('PaymentChannelClose');
          });

          it('should have exactly 5 rules', () => {
               expect(Object.keys(PAYMENT_CHANNEL_VALIDATION_RULES).length).toBe(5);
          });

          it('should be readonly', () => {
               expect(PAYMENT_CHANNEL_VALIDATION_RULES).toEqual({
                    createPaymentChannel: 'PaymentChannelCreate',
                    fundPaymentChannel: 'PaymentChannelFund',
                    claimPaymentChannel: 'PaymentChannelClaim',
                    renewPaymentChannel: 'PaymentChannelRenew',
                    closePaymentChannel: 'PaymentChannelClose',
               });
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['createPaymentChannel', 'fundPaymentChannel', 'claimPaymentChannel', 'renewPaymentChannel', 'closePaymentChannel'] as const;

          it('should have consistent values across constants', () => {
               expect([...PAYMENT_CHANNEL_TAB]).toEqual(expectedValues);
               expect(Object.values(PAYMENT_CHANNEL)).toEqual(expectedValues);
               expect(Object.values(PAYMENT_CHANNEL_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
          });
     });
});
