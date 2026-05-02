import { NFT_CREATE_TAB, NftCreateTab, NFT_CREATE_TX_TYPE_MAP, NFT_CREATE_TX_TYPES, NFT_CREATE_CONFIG_TX_DISPLAY_TYPES, NftCreateTxTypes, NftCreateConfigTxDisplayType, NFT_CREATE_VALIDATION_RULES, NFT_FLAGS_CONFIG } from './nft-create.constants';

describe('NFT Create Constants', () => {
     describe('NFT_CREATE_TAB', () => {
          it('should have exactly 3 tab values', () => {
               expect(NFT_CREATE_TAB.length).toBe(3);
          });

          it('should contain all expected tabs', () => {
               expect(NFT_CREATE_TAB).toContain('createNft');
               expect(NFT_CREATE_TAB).toContain('burnNft');
               expect(NFT_CREATE_TAB).toContain('updateNFTMetadata');
          });

          it('should have values in correct order', () => {
               expect(NFT_CREATE_TAB).toEqual(['createNft', 'burnNft', 'updateNFTMetadata']);
          });

          it('should be readonly (as const)', () => {
               expect(NFT_CREATE_TAB).toEqual(['createNft', 'burnNft', 'updateNFTMetadata']);
          });
     });

     describe('NftCreateTab type', () => {
          it('should allow valid tab values', () => {
               const validTabs: NftCreateTab[] = ['createNft', 'burnNft', 'updateNFTMetadata'];
               validTabs.forEach(tab => {
                    expect(NFT_CREATE_TAB).toContain(tab);
               });
          });
     });

     describe('NFT_CREATE_TX_TYPE_MAP', () => {
          it('should map all operations correctly', () => {
               expect(NFT_CREATE_TX_TYPE_MAP.createNft).toBe('createNft');
               expect(NFT_CREATE_TX_TYPE_MAP.burnNft).toBe('burnNft');
               expect(NFT_CREATE_TX_TYPE_MAP.updateNFTMetadata).toBe('updateNFTMetadata');
          });

          it('should have exactly 3 keys', () => {
               expect(Object.keys(NFT_CREATE_TX_TYPE_MAP).length).toBe(3);
          });
     });

     describe('NFT_CREATE_TX_TYPES', () => {
          it('should have all properties correctly set', () => {
               expect(NFT_CREATE_TX_TYPES.CREATE).toBe('createNft');
               expect(NFT_CREATE_TX_TYPES.BURN).toBe('burnNft');
               expect(NFT_CREATE_TX_TYPES.UPDATE_METADATA).toBe('updateNFTMetadata');
          });

          it('should have exactly 3 properties', () => {
               expect(Object.keys(NFT_CREATE_TX_TYPES).length).toBe(3);
          });
     });

     describe('NFT_CREATE_CONFIG_TX_DISPLAY_TYPES', () => {
          it('should match NFT_CREATE_TX_TYPES', () => {
               expect(NFT_CREATE_CONFIG_TX_DISPLAY_TYPES).toEqual(NFT_CREATE_TX_TYPES);
          });
     });

     describe('NFT_CREATE_VALIDATION_RULES', () => {
          it('should have validation rule for every type', () => {
               expect(NFT_CREATE_VALIDATION_RULES[NFT_CREATE_TX_TYPES.CREATE]).toBe('CreateNft');
               expect(NFT_CREATE_VALIDATION_RULES[NFT_CREATE_TX_TYPES.BURN]).toBe('BurnNft');
               expect(NFT_CREATE_VALIDATION_RULES[NFT_CREATE_TX_TYPES.UPDATE_METADATA]).toBe('UpdateNFTMetadata');
          });

          it('should have exactly 3 rules', () => {
               expect(Object.keys(NFT_CREATE_VALIDATION_RULES).length).toBe(3);
          });

          it('should be readonly', () => {
               expect(NFT_CREATE_VALIDATION_RULES).toEqual({
                    createNft: 'CreateNft',
                    burnNft: 'BurnNft',
                    updateNFTMetadata: 'UpdateNFTMetadata',
               });
          });
     });

     describe('NFT_FLAGS_CONFIG', () => {
          it('should have exactly 4 flag options', () => {
               expect(NFT_FLAGS_CONFIG.length).toBe(4);
          });

          it('should contain all expected flag keys', () => {
               const keys = NFT_FLAGS_CONFIG.map(f => f.key);
               expect(keys).toEqual(['burnableNft', 'onlyXrpNft', 'transferableNft', 'mutableNft']);
          });

          it('should have valid FlagOption structure', () => {
               NFT_FLAGS_CONFIG.forEach(flag => {
                    expect(flag.key).toBeDefined();
                    expect(flag.label).toBeDefined();
                    expect(flag.hex).toMatch(/^0x[0-9A-Fa-f]+/);
                    expect(flag.description.length).toBeGreaterThan(10);
               });
          });

          it('should have unique hex values', () => {
               const hexes = NFT_FLAGS_CONFIG.map(f => f.hex);
               expect(new Set(hexes).size).toBe(hexes.length);
          });
     });

     describe('Cross-reference consistency', () => {
          const expectedValues = ['createNft', 'burnNft', 'updateNFTMetadata'] as const;

          it('should have consistent values across constants', () => {
               expect([...NFT_CREATE_TAB]).toEqual(expectedValues);
               expect(Object.values(NFT_CREATE_TX_TYPE_MAP)).toEqual(expectedValues);
               expect(Object.values(NFT_CREATE_TX_TYPES)).toEqual(expectedValues);
               expect(Object.values(NFT_CREATE_CONFIG_TX_DISPLAY_TYPES)).toEqual(expectedValues);
          });
     });
});
