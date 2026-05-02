import { NFT_OFFERS_TAB, NftOffersTab, NFT_OFFERS_TX_TYPE_MAP, NFT_OFFERS_TX_TYPES, NFT_OFFERS_CONFIG_TX_DISPLAY_TYPES, NftOffersTxTypes, NftOffersConfigTxDisplayType, NFT_OFFERS_VALIDATION_RULES, NFT_FLAGS } from './nft-offers.constants';

describe('NFT Offers Constants', () => {
     describe('NFT_OFFERS_TAB', () => {
          it('should have exactly 5 tab values', () => {
               expect(NFT_OFFERS_TAB.length).toBe(5);
          });

          it('should contain all expected tabs', () => {
               expect(NFT_OFFERS_TAB).toContain('buyNft');
               expect(NFT_OFFERS_TAB).toContain('sellNft');
               expect(NFT_OFFERS_TAB).toContain('buyNftOffer');
               expect(NFT_OFFERS_TAB).toContain('sellNftOffer');
               expect(NFT_OFFERS_TAB).toContain('cancelNftOffer');
          });

          it('should have values in correct order', () => {
               expect(NFT_OFFERS_TAB).toEqual(['buyNft', 'sellNft', 'buyNftOffer', 'sellNftOffer', 'cancelNftOffer']);
          });

          it('should be readonly (as const)', () => {
               expect(NFT_OFFERS_TAB).toEqual(['buyNft', 'sellNft', 'buyNftOffer', 'sellNftOffer', 'cancelNftOffer']);
          });
     });

     describe('NftOffersTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: NftOffersTab[] = ['buyNft', 'sellNft', 'buyNftOffer', 'sellNftOffer', 'cancelNftOffer'];
               validTabs.forEach(tab => {
                    expect(NFT_OFFERS_TAB).toContain(tab);
               });
          });
     });

     describe('NFT_OFFERS_TX_TYPE_MAP', () => {
          it('should map all operations correctly', () => {
               expect(NFT_OFFERS_TX_TYPE_MAP.buyNft).toBe('buyNft');
               expect(NFT_OFFERS_TX_TYPE_MAP.sellNft).toBe('sellNft');
               expect(NFT_OFFERS_TX_TYPE_MAP.buyNftOffer).toBe('buyNftOffer');
               expect(NFT_OFFERS_TX_TYPE_MAP.sellNftOffer).toBe('sellNftOffer');
               expect(NFT_OFFERS_TX_TYPE_MAP.cancelNftOffer).toBe('cancelNftOffer');
          });

          it('should have exactly 5 keys', () => {
               expect(Object.keys(NFT_OFFERS_TX_TYPE_MAP).length).toBe(5);
          });
     });

     describe('NFT_OFFERS_TX_TYPES', () => {
          it('should have all properties correctly set', () => {
               expect(NFT_OFFERS_TX_TYPES.BUY_NFT).toBe('buyNft');
               expect(NFT_OFFERS_TX_TYPES.SELL_NFT).toBe('sellNft');
               expect(NFT_OFFERS_TX_TYPES.BUY_NFT_OFFER).toBe('buyNftOffer');
               expect(NFT_OFFERS_TX_TYPES.SELL_NFT_OFFER).toBe('sellNftOffer');
               expect(NFT_OFFERS_TX_TYPES.CANCEL_NFT_OFFER).toBe('cancelNftOffer');
          });

          it('should have exactly 5 properties', () => {
               expect(Object.keys(NFT_OFFERS_TX_TYPES).length).toBe(5);
          });
     });

     describe('NFT_OFFERS_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match NFT_OFFERS_TX_TYPES', () => {
               expect(NFT_OFFERS_CONFIG_TX_DISPLAY_TYPES).toEqual(NFT_OFFERS_TX_TYPES);
          });
     });

     describe('NFT_OFFERS_VALIDATION_RULES', () => {
          it('should have validation rule for every type', () => {
               expect(NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.BUY_NFT]).toBe('BuyNft');
               expect(NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.SELL_NFT]).toBe('SellNft');
               expect(NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.BUY_NFT_OFFER]).toBe('BuyNftOffer');
               expect(NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.SELL_NFT_OFFER]).toBe('SellNftOffer');
               expect(NFT_OFFERS_VALIDATION_RULES[NFT_OFFERS_TX_TYPES.CANCEL_NFT_OFFER]).toBe('CancelNftOffer');
          });

          it('should have exactly 5 rules', () => {
               expect(Object.keys(NFT_OFFERS_VALIDATION_RULES).length).toBe(5);
          });

          it('should be readonly', () => {
               expect(NFT_OFFERS_VALIDATION_RULES).toEqual({
                    buyNft: 'BuyNft',
                    sellNft: 'SellNft',
                    buyNftOffer: 'BuyNftOffer',
                    sellNftOffer: 'SellNftOffer',
                    cancelNftOffer: 'CancelNftOffer',
               });
          });
     });

     describe('NFT_FLAGS', () => {
          it('should have exactly 5 flag values', () => {
               expect(Object.keys(NFT_FLAGS).length).toBe(5);
          });

          it('should contain correct flag mappings', () => {
               expect(NFT_FLAGS.Burnable).toBe(1);
               expect(NFT_FLAGS.OnlyXRP).toBe(2);
               expect(NFT_FLAGS.TrustLine).toBe(4);
               expect(NFT_FLAGS.Transferable).toBe(8);
               expect(NFT_FLAGS.Mutable).toBe(16);
          });

          it('should be readonly', () => {
               expect(NFT_FLAGS).toEqual({
                    Burnable: 1,
                    OnlyXRP: 2,
                    TrustLine: 4,
                    Transferable: 8,
                    Mutable: 16,
               });
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['buyNft', 'sellNft', 'buyNftOffer', 'sellNftOffer', 'cancelNftOffer'] as const;

          it('should have consistent values across constants', () => {
               expect([...NFT_OFFERS_TAB]).toEqual(expectedValues);
               expect(Object.values(NFT_OFFERS_TX_TYPE_MAP)).toEqual(expectedValues);
               expect(Object.values(NFT_OFFERS_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(NFT_OFFERS_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
          });
     });
});
