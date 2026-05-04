import { TestBed } from '@angular/core/testing';
import { XrplService } from './xrpl.service';
import { StorageService } from '../shared/local-storage/storage.service';
import { ToastService } from '../utils/toast/toast.service';
import { AppConstants } from '../../core/app.constants';
import * as xrpl from 'xrpl';

// Mock xrpl functions at module level
const originalXrpl = { ...xrpl };

// Mock Buffer for tests
(window as any).Buffer = {
     from: (str: string) => ({
          toString: (encoding?: string) => {
               if (encoding === 'hex') {
                    let hex = '';
                    for (let i = 0; i < str.length; i++) {
                         const charCode = str.charCodeAt(i);
                         hex += charCode.toString(16).padStart(2, '0');
                    }
                    return hex;
               }
               return str;
          },
          subarray: (start: number, end: number) => ({
               indexOf: (val: number) => -1,
               buffer: new ArrayBuffer(end - start),
               toString: () => str.substring(start, end),
          }),
          indexOf: (val: number) => -1,
          includes: (val: number) => false,
     }),
     alloc: (size: number) => new ArrayBuffer(size),
};

describe('XrplService', () => {
     let service: XrplService;
     let mockStorageService: jasmine.SpyObj<StorageService>;
     let mockToastService: jasmine.SpyObj<ToastService>;

     beforeEach(() => {
          mockStorageService = jasmine.createSpyObj('StorageService', ['getNet', 'getInputValue', 'get']);
          mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'warn', 'info']);

          mockStorageService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });
          mockStorageService.getInputValue.and.returnValue('secp256k1');

          TestBed.configureTestingModule({
               providers: [XrplService, { provide: StorageService, useValue: mockStorageService }, { provide: ToastService, useValue: mockToastService }],
          });

          service = TestBed.inject(XrplService);
     });

     afterEach(() => {
          service.disconnect();
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should have initial connection status disconnected', () => {
               expect(service.connectionStatus$()).toBe('disconnected');
               expect(service.connectionMessage$()).toBe('Disconnected');
          });

          it('should have computed values', () => {
               expect(service.isConnected()).toBe(false);
               expect(service.isConnecting()).toBe(false);
               expect(service.isDisconnected()).toBe(true);
               expect(service.tokenCount()).toBe(0);
               expect(service.latestTokens()).toEqual([]);
          });
     });

     describe('getNet', () => {
          it('should return network from storage', () => {
               const net = service.getNet();
               expect(net).toEqual({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });
               expect(mockStorageService.getNet).toHaveBeenCalled();
          });
     });

     describe('getNetworkName', () => {
          it('should return capitalized network name', () => {
               const networkName = (service as any).getNetworkName();
               expect(networkName).toBe('Devnet');
          });
     });

     describe('getCurrentStatus', () => {
          it('should return current connection status', () => {
               expect(service.getCurrentStatus()).toBe('disconnected');
          });
     });

     describe('getCurrentMessage', () => {
          it('should return current connection message', () => {
               expect(service.getCurrentMessage()).toBe('Disconnected');
          });
     });

     describe('setStatus', () => {
          it('should update status and message signals', () => {
               (service as any).setStatus('connecting', 'Connecting...');
               expect(service.connectionStatus$()).toBe('connecting');
               expect(service.connectionMessage$()).toBe('Connecting...');
               expect(mockToastService.info).toHaveBeenCalled();
          });

          it('should show success toast when connected', () => {
               (service as any).setStatus('connected', 'Connected');
               expect(service.connectionStatus$()).toBe('connected');
               expect(mockToastService.success).toHaveBeenCalled();
          });
     });

     describe('getXrplServerInfo', () => {
          it('should fetch server info', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { info: { build_version: '1.0.0' } } }) } as any;
               await service.getXrplServerInfo(mockClient, 'validated', '');
               expect(mockClient.request).toHaveBeenCalledWith({
                    command: 'server_info',
                    ledger_index: 'validated',
               });
          });

          it('should handle errors', async () => {
               const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject(new Error('Network error'))) } as any;
               try {
                    await service.getXrplServerInfo(mockClient, 'validated', '');
                    fail('Expected error to be thrown');
               } catch (error: any) {
                    expect(error.message).toContain('Error fetching ledger server info');
               }
          });
     });

     describe('getTxData', () => {
          it('should fetch transaction data', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { tx_json: {} } }) } as any;
               await service.getTxData(mockClient, 'tx123');
               expect(mockClient.request).toHaveBeenCalledWith({
                    command: 'tx',
                    transaction: 'tx123',
               });
          });

          it('should handle errors', async () => {
               const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject(new Error('Network error'))) } as any;
               try {
                    await service.getTxData(mockClient, 'tx123');
                    fail('Expected error to be thrown');
               } catch (error: any) {
                    expect(error.message).toContain('Failed to fetch trasnaction data');
               }
          });
     });

     describe('getXrplServerState', () => {
          it('should fetch server state', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { state: {} } }) } as any;
               await service.getXrplServerState(mockClient, 'validated', '');
               expect(mockClient.request).toHaveBeenCalledWith({
                    command: 'server_state',
                    ledger_index: 'validated',
               });
          });
     });

     describe('getLastLedgerIndex', () => {
          it('should fetch last ledger index', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { ledger_index: 12345 } }) } as any;
               const result = await service.getLastLedgerIndex(mockClient);
               expect(result).toBe(12345);
          });
     });

     describe('getLedgerCloseTime', () => {
          it('should fetch ledger close time', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { ledger: { close_time: 1234567890 } } }) } as any;
               const result = await service.getLedgerCloseTime(mockClient);
               expect(result).toBe(1234567890);
          });
     });

     describe('getXrplReserve', () => {
          it('should fetch XRPL reserve data', async () => {
               const mockClient = {
                    request: jasmine.createSpy().and.resolveTo({
                         result: { state: { validated_ledger: { reserve_base: 10, reserve_inc: 2 } } },
                    }),
               } as any;
               spyOn(service, 'getXrplServerState').and.resolveTo(mockClient.request());

               const result = await service.getXrplReserve(mockClient);
               expect(result).toEqual({ reserveBaseXRP: 10, reserveIncrementXRP: 2 });
          });

          it('should return undefined on error', async () => {
               const mockClient = {} as any;
               spyOn(service, 'getXrplServerState').and.returnValue(Promise.reject(new Error('Network error')));

               const result = await service.getXrplReserve(mockClient);
               expect(result).toBeUndefined();
          });
     });

     describe('getAccountReserves', () => {
          it('should calculate account reserves', async () => {
               const mockClient = {} as any;
               const accountInfo = { result: { account_data: { OwnerCount: 5 } } };
               spyOn(service, 'getXrplReserve').and.resolveTo({ reserveBaseXRP: 10, reserveIncrementXRP: 2 });

               const result = await service.getAccountReserves(mockClient, accountInfo, 'rAddress');
               expect(result).toEqual({ ownerCount: 5, totalReserveXRP: 20 });
          });

          it('should return undefined on error', async () => {
               const mockClient = {} as any;
               const accountInfo = { result: { account_data: { OwnerCount: 5 } } };
               spyOn(service, 'getXrplReserve').and.returnValue(Promise.reject(new Error('Network error')));

               const result = await service.getAccountReserves(mockClient, accountInfo, 'rAddress');
               expect(result).toBeUndefined();
          });
     });

     describe('updateOwnerCountAndReserves', () => {
          it('should update owner count and reserves', async () => {
               const mockClient = {} as any;
               const accountInfo = { result: { account_data: { OwnerCount: 5 } } };
               spyOn(service, 'getAccountReserves').and.resolveTo({ ownerCount: 5, totalReserveXRP: 20 });

               const result = await service.updateOwnerCountAndReserves(mockClient, accountInfo, 'rAddress');
               expect(result).toEqual({ ownerCount: '5', totalXrpReserves: '0.00002' }); // 20 drops = 0.00002 XRP
          });
     });

     describe('getCurrentRippleTime', () => {
          it('should fetch current ripple time', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { ledger: { close_time: 1234567890 } } }) } as any;
               const result = await service.getCurrentRippleTime(mockClient);
               expect(result).toBe(1234567890);
          });
     });

     // describe('getLedgerInfo', () => {
     //      it('should fetch ledger info', async () => {
     //           const mockClient = {
     //                request: jasmine
     //                     .createSpy()
     //                     .and.resolveTo({ result: { ledger_index: 100, ledger: { close_time: 1234567890 } } })
     //                     .and.resolveTo({ result: { ledger: { close_time: 1234567891 } } }),
     //           } as any;

     //           const result = await service.getLedgerInfo(mockClient);
     //           expect(result.lastIndex).toBe(100);
     //           expect(result.closeTime).toBe(1234567891);
     //      });
     // });

     describe('getTransactionFee', () => {
          it('should fetch transaction fee', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { drops: { open_ledger_fee: '12' } } }) } as any;
               const result = await service.getTransactionFee(mockClient);
               expect(result).toBe('12');
          });
     });

     describe('calculateTransactionFee', () => {
          it('should calculate fee', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { drops: { open_ledger_fee: '12' } } }) } as any;
               const result = await service.calculateTransactionFee(mockClient);
               expect(result).toBeDefined();
          });

          it('should return min fee on error', async () => {
               const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject(new Error('Network error'))) } as any;
               const result = await service.calculateTransactionFee(mockClient);
               expect(result).toBe(AppConstants.MIN_FEE);
          });
     });

     describe('getAccountInfo', () => {
          it('should fetch account info without type', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_data: {} } }) } as any;
               await service.getAccountInfo(mockClient, 'rAddress', 'validated', '');
               expect(mockClient.request).toHaveBeenCalled();
          });

          it('should fetch account info with type', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_data: {} } }) } as any;
               await service.getAccountInfo(mockClient, 'rAddress', 'validated', 'trustline');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getAMMInfo', () => {
          it('should fetch AMM info', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { amm: {} } }) } as any;
               await service.getAMMInfo(mockClient, { currency: 'USD' }, { currency: 'XRP' }, 'rAddress', 'validated');
               expect(mockClient.request).toHaveBeenCalled();
          });

          it('should return empty array for actNotFound', async () => {
               const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject({ data: { error: 'actNotFound' } })) } as any;
               const result = await service.getAMMInfo(mockClient, { currency: 'USD' }, { currency: 'XRP' }, 'rAddress', 'validated');
               expect(result).toEqual([]);
          });
     });

     describe('getAccountNFTs', () => {
          it('should fetch account NFTs without type', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_nfts: [] } }) } as any;
               await service.getAccountNFTs(mockClient, 'rAddress', 'validated', '');
               expect(mockClient.request).toHaveBeenCalled();
          });

          it('should fetch account NFTs with type', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_nfts: [] } }) } as any;
               await service.getAccountNFTs(mockClient, 'rAddress', 'validated', 'nft');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getAccountNFTOffers', () => {
          it('should fetch account NFT offers', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_objects: [] } }) } as any;
               await service.getAccountNFTOffers(mockClient, 'rAddress', 'validated', 'nft_offer');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getNFTBuyOffers', () => {
          it('should fetch NFT buy offers', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { offers: [] } }) } as any;
               await service.getNFTBuyOffers(mockClient, 'nft123');
               expect(mockClient.request).toHaveBeenCalled();
          });

          it('should return empty array for objectNotFound', async () => {
               const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject({ data: { error: 'objectNotFound' } })) } as any;
               const result = await service.getNFTBuyOffers(mockClient, 'nft123');
               expect(result).toEqual([]);
          });
     });

     describe('getNFTSellOffers', () => {
          it('should fetch NFT sell offers', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { offers: [] } }) } as any;
               await service.getNFTSellOffers(mockClient, 'nft123');
               expect(mockClient.request).toHaveBeenCalled();
          });

          it('should return empty array for objectNotFound', async () => {
               const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject({ data: { error: 'objectNotFound' } })) } as any;
               const result = await service.getNFTSellOffers(mockClient, 'nft123');
               expect(result).toEqual([]);
          });
     });

     describe('fetchAllOffersSafe', () => {
          // it('should fetch all offers with pagination', async () => {
          //      const mockClient = {
          //           request: jasmine
          //                .createSpy()
          //                .and.resolveTo({ result: { offers: ['offer1'], marker: 'marker1' } })
          //                .and.resolveTo({ result: { offers: ['offer2'], marker: undefined } }),
          //      } as any;

          //      const result = await service.fetchAllOffersSafe(mockClient, 'nft_buy_offers', 'nft123');
          //      expect(result.length).toBe(2);
          //      expect(result).toEqual(['offer1', 'offer2']);
          // });

          it('should return empty array for objectNotFound', async () => {
               const mockClient = {
                    request: jasmine.createSpy().and.returnValue(Promise.reject({ data: { error: 'objectNotFound' } })),
               } as any;

               const result = await service.fetchAllOffersSafe(mockClient, 'nft_buy_offers', 'nft123');
               expect(result).toEqual([]);
          });
     });

     describe('getNFTHistory', () => {
          it('should fetch NFT history', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { history: [] } }) } as any;
               await service.getNFTHistory(mockClient, 'validated', 'nft123');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getNFTsByIssuer', () => {
          it('should fetch NFTs by issuer', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { nfts: [] } }) } as any;
               await service.getNFTsByIssuer(mockClient, 'validated', 'nft123', 'rIssuer');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     // describe('getChannelVerifiy', () => {
     //      it('should verify channel', async () => {
     //           const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { verified: true } }) } as any;

     //           await service.getChannelVerifiy(mockClient, 'channel123', '1', 'pubkey', 'sig');
     //           expect(mockClient.request).toHaveBeenCalled();
     //           expect(xrpl.xrpToDrops).toHaveBeenCalledWith('1');
     //      });
     // });

     // describe('getPaymentChannelAuthorized', () => {
     //      it('should authorize payment channel', async () => {
     //           const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { signature: 'sig' } }) } as any;
     //           const mockWallet = { seed: 'seed123' } as any;

     //           await service.getPaymentChannelAuthorized(mockClient, 'channel123', '1', mockWallet);
     //           expect(mockClient.request).toHaveBeenCalled();
     //           expect(xrpl.xrpToDrops).toHaveBeenCalledWith('1');
     //      });
     // });

     describe('getAccountObjects', () => {
          it('should fetch account objects without type', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_objects: [] } }) } as any;
               await service.getAccountObjects(mockClient, 'rAddress', 'validated', '');
               expect(mockClient.request).toHaveBeenCalled();
          });

          it('should fetch account objects with type', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_objects: [] } }) } as any;
               await service.getAccountObjects(mockClient, 'rAddress', 'validated', 'ticket');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('checkAccountObjectsForDeletion', () => {
          it('should check account objects for deletion', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_objects: [] } }) } as any;
               await service.checkAccountObjectsForDeletion(mockClient, 'rAddress');
               expect(mockClient.request).toHaveBeenCalledWith({
                    command: 'account_objects',
                    account: 'rAddress',
                    deletion_blockers_only: true,
               });
          });
     });

     describe('getAccountLines', () => {
          it('should fetch account lines without type', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { lines: [] } }) } as any;
               await service.getAccountLines(mockClient, 'rAddress', 'validated', '');
               expect(mockClient.request).toHaveBeenCalled();
          });

          it('should fetch account lines with type', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { lines: [] } }) } as any;
               await service.getAccountLines(mockClient, 'rAddress', 'validated', 'trustline');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getTokenBalance', () => {
          // it('should fetch token balance with data', async () => {
          //      const mockClient = {
          //           request: jasmine.createSpy().and.resolveTo({
          //                result: { balances: { rAddress: { USD: '100' } }, obligations: {} },
          //           }),
          //      } as any;

          //      const result = await service.getTokenBalance(mockClient, 'rAddress', 'validated', '');
          //      expect(result.result.account).toBe('rAddress');
          // });

          it('should return empty response when no data', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: {} }) } as any;
               const result = await service.getTokenBalance(mockClient, 'rAddress', 'validated', '');
               expect(result.result.account).toBe('rAddress');
          });

          it('should return empty response on error', async () => {
               const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject(new Error('Network error'))) } as any;
               const result = await service.getTokenBalance(mockClient, 'rAddress', 'validated', '');
               expect(result.result.account).toBe('rAddress');
          });
     });

     describe('getAccountOffers', () => {
          it('should fetch account offers', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { offers: [] } }) } as any;
               await service.getAccountOffers(mockClient, 'rAddress', 'validated', '');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getAccountChannels', () => {
          it('should fetch account channels', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { channels: [] } }) } as any;
               await service.getAccountChannels(mockClient, 'rAddress', 'validated', '');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getAccountCurrencies', () => {
          it('should fetch account currencies', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { send_currencies: [], receive_currencies: [] } }) } as any;
               await service.getAccountCurrencies(mockClient, 'rAddress', 'validated', '');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getAccountTrustlines', () => {
          it('should fetch account trustlines', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { lines: [] } }) } as any;
               await service.getAccountTrustlines(mockClient, 'rAddress', 'validated', '');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getMptByIssuanceId', () => {
          it('should fetch MPT info', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { holders: [] } }) } as any;
               await service.getMptByIssuanceId(mockClient, 'issuance123', 'validated');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getAccountTransactions', () => {
          it('should fetch account transactions', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { transactions: [] } }) } as any;
               await service.getAccountTransactions(mockClient, 'rAddress', 10, '');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('getAccountNoRippleCheck', () => {
          it('should fetch no ripple check', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: {} }) } as any;
               await service.getAccountNoRippleCheck(mockClient, 'rAddress', 'validated', 'gateway');
               expect(mockClient.request).toHaveBeenCalled();
          });
     });

     describe('checkTicketExists', () => {
          it('should check if ticket exists', async () => {
               spyOn(service, 'getAccountObjects').and.resolveTo({
                    result: { account_objects: [{ TicketSequence: 12345 }] },
               } as any);

               const result = await service.checkTicketExists({} as any, 'rAddress', 12345);
               expect(result).toBe(true);
          });

          it('should return false when ticket not found', async () => {
               spyOn(service, 'getAccountObjects').and.resolveTo({
                    result: { account_objects: [] },
               } as any);

               const result = await service.checkTicketExists({} as any, 'rAddress', 12345);
               expect(result).toBe(false);
          });

          it('should return false on error', async () => {
               spyOn(service, 'getAccountObjects').and.returnValue(Promise.reject(new Error('Network error')));
               const result = await service.checkTicketExists({} as any, 'rAddress', 12345);
               expect(result).toBe(false);
          });
     });

     describe('getCheckByCheckId', () => {
          it('should fetch check by ID', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { node: { Check: {} } } }) } as any;
               const result = await service.getCheckByCheckId(mockClient, 'check123', 'validated');
               expect(result).toBeDefined();
          });

          it('should return null when check not found', async () => {
               const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: {} }) } as any;
               const result = await service.getCheckByCheckId(mockClient, 'check123', 'validated');
               expect(result).toBeNull();
          });

          it('should return null on error', async () => {
               const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject(new Error('Network error'))) } as any;
               const result = await service.getCheckByCheckId(mockClient, 'check123', 'validated');
               expect(result).toBeNull();
          });
     });

     describe('getEscrowBySequence', () => {
          it('should fetch escrow by sequence', async () => {
               const mockClient = {} as any;
               const escrowObj = { PreviousTxnID: 'tx123', Amount: '1000000' };
               spyOn(service, 'getAccountObjects').and.resolveTo({
                    result: { account_objects: [escrowObj] },
               } as any);
               spyOn(service, 'getTxData').and.resolveTo({ result: { tx_json: { Sequence: 12345 } } } as any);

               const result = await service.getEscrowBySequence(mockClient, 'rAddress', 12345);
               expect(result).toBeDefined();
               expect(result.Sequence).toBe(12345);
          });

          it('should return null when escrow not found', async () => {
               const mockClient = {} as any;
               spyOn(service, 'getAccountObjects').and.resolveTo({
                    result: { account_objects: [] },
               } as any);

               const result = await service.getEscrowBySequence(mockClient, 'rAddress', 12345);
               expect(result).toBeNull();
          });

          it('should return null on error', async () => {
               const mockClient = {} as any;
               spyOn(service, 'getAccountObjects').and.returnValue(Promise.reject(new Error('Network error')));
               const result = await service.getEscrowBySequence(mockClient, 'rAddress', 12345);
               expect(result).toBeNull();
          });
     });

     describe('getOnlyTokenBalance', () => {
          it('should fetch only token balance', async () => {
               spyOn(service, 'getAccountLines').and.resolveTo({
                    result: { lines: [{ currency: 'USD', balance: '1000' }] },
               } as any);
               spyOn(service, 'decodeCurrencyCode').and.returnValue('USD');

               const result = await service.getOnlyTokenBalance({} as any, 'rAddress', 'USD');
               expect(result).toBe('1000');
          });

          it('should return 0 when token not found', async () => {
               spyOn(service, 'getAccountLines').and.resolveTo({
                    result: { lines: [] },
               } as any);

               const result = await service.getOnlyTokenBalance({} as any, 'rAddress', 'USD');
               expect(result).toBe('0');
          });

          it('should handle long currency codes', async () => {
               spyOn(service, 'getAccountLines').and.resolveTo({
                    result: { lines: [{ currency: 'XRP', balance: '1000' }] },
               } as any);
               spyOn(service, 'decodeCurrencyCode').and.callFake(code => code);

               const result = await service.getOnlyTokenBalance({} as any, 'rAddress', 'longCurrencyCode');
               expect(result).toBe('0');
          });
     });

     describe('getXrpReserveRequirements', () => {
          it('should get XRP reserve requirements', () => {
               const accountInfo = { result: { account_data: { Reserve: 20, OwnerCount: 5 } } };
               const serverInfo = { result: { info: { validated_ledger: { reserve_base_xrp: 10, reserve_inc_xrp: 2 } } } };

               const result = service.getXrpReserveRequirements(accountInfo, serverInfo);
               expect(result).toEqual({
                    baseReserve: 10,
                    ownerReserve: 2,
                    currentReserve: 20,
                    ownerCount: 5,
               });
          });
     });

     describe('delay', () => {
          it('should delay for specified time', async () => {
               const start = Date.now();
               await service.delay(100);
               const end = Date.now();
               expect(end - start).toBeGreaterThanOrEqual(99);
          });
     });

     // describe('decodeCurrencyCode', () => {
     //      it('should decode currency code from hex', () => {
     //           // Create a proper mock for the buffer behavior
     //           const mockBufferObj = {
     //                subarray: jasmine.createSpy().and.returnValue({
     //                     indexOf: jasmine.createSpy().and.returnValue(-1),
     //                     buffer: new ArrayBuffer(20),
     //                }),
     //                includes: jasmine.createSpy().and.returnValue(false),
     //                toString: () => 'USD',
     //           };
     //           spyOn(Buffer, 'from').and.returnValue(mockBufferObj as any);

     //           const result = service.decodeCurrencyCode('555344');
     //           expect(result).toBeDefined();
     //      });
     // });

     // Connection management tests
     describe('connection management', () => {
          let mockClient: any;

          beforeEach(() => {
               mockClient = {
                    isConnected: jasmine.createSpy().and.returnValue(true),
                    connect: jasmine.createSpy().and.resolveTo(undefined),
                    disconnect: jasmine.createSpy().and.resolveTo(undefined),
                    request: jasmine.createSpy().and.resolveTo({ result: { info: { build_version: '1.0.0', validated_ledger: { seq: 12345 } } } }),
                    on: jasmine.createSpy(),
                    removeAllListeners: jasmine.createSpy(),
               };

               // Reset the client signal
               (service as any).client.set(null);
               (service as any).connectingPromise = null;
          });

          describe('getClient', () => {
               it('should return existing client if connected', async () => {
                    (service as any).client.set(mockClient);
                    const result = await service.getClient();
                    expect(result).toBe(mockClient);
               });
          });

          // describe('ensureConnection', () => {
          //      it('should throw error when no connection', async () => {
          //           try {
          //                await service.ensureConnection();
          //                fail('Expected error to be thrown');
          //           } catch (error: any) {
          //                expect(error.message).toContain('No active connection');
          //           }
          //      });
          // });

          describe('isConnectionReady', () => {
               it('should return false when not connected', () => {
                    expect(service.isConnectionReady()).toBe(false);
               });

               it('should return true when connected', () => {
                    (service as any).client.set(mockClient);
                    expect(service.isConnectionReady()).toBe(true);
               });
          });

          describe('getConnectionStatus', () => {
               it('should return connection status', () => {
                    (service as any).setStatus('connected', 'Connected');
                    const status = service.getConnectionStatus();
                    expect(status.status).toBe('connected');
                    expect(status.message).toBe('Connected');
                    expect(status.isConnected).toBe(false); // No client set
               });
          });

          describe('disconnect', () => {
               it('should handle disconnect when no client', async () => {
                    await service.disconnect();
                    expect(service.isConnected()).toBe(false);
               });
          });
     });
});

// import { TestBed } from '@angular/core/testing';
// import { XrplService } from './xrpl.service';
// import { StorageService } from '../shared/local-storage/storage.service';
// import { ToastService } from '../utils/toast/toast.service';
// import { AppConstants } from '../../core/app.constants';
// import * as xrpl from 'xrpl';

// // Mock Buffer for tests
// (window as any).Buffer = {
//      from: (str: string) => ({
//           toString: () => {
//                let hex = '';
//                for (let i = 0; i < str.length; i++) {
//                     const charCode = str.charCodeAt(i);
//                     hex += charCode.toString(16).padStart(2, '0');
//                }
//                return hex;
//           },
//           subarray: (start: number, end: number) => ({
//                indexOf: (val: number) => -1,
//           }),
//      }),
// };

// describe('XrplService', () => {
//      let service: XrplService;
//      let mockStorageService: jasmine.SpyObj<StorageService>;
//      let mockToastService: jasmine.SpyObj<ToastService>;

//      beforeEach(() => {
//           mockStorageService = jasmine.createSpyObj('StorageService', ['getNet', 'getInputValue', 'get']);
//           mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'warn', 'info']);

//           // Fix: Add net property
//           mockStorageService.getNet.and.returnValue({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });
//           mockStorageService.getInputValue.and.returnValue('secp256k1');

//           TestBed.configureTestingModule({
//                providers: [XrplService, { provide: StorageService, useValue: mockStorageService }, { provide: ToastService, useValue: mockToastService }],
//           });

//           service = TestBed.inject(XrplService);
//      });

//      describe('initialization', () => {
//           it('should be created', () => {
//                expect(service).toBeTruthy();
//           });

//           it('should have initial connection status disconnected', () => {
//                expect(service.connectionStatus$()).toBe('disconnected');
//                expect(service.connectionMessage$()).toBe('Disconnected');
//           });

//           it('should have computed values', () => {
//                expect(service.isConnected()).toBe(false);
//                expect(service.isConnecting()).toBe(false);
//                expect(service.isDisconnected()).toBe(true);
//                expect(service.tokenCount()).toBe(0);
//                expect(service.latestTokens()).toEqual([]);
//           });
//      });

//      describe('getNet', () => {
//           it('should return network from storage', () => {
//                const net = service.getNet();
//                expect(net).toEqual({ net: 'wss://s.devnet.rippletest.net:51233', environment: 'devnet' });
//                expect(mockStorageService.getNet).toHaveBeenCalled();
//           });
//      });

//      describe('getNetworkName', () => {
//           it('should return capitalized network name', () => {
//                const networkName = (service as any).getNetworkName();
//                expect(networkName).toBe('Devnet');
//           });
//      });

//      describe('setStatus', () => {
//           it('should update status and message signals', () => {
//                (service as any).setStatus('connecting', 'Connecting...');

//                expect(service.connectionStatus$()).toBe('connecting');
//                expect(service.connectionMessage$()).toBe('Connecting...');
//                expect(mockToastService.info).toHaveBeenCalled();
//           });

//           it('should show success toast when connected', () => {
//                (service as any).setStatus('connected', 'Connected');

//                expect(service.connectionStatus$()).toBe('connected');
//                expect(mockToastService.success).toHaveBeenCalled();
//           });
//      });

//      describe('getCurrentStatus', () => {
//           it('should return current connection status', () => {
//                expect(service.getCurrentStatus()).toBe('disconnected');
//           });
//      });

//      describe('getCurrentMessage', () => {
//           it('should return current connection message', () => {
//                expect(service.getCurrentMessage()).toBe('Disconnected');
//           });
//      });

//      describe('getXrplServerInfo', () => {
//           it('should fetch server info', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { info: { build_version: '1.0.0' } } }) } as any;

//                const result = await service.getXrplServerInfo(mockClient, 'validated', '');

//                expect(mockClient.request).toHaveBeenCalledWith({
//                     command: 'server_info',
//                     ledger_index: 'validated',
//                });
//           });

//           it('should handle errors', async () => {
//                const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject(new Error('Network error'))) } as any;

//                try {
//                     await service.getXrplServerInfo(mockClient, 'validated', '');
//                     fail('Expected error to be thrown');
//                } catch (error: any) {
//                     expect(error.message).toContain('Error fetching ledger server info');
//                }
//           });
//      });

//      describe('getTxData', () => {
//           it('should fetch transaction data', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { tx_json: {} } }) } as any;

//                const result = await service.getTxData(mockClient, 'tx123');

//                expect(mockClient.request).toHaveBeenCalledWith({
//                     command: 'tx',
//                     transaction: 'tx123',
//                });
//           });
//      });

//      describe('getXrplServerState', () => {
//           it('should fetch server state', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { state: {} } }) } as any;

//                const result = await service.getXrplServerState(mockClient, 'validated', '');

//                expect(mockClient.request).toHaveBeenCalledWith({
//                     command: 'server_state',
//                     ledger_index: 'validated',
//                });
//           });
//      });

//      describe('getLastLedgerIndex', () => {
//           it('should fetch last ledger index', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { ledger_index: 12345 } }) } as any;

//                const result = await service.getLastLedgerIndex(mockClient);

//                expect(result).toBe(12345);
//                expect(mockClient.request).toHaveBeenCalledWith({
//                     command: 'ledger',
//                     ledger_index: 'validated',
//                });
//           });
//      });

//      describe('getLedgerCloseTime', () => {
//           it('should fetch ledger close time', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { ledger: { close_time: 1234567890 } } }) } as any;

//                const result = await service.getLedgerCloseTime(mockClient);

//                expect(result).toBe(1234567890);
//           });
//      });

//      describe('getTransactionFee', () => {
//           it('should fetch transaction fee', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { drops: { open_ledger_fee: '12' } } }) } as any;

//                const result = await service.getTransactionFee(mockClient);

//                expect(result).toBe('12');
//           });
//      });

//      describe('calculateTransactionFee', () => {
//           it('should calculate fee', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { drops: { open_ledger_fee: '12' } } }) } as any;

//                const result = await service.calculateTransactionFee(mockClient);

//                expect(result).toBeDefined();
//           });

//           it('should return min fee on error', async () => {
//                const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject(new Error('Network error'))) } as any;

//                const result = await service.calculateTransactionFee(mockClient);

//                expect(result).toBe(AppConstants.MIN_FEE);
//           });
//      });

//      describe('getAccountInfo', () => {
//           it('should fetch account info', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_data: {} } }) } as any;

//                const result = await service.getAccountInfo(mockClient, 'rAddress', 'validated', '');

//                expect(mockClient.request).toHaveBeenCalled();
//           });
//      });

//      describe('getAccountObjects', () => {
//           it('should fetch account objects', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { account_objects: [] } }) } as any;

//                const result = await service.getAccountObjects(mockClient, 'rAddress', 'validated', '');

//                expect(mockClient.request).toHaveBeenCalled();
//           });
//      });

//      describe('getAccountLines', () => {
//           it('should fetch account lines', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { lines: [] } }) } as any;

//                const result = await service.getAccountLines(mockClient, 'rAddress', 'validated', '');

//                expect(mockClient.request).toHaveBeenCalled();
//           });
//      });

//      describe('getTokenBalance', () => {
//           it('should fetch token balance', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { balances: {} } }) } as any;

//                const result = await service.getTokenBalance(mockClient, 'rAddress', 'validated', '');

//                expect(result.result.account).toBe('rAddress');
//           });

//           it('should return empty response on error', async () => {
//                const mockClient = { request: jasmine.createSpy().and.returnValue(Promise.reject(new Error('Network error'))) } as any;

//                const result = await service.getTokenBalance(mockClient, 'rAddress', 'validated', '');

//                expect(result.result).toBeDefined();
//                expect(result.result.account).toBe('rAddress');
//           });
//      });

//      describe('getAccountTrustlines', () => {
//           it('should fetch account trustlines', async () => {
//                const mockClient = { request: jasmine.createSpy().and.resolveTo({ result: { lines: [] } }) } as any;

//                const result = await service.getAccountTrustlines(mockClient, 'rAddress', 'validated', '');

//                expect(mockClient.request).toHaveBeenCalled();
//           });
//      });

//      describe('checkTicketExists', () => {
//           it('should check if ticket exists', async () => {
//                spyOn(service, 'getAccountObjects').and.resolveTo({
//                     result: { account_objects: [{ TicketSequence: 12345 }] },
//                } as any);

//                const result = await service.checkTicketExists({} as any, 'rAddress', 12345);

//                expect(result).toBe(true);
//           });

//           it('should return false when ticket not found', async () => {
//                spyOn(service, 'getAccountObjects').and.resolveTo({
//                     result: { account_objects: [] },
//                } as any);

//                const result = await service.checkTicketExists({} as any, 'rAddress', 12345);

//                expect(result).toBe(false);
//           });

//           it('should return false on error', async () => {
//                spyOn(service, 'getAccountObjects').and.returnValue(Promise.reject(new Error('Network error')));

//                const result = await service.checkTicketExists({} as any, 'rAddress', 12345);

//                expect(result).toBe(false);
//           });
//      });

//      describe('getOnlyTokenBalance', () => {
//           it('should fetch only token balance', async () => {
//                spyOn(service, 'getAccountLines').and.resolveTo({
//                     result: { lines: [{ currency: 'USD', balance: '1000' }] },
//                } as any);
//                spyOn(service, 'decodeCurrencyCode').and.returnValue('USD');

//                const result = await service.getOnlyTokenBalance({} as any, 'rAddress', 'USD');

//                expect(result).toBe('1000');
//           });

//           it('should return 0 when token not found', async () => {
//                spyOn(service, 'getAccountLines').and.resolveTo({
//                     result: { lines: [] },
//                } as any);

//                const result = await service.getOnlyTokenBalance({} as any, 'rAddress', 'USD');

//                expect(result).toBe('0');
//           });
//      });

//      describe('delay', () => {
//           it('should delay for specified time', async () => {
//                const start = Date.now();
//                await service.delay(100);
//                const end = Date.now();
//                expect(end - start).toBeGreaterThanOrEqual(99);
//           });
//      });
// });
