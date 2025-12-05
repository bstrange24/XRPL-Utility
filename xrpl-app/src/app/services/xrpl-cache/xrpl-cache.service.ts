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

     // Generic cache with TTL per key
     private cache = new Map<string, CacheEntry<any>>();
     private defaultTTL = 10_000; // 10 seconds

     // Optional: per-network TTL or custom TTLs
     private ttlMap = new Map<string, number>();

     constructor(private xrplService: XrplService) {}

     setTTL(key: string, ttl: number) {
          this.ttlMap.set(key, ttl);
     }

     async getClient(getFreshClient: () => Promise<xrpl.Client>): Promise<xrpl.Client> {
          if (this.client && this.client.isConnected()) {
               return this.client;
          }

          this.client = await getFreshClient();
          return this.client;
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
          const cached = this.get<T>(key);
          if (cached !== null) {
               console.log('Using cache data.................');
               return cached;
          }

          const data = await fetchFn();
          this.set(key, data, ttl);
          return data;
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
               console.log('Invalidating cache for account data');
               this.invalidate(infoKey);
               this.invalidate(objectsKey);
          }

          const [accountInfo, accountObjects] = await Promise.all([this.getOrFetch(infoKey, () => this.xrplService.getAccountInfo(client, address, 'validated', ''), 10000), this.getOrFetch(objectsKey, () => this.xrplService.getAccountObjects(client, address, 'validated', ''), 10000)]);

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

          const [accountInfo] = await Promise.all([this.getOrFetch(infoKey, () => this.xrplService.getAccountInfo(client, address, 'validated', ''), 10000)]);

          // return { accountInfo };
          return accountInfo;
     }

     async getAccountObjects(address: string, forceRefresh?: boolean): Promise<xrpl.AccountObjectsResponse> {
          const infoKey = `account:${address}:info`;
          const objectsKey = `account:${address}:objects`;
          const client = await this.getClient(() => this.xrplService.getClient());

          if (forceRefresh) {
               this.invalidate(infoKey);
               this.invalidate(objectsKey);
          }

          const [accountObjects] = await Promise.all([this.getOrFetch(objectsKey, () => this.xrplService.getAccountObjects(client, address, 'validated', ''), 10000)]);

          return accountObjects;
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

     /** Get current base fee in drops */
     async getBaseFeeDrops(xrplService: XrplService): Promise<number> {
          const client = await this.getClient(() => xrplService.getClient());
          const ledger_info = await this.xrplService.getXrplServerState(client, 'current', '');
          const ledgerData = ledger_info.result.state.validated_ledger;
          const baseFee = ledgerData?.base_fee;
          const baseFeeXrpStr = baseFee?.toString() ?? '0.000010'; // 10 drops default
          return Math.ceil(parseFloat(baseFeeXrpStr) * 1_000_000);
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

     /** Pretty-print the entire cache – call it anywhere! */
     debug(): void {
          if (this.cache.size === 0) {
               console.log('XrplCacheService -> cache is empty');
               return;
          }

          console.group('XrplCacheService -> Current Cache (%d entries)', this.cache.size);

          for (const [key, entry] of this.cache.entries()) {
               const ageMs = Date.now() - entry.timestamp;
               const ageSec = (ageMs / 1000).toFixed(1);

               console.log(`Key: ${key}`);
               console.log(`   Age: ${ageSec}s ago`);
               console.log(`   Data:`, entry.data);
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

     getNetworkSnapshot(address: string, force = false, xrplService: XrplService) {
          return this.getOrFetch(`snapshot-${address}`, async () => {
               const client = await this.getClient(() => xrplService.getClient());
               const [data, fee, ledger] = await Promise.all([this.getAccountData(address, force), this.getFee(this.xrplService, force), this.xrplService.getLastLedgerIndex(client)]);

               return { ...data, fee, currentLedger: ledger };
          });
     }
}
