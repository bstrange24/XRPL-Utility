// xrpl-cache.service.ts
import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { XrplService } from '../../services/xrpl-services/xrpl.service';

interface CacheEntry<T> {
     data: T;
     timestamp: number;
}

@Injectable({
     providedIn: 'root', // Important: singleton across the app
})
export class XrplCacheService {
     private client: xrpl.Client | null = null;
     private clientPromise: Promise<xrpl.Client> | null = null;

     // Generic cache with TTL per key
     private readonly inflight = new Map<string, Promise<any>>();
     private readonly cache = new Map<string, CacheEntry<any>>();
     private readonly defaultTTL = 15_000; // 15 seconds

     // Optional: per-network TTL or custom TTLs
     private readonly ttlMap = new Map<string, number>();
     private readonly txCache = new Map<string, { data: any; timestamp: number }>();

     constructor(private readonly xrplService: XrplService) {}

     setTTL(key: string, ttl: number) {
          this.ttlMap.set(key, ttl);
     }

     async getClient(getFreshClient: () => Promise<xrpl.Client>): Promise<xrpl.Client> {
          if (this.client?.isConnected()) {
               return this.client;
          }

          if (this.clientPromise) {
               try {
                    this.client = await this.clientPromise;
                    this.clientPromise = null;
                    return this.client;
               } catch (error) {
                    this.clientPromise = null;
                    this.client = null;
                    throw error;
               }
          }

          this.clientPromise = getFreshClient();
          try {
               this.client = await this.clientPromise;
               this.clientPromise = null;
               return this.client;
          } catch (error) {
               this.clientPromise = null;
               this.client = null;
               throw error;
          }
     }

     get<T>(key: string): T | null {
          const entry = this.cache.get(key);
          if (!entry) return null;

          const ttl = this.ttlMap.get(key) ?? this.defaultTTL;
          if (Date.now() - entry.timestamp > ttl) {
               this.cache.delete(key);
               return null;
          }

          return entry.data;
     }

     set<T>(key: string, data: T, ttl?: number): void {
          this.cache.set(key, {
               data,
               timestamp: Date.now(),
          });

          if (ttl) {
               this.ttlMap.set(key, ttl);
          }
     }

     invalidate(key?: string): void {
          if (key) {
               this.cache.delete(key);
          } else {
               this.cache.clear();
               this.ttlMap.clear();
          }
     }

     // Convenience methods for common patterns
     async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
          // Return cached resolved value if valid
          const cached = this.get<T>(key);
          if (cached !== null) {
               return cached;
          }

          // If request already in progress, return same promise
          const existingPromise = this.inflight.get(key);
          if (existingPromise) {
               return existingPromise;
          }

          // Create and store in-flight promise
          const fetchPromise = (async () => {
               try {
                    const data = await fetchFn();
                    this.set(key, data, ttl);
                    return data;
               } finally {
                    this.inflight.delete(key); // always clean up
               }
          })();

          this.inflight.set(key, fetchPromise);
          return fetchPromise;
     }

     // Invalidate all account-related cache when wallet changes
     invalidateAccountCache(address: string) {
          const prefix = `account:${address}:`;
          for (const key of this.cache.keys()) {
               if (key.startsWith(prefix)) {
                    this.cache.delete(key);
               }
          }
     }

     async getAccountData(address: string, forceRefresh?: boolean): Promise<{ accountInfo: xrpl.AccountInfoResponse; accountObjects: xrpl.AccountObjectsResponse }> {
          const infoKey = `account:${address}:info`;
          const objectsKey = `account:${address}:objects`;
          const client = await this.getClient(() => this.xrplService.getClient());

          if (forceRefresh) {
               this.invalidate(infoKey);
               this.invalidate(objectsKey);
          }

          const [accountInfo, accountObjects] = await Promise.all([this.getOrFetch(infoKey, () => this.xrplService.getAccountInfo(client, address, 'validated', ''), this.defaultTTL), this.getOrFetch(objectsKey, () => this.xrplService.getAccountObjects(client, address, 'validated', ''), this.defaultTTL)]);

          return { accountInfo, accountObjects };
     }

     async getAccountInfo(address: string, forceRefresh?: boolean): Promise<xrpl.AccountInfoResponse> {
          const infoKey = `account:${address}:info`;
          const objectsKey = `account:${address}:objects`;
          const client = await this.getClient(() => this.xrplService.getClient());

          if (forceRefresh) {
               this.invalidate(infoKey);
               this.invalidate(objectsKey);
          }

          return await this.getOrFetch(infoKey, () => this.xrplService.getAccountInfo(client, address, 'validated', ''), this.defaultTTL);
     }

     async getAccountInfoTickets(client: xrpl.Client, address: string, forceRefresh?: boolean): Promise<xrpl.AccountInfoResponse> {
          const infoKey = `account:${address}:info`;
          const objectsKey = `account:${address}:objects`;

          if (forceRefresh) {
               this.invalidate(infoKey);
               this.invalidate(objectsKey);
          }

          return await this.getOrFetch(infoKey, () => this.xrplService.getAccountInfo(client, address, 'validated', ''), this.defaultTTL);
     }

     async getAccountObjects(client: xrpl.Client, address: string, forceRefresh?: boolean): Promise<xrpl.AccountObjectsResponse> {
          const infoKey = `account:${address}:info`;
          const objectsKey = `account:${address}:objects`;

          if (forceRefresh) {
               this.invalidate(infoKey);
               this.invalidate(objectsKey);
          }

          return await this.getOrFetch(objectsKey, () => this.xrplService.getAccountObjects(client, address, 'validated', ''), this.defaultTTL);
     }

     async getAccountLines(client: xrpl.Client, address: string, forceRefresh?: boolean): Promise<xrpl.AccountLinesResponse> {
          const linesKey = `account:${address}:lines`;

          if (forceRefresh) {
               this.invalidate(linesKey);
          }

          return await this.getOrFetch(linesKey, () => this.xrplService.getAccountLines(client, address, 'validated', ''), this.defaultTTL);
     }

     async getAccountObjectsWithType(client: xrpl.Client, address: string, forceRefresh?: boolean, type?: string): Promise<xrpl.AccountObjectsResponse> {
          const infoKey = `account:${address}:info:${type}`;
          const objectsKey = `account:${address}:objects:${type}`;

          if (forceRefresh) {
               this.invalidate(infoKey);
               this.invalidate(objectsKey);
          }

          return await this.getOrFetch(objectsKey, () => this.xrplService.getAccountObjects(client, address, 'validated', type || ''), this.defaultTTL);
     }

     async getGatewayBalance(client: xrpl.Client, address: string, forceRefresh?: boolean): Promise<any> {
          const gatewayKey = `account:${address}:gateway`;

          if (forceRefresh) {
               this.invalidate(gatewayKey);
          }

          return await this.getOrFetch(gatewayKey, () => this.xrplService.getTokenBalance(client, address, 'validated', ''), this.defaultTTL);
     }

     /** Get current transaction fee (drops or XRP) – cached for 8 seconds (fees change slowly) */
     async getFee(xrplService: XrplService, forceRefresh = false): Promise<string> {
          const network = xrplService.getNet().environment;
          const key = `${network}:server:fee`;

          if (forceRefresh) this.cache.delete(key);

          return this.getOrFetch(
               key,
               async () => {
                    const client = await this.getClient(() => xrplService.getClient());
                    return await xrplService.calculateTransactionFee(client);
               },
               this.getFeeTtl()
          );
     }

     async getLedgerIndex(client: xrpl.Client, forceRefresh = false): Promise<number> {
          const key = `server:ledgerIndex`;

          if (forceRefresh) this.cache.delete(key);

          return this.getOrFetch(
               key,
               async () => {
                    return await this.xrplService.getLastLedgerIndex(client);
               },
               4000 // 4 sec TTL is perfect
          );
     }

     async getLedgerInfo(client: xrpl.Client, forceRefresh = false): Promise<{ lastIndex: number; closeTime: number; currentRippleTime: number }> {
          const key = `server:ledgerInfo:all`;

          if (forceRefresh) this.cache.delete(key);

          return this.getOrFetch(
               key,
               async () => {
                    return await this.xrplService.getLedgerInfo(client);
               },
               4000 // 4 sec TTL
          );
     }

     /** Get server info (load, ledger index, validated ledger, etc.) – cached for 10 seconds */
     async getServerInfo(xrplService: XrplService, ledgerIndex: xrpl.LedgerIndex = 'current', forceRefresh = false): Promise<xrpl.ServerInfoResponse> {
          const network = xrplService.getNet().environment;
          const key = `${network}:server:info:${ledgerIndex}`;

          if (forceRefresh) this.cache.delete(key);

          return this.getOrFetch(
               key,
               async () => {
                    const client = await this.getClient(() => xrplService.getClient());
                    const response = await xrplService.getXrplServerInfo(client, ledgerIndex, '');
                    return response;
               },
               10_000
          ); // 10 seconds – server state changes slowly
     }

     async getBlockingObjects(client: xrpl.Client, address: string, forceRefresh = false): Promise<any> {
          const blockingKey = `account:${address}:blocking`;

          if (forceRefresh) {
               this.invalidate(blockingKey);
          }

          return await this.getOrFetch(blockingKey, () => this.xrplService.checkAccountObjectsForDeletion(client, address), this.defaultTTL);
     }

     /** Get current base fee in drops */
     async getBaseFeeDrops(xrplService: XrplService): Promise<number> {
          const client = await this.getClient(() => xrplService.getClient());
          const ledger_info = await this.xrplService.getXrplServerState(client, 'current', '');
          const ledgerData = ledger_info.result.state.validated_ledger;
          const baseFee = ledgerData?.base_fee;
          const baseFeeXrpStr = baseFee?.toString() ?? '0.000010'; // 10 drops default
          return Math.ceil(Number.parseFloat(baseFeeXrpStr) * 1_000_000);
     }

     /** ONE-LINER: Get both fee and server info in parallel (most common use case) */
     async getFeeAndServerInfo(xrplService: XrplService, options: { forceRefresh?: boolean; ledgerIndex?: xrpl.LedgerIndex } = {}): Promise<{ fee: string; serverInfo: xrpl.ServerInfoResponse }> {
          const { forceRefresh = false, ledgerIndex = 'current' } = options;
          const [fee, serverInfo] = await Promise.all([this.getFee(xrplService, forceRefresh), this.getServerInfo(xrplService, ledgerIndex, forceRefresh)]);
          return { fee, serverInfo };
     }

     private getFeeTtl(): number {
          const net = this.xrplService.getNet().environment;
          return net === 'mainnet' ? 15_000 : 8_000; // 8-second cache – longer on mainnet, fees change slower
     }

     async getTxCached(txid: string, ttlSeconds = 60): Promise<any> {
          const cached = this.txCache.get(txid);
          if (cached && Date.now() - cached.timestamp < ttlSeconds * 1000) {
               return cached.data;
          }

          const client = await this.getClient(() => this.xrplService.getClient());
          const result = await this.xrplService.getTxData(client, txid);
          this.txCache.set(txid, { data: result, timestamp: Date.now() });
          return result;
     }

     /** Pretty-print the entire cache – call it anywhere! */
     debug(): void {
          if (this.cache.size === 0) {
               return;
          }

          console.group('XrplCacheService -> Current Cache (%d entries)', this.cache.size);

          for (const [key, entry] of this.cache.entries()) {
               const ageMs = Date.now() - entry.timestamp;
               const ageSec = (ageMs / 1000).toFixed(1);

               console.groupEnd();
          }

          console.groupEnd();
     }

     /** Return cache as plain object */
     debugSnapshot(): Record<string, { ageSec: number; data: any }> {
          const snapshot: any = {};
          for (const [key, entry] of this.cache.entries()) {
               snapshot[key] = {
                    ageSec: ((Date.now() - entry.timestamp) / 1000).toFixed(1),
                    data: entry.data,
               };
          }
          return snapshot;
     }
}
