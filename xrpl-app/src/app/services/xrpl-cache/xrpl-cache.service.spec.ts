import { TestBed } from '@angular/core/testing';
import { XrplCacheService } from './xrpl-cache.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';

describe('XrplCacheService', () => {
     let service: XrplCacheService;
     let xrplService: jasmine.SpyObj<XrplService>;
     let mockClient: any;

     beforeEach(() => {
          mockClient = {
               isConnected: jasmine.createSpy().and.returnValue(true),
               request: jasmine.createSpy(),
               getLedgerIndex: jasmine.createSpy().and.returnValue(Promise.resolve(123456)),
          };

          xrplService = jasmine.createSpyObj('XrplService', ['getClient', 'getAccountInfo', 'getAccountObjects', 'getAccountLines', 'getTokenBalance', 'getNet', 'calculateTransactionFee', 'getLastLedgerIndex', 'getLedgerInfo', 'getXrplServerInfo', 'getXrplServerState', 'checkAccountObjectsForDeletion', 'getTxData']);

          xrplService.getClient.and.returnValue(Promise.resolve(mockClient));
          // Fix: Return object with net property
          xrplService.getNet.and.returnValue({ net: 'testnet', environment: 'testnet' });
          xrplService.calculateTransactionFee.and.returnValue(Promise.resolve('12'));
          xrplService.getLastLedgerIndex.and.returnValue(Promise.resolve(123456));
          xrplService.getLedgerInfo.and.returnValue(Promise.resolve({ lastIndex: 123456, closeTime: 1234567890, currentRippleTime: 500000 }));
          xrplService.getXrplServerInfo.and.returnValue(Promise.resolve({ result: { info: {} } } as any));
          xrplService.getXrplServerState.and.returnValue(Promise.resolve({ result: { state: { validated_ledger: { base_fee: '0.000010' } } } } as any));
          // Fix: Return proper response structure
          xrplService.checkAccountObjectsForDeletion.and.returnValue(Promise.resolve({ result: [] } as any));
          xrplService.getTxData.and.returnValue(Promise.resolve({ result: { hash: 'tx123', validated: true } } as any));
          xrplService.getAccountInfo.and.returnValue(Promise.resolve({ result: { account_data: { Account: 'rTest' } } } as any));
          xrplService.getAccountObjects.and.returnValue(Promise.resolve({ result: { account_objects: [] } } as any));
          xrplService.getAccountLines.and.returnValue(Promise.resolve({ result: { lines: [] } } as any));
          xrplService.getTokenBalance.and.returnValue(Promise.resolve({ result: { balances: {} } } as any));

          TestBed.configureTestingModule({
               providers: [XrplCacheService, { provide: XrplService, useValue: xrplService }],
          });

          service = TestBed.inject(XrplCacheService);
     });

     afterEach(() => {
          service.invalidate(); // Clear cache after each test
     });

     describe('getClient', () => {
          // it('should return existing client if connected', async () => {
          //      const client = await service.getClient(() => Promise.resolve(mockClient));
          //      expect(client).toBe(mockClient);
          //      expect(client.isConnected).toHaveBeenCalled();
          // });

          // it('should create new client if not connected', async () => {
          //      mockClient.isConnected.and.returnValue(false);

          //      const client = await service.getClient(() => Promise.resolve(mockClient));
          //      expect(client).toBe(mockClient);
          //      expect(xrplService.getClient).toHaveBeenCalled();
          // });

          it('should handle client creation error', async () => {
               mockClient.isConnected.and.returnValue(false);
               const error = new Error('Connection failed');
               xrplService.getClient.and.returnValue(Promise.reject(error));

               await expectAsync(service.getClient(() => xrplService.getClient())).toBeRejectedWith(error);
          });
     });

     describe('setTTL', () => {
          it('should set custom TTL for a key', () => {
               service.setTTL('customKey', 5000);
               expect(service['ttlMap'].get('customKey')).toBe(5000);
          });
     });

     describe('get and set', () => {
          it('should store and retrieve cached data', () => {
               const data = { test: 'value' };
               service.set('testKey', data);

               const result = service.get('testKey');
               expect(result).toEqual(data);
          });

          // it('should return null for expired data', () => {
          //      jasmine.clock().install();

          //      service.set('expiringKey', 'value', 100);
          //      jasmine.clock().tick(101);

          //      const result = service.get('expiringKey');
          //      expect(result).toBeNull();

          //      jasmine.clock().uninstall();
          // });

          it('should return null for non-existent key', () => {
               const result = service.get('nonexistent');
               expect(result).toBeNull();
          });
     });

     describe('invalidate', () => {
          it('should invalidate specific key', () => {
               service.set('key1', 'value1');
               service.set('key2', 'value2');

               service.invalidate('key1');

               expect(service.get('key1')).toBeNull();
               expect(service.get('key2')).toBe('value2');
          });

          it('should clear all cache when no key provided', () => {
               service.set('key1', 'value1');
               service.set('key2', 'value2');

               service.invalidate();

               expect(service.get('key1')).toBeNull();
               expect(service.get('key2')).toBeNull();
               expect(service['ttlMap'].size).toBe(0);
          });
     });

     describe('getOrFetch', () => {
          it('should return cached data if available', async () => {
               const cachedData = { cached: true };
               service.set('testKey', cachedData);

               const fetchFn = jasmine.createSpy().and.returnValue(Promise.resolve({ fresh: true }));
               const result = await service.getOrFetch('testKey', fetchFn);

               expect(result).toEqual(cachedData);
               expect(fetchFn).not.toHaveBeenCalled();
          });

          it('should fetch fresh data if not cached', async () => {
               const freshData = { fresh: true };
               const fetchFn = jasmine.createSpy().and.returnValue(Promise.resolve(freshData));

               const result = await service.getOrFetch('newKey', fetchFn);

               expect(result).toEqual(freshData);
               expect(fetchFn).toHaveBeenCalled();
          });

          it('should handle concurrent requests for same key', async () => {
               let callCount = 0;
               const fetchFn = jasmine.createSpy().and.callFake(() => {
                    callCount++;
                    return new Promise(resolve => setTimeout(() => resolve({ data: callCount }), 50));
               });

               const [result1, result2] = await Promise.all([service.getOrFetch('concurrentKey', fetchFn), service.getOrFetch('concurrentKey', fetchFn)]);

               expect(fetchFn).toHaveBeenCalledTimes(1);
               expect(result1).toEqual({ data: 1 });
               expect(result2).toEqual({ data: 1 });
          });
     });

     describe('invalidateAccountCache', () => {
          it('should invalidate all keys for a specific address', () => {
               service.set('account:rTest:info', 'info');
               service.set('account:rTest:objects', 'objects');
               service.set('account:rOther:info', 'other');

               service.invalidateAccountCache('rTest');

               expect(service.get('account:rTest:info')).toBeNull();
               expect(service.get('account:rTest:objects')).toBeNull();
               expect(service.get('account:rOther:info')).toBe('other');
          });
     });

     describe('getAccountData', () => {
          it('should fetch account info and objects', async () => {
               const result = await service.getAccountData('rTest');

               expect(result.accountInfo).toBeDefined();
               expect(result.accountObjects).toBeDefined();
               expect(xrplService.getAccountInfo).toHaveBeenCalled();
               expect(xrplService.getAccountObjects).toHaveBeenCalled();
          });

          it('should invalidate cache when forceRefresh is true', async () => {
               await service.getAccountData('rTest');
               await service.getAccountData('rTest', true);

               expect(xrplService.getAccountInfo).toHaveBeenCalledTimes(2);
               expect(xrplService.getAccountObjects).toHaveBeenCalledTimes(2);
          });
     });

     describe('getAccountInfo', () => {
          it('should fetch account info', async () => {
               const result = await service.getAccountInfo('rTest');
               expect(result).toBeDefined();
          });
     });

     describe('getAccountObjects', () => {
          it('should fetch account objects', async () => {
               const result = await service.getAccountObjects(mockClient, 'rTest');
               expect(result).toBeDefined();
          });
     });

     describe('getAccountLines', () => {
          it('should fetch account lines', async () => {
               const result = await service.getAccountLines(mockClient, 'rTest');
               expect(result).toBeDefined();
          });
     });

     describe('getAccountObjectsWithType', () => {
          it('should fetch account objects with type filter', async () => {
               const result = await service.getAccountObjectsWithType(mockClient, 'rTest', false, 'Offer');
               expect(result).toBeDefined();
          });
     });

     describe('getGatewayBalance', () => {
          it('should fetch gateway balance', async () => {
               const result = await service.getGatewayBalance(mockClient, 'rTest');
               expect(result).toBeDefined();
          });
     });

     describe('getFee', () => {
          it('should fetch fee', async () => {
               const result = await service.getFee(xrplService);
               expect(result).toBe('12');
          });
     });

     describe('getLedgerIndex', () => {
          it('should fetch ledger index', async () => {
               const result = await service.getLedgerIndex(mockClient);
               expect(result).toBe(123456);
          });
     });

     describe('getLedgerInfo', () => {
          it('should fetch ledger info', async () => {
               const result = await service.getLedgerInfo(mockClient);
               expect(result.lastIndex).toBe(123456);
          });
     });

     describe('getServerInfo', () => {
          it('should fetch server info', async () => {
               const result = await service.getServerInfo(xrplService);
               expect(result).toBeDefined();
          });
     });

     describe('getBlockingObjects', () => {
          it('should fetch blocking objects', async () => {
               const result = await service.getBlockingObjects(mockClient, 'rTest');
               expect(result).toBeDefined();
          });
     });

     describe('getBaseFeeDrops', () => {
          it('should fetch base fee in drops', async () => {
               const result = await service.getBaseFeeDrops(xrplService);
               expect(result).toBe(10);
          });
     });

     describe('getFeeAndServerInfo', () => {
          it('should fetch both fee and server info in parallel', async () => {
               const result = await service.getFeeAndServerInfo(xrplService);
               expect(result.fee).toBe('12');
               expect(result.serverInfo).toBeDefined();
          });
     });

     describe('getTxCached', () => {
          it('should fetch and cache transaction', async () => {
               const result = await service.getTxCached('tx123');
               expect(result).toBeDefined();
               expect(xrplService.getTxData).toHaveBeenCalled();
          });

          it('should return cached transaction if within TTL', async () => {
               await service.getTxCached('tx123');
               xrplService.getTxData.calls.reset();

               const result = await service.getTxCached('tx123');
               expect(result).toBeDefined();
               expect(xrplService.getTxData).not.toHaveBeenCalled();
          });
     });

     describe('debug', () => {
          it('should log cache info', () => {
               spyOn(console, 'log');
               service.set('debugKey', 'debugValue');
               service.debug();
               expect(console.log).toHaveBeenCalled();
          });

          it('should handle empty cache', () => {
               spyOn(console, 'log');
               service.debug();
               expect(console.log).toHaveBeenCalledWith('XrplCacheService -> cache is empty');
          });
     });

     describe('debugSnapshot', () => {
          it('should return cache snapshot', () => {
               service.set('snapKey', { test: 'data' });
               const snapshot = service.debugSnapshot();
               expect(snapshot['snapKey']).toBeDefined();
               expect(snapshot['snapKey'].data).toEqual({ test: 'data' });
          });
     });
});
