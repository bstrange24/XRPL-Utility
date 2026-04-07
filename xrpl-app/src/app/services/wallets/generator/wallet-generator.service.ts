import { inject, Injectable } from '@angular/core';
import { UtilsService } from '../../utils/util-service/utils.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { WalletManagerService } from '../manager/wallet-manager.service';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { WalletEntry } from '../../../models/interface-items.model';

export type WalletImportType = 'familySeed' | 'mnemonic' | 'secretNumbers';

@Injectable({ providedIn: 'root' })
export class WalletGeneratorService {
     private readonly walletManager = inject(WalletManagerService);
     private readonly storageService = inject(StorageService);
     private readonly http = inject(HttpClient);
     private readonly xrplCache = inject(XrplCacheService);
     private readonly xrplService = inject(XrplService);
     private readonly utilsService = inject(UtilsService);

     async generateWallet(type: WalletImportType, environment: string, algorithm: string) {
          const wallet = await this.generateViaApi(type, environment, algorithm);
          await this.utilsService.sleep(6000);

          await this.ensureAccountExists(wallet.address);

          return this.persistWallet(wallet);
     }

     async importWallet(type: WalletImportType, value: string | string[], algorithm: string) {
          const wallet = await this.deriveViaApi(type, value, algorithm);

          this.ensureWalletNotDuplicate(wallet.address);

          await this.ensureAccountExists(wallet.address);

          return this.persistWallet(wallet);
     }

     private persistWallet(wallet: any) {
          const entry = this.buildWalletEntry(wallet);
          this.walletManager.addWallet(entry);
          return wallet;
     }

     private buildWalletEntry(wallet: any): WalletEntry {
          const nextIndex = this.walletManager.wallets().length + 1;

          return {
               address: wallet.address,
               classicAddress: wallet.classicAddress ?? wallet.address,
               seed: wallet.seed ?? wallet.secret?.familySeed ?? '',
               mnemonic: wallet.secret?.mnemonic ?? '',
               secretNumbers: wallet.secret?.secretNumbers ?? '',
               encryptionAlgorithm: wallet.keypair?.algorithm ?? '',
               name: `Wallet ${nextIndex}`,
          };
     }

     private ensureWalletNotDuplicate(address: string) {
          const existingWallets = this.walletManager.wallets();
          const custom = this.parseDestinations(this.storageService.get('customDestinations'));

          const existsInWallets = existingWallets.some(w => w.address === address);
          const existsInCustom = custom.some(w => w.address === address);

          if (existsInWallets) {
               throw new Error('Wallet already exists in application.');
          }

          if (existsInCustom) {
               throw new Error('Wallet exists as custom destination. Remove it before importing.');
          }
     }

     private async ensureAccountExists(address: string) {
          const client = await this.getClient();
          await this.xrplService.getAccountInfo(client, address, 'validated', '');
     }

     private async generateViaApi(type: WalletImportType, environment: string, algorithm: string) {
          return this.httpPost<any>(`/api/create-wallet/${type}/`, {
               environment,
               algorithm,
          });
     }

     private async deriveViaApi(type: WalletImportType, value: string | string[], algorithm: string) {
          switch (type) {
               case 'familySeed':
                    return this.httpGet<any>(`/api/derive/familySeed?familySeed=${encodeURIComponent(value as string)}&algorithm=${algorithm}`);

               case 'mnemonic':
                    return this.httpGet<any>(`/api/derive/mnemonic?mnemonic=${encodeURIComponent(value as string)}&algorithm=${algorithm}`);

               case 'secretNumbers':
                    return this.httpPost<any>(`/api/derive/secretNumbers`, {
                         secretNumbers: Array.isArray(value) ? value : value.split(',').map(v => v.trim()),
                         algorithm,
                    });

               default:
                    throw new Error('Unsupported import type');
          }
     }

     private async httpGet<T>(url: string): Promise<T> {
          try {
               return await firstValueFrom(this.http.get<T>(url));
          } catch (err: any) {
               throw new Error(err?.error?.error || err.message);
          }
     }

     private async httpPost<T>(url: string, body: any): Promise<T> {
          try {
               return await firstValueFrom(this.http.post<T>(url, body));
          } catch (err: any) {
               throw new Error(err?.error?.error || err.message);
          }
     }

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     private parseDestinations(value: any): { name: string; address: string }[] {
          if (!value) return [];
          if (Array.isArray(value)) return value;

          try {
               return JSON.parse(value);
          } catch {
               return [];
          }
     }
}
