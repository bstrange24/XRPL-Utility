import { Injectable, NgZone } from '@angular/core';
import * as xrpl from 'xrpl';
import { Subject, from } from 'rxjs';
import { debounceTime, exhaustMap } from 'rxjs/operators';
import { UtilsService } from '../../util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { Wallet, WalletManagerService } from '../manager/wallet-manager.service';

interface RefreshPayload {
     client: xrpl.Client;
     wallets: Wallet[];
     selectedWalletIndex: number;
     addressesToRefresh?: string[];
     onUpdate?: (updatedWallets: Wallet[], newCurrentWallet: Wallet) => void;
}

@Injectable({
     providedIn: 'root',
})
export class WalletDataService {
     private cachedReserves: any = null;
     private readonly REFRESH_THRESHOLD_MS = 3000;

     private refreshRequests$ = new Subject<RefreshPayload>();

     constructor(
          private ngZone: NgZone,
          private utilsService: UtilsService,
          private xrplService: XrplService,
          private walletManagerService: WalletManagerService
     ) {
          // Debounced + non-overlapping refresh pipeline
          this.refreshRequests$
               .pipe(
                    debounceTime(250),
                    exhaustMap(payload => from(this.performRefreshWallets(payload.client, payload.wallets, payload.selectedWalletIndex, payload.addressesToRefresh, payload.onUpdate)))
               )
               .subscribe();
     }

     //  This only queues a refresh request.
     async refreshWallets(client: xrpl.Client, wallets: Wallet[], selectedWalletIndex: number, addressesToRefresh?: string[], onUpdate?: (updatedWallets: Wallet[], newCurrentWallet: Wallet) => void): Promise<void> {
          this.refreshRequests$.next({ client, wallets, selectedWalletIndex, addressesToRefresh, onUpdate });
     }

     private async performRefreshWallets(client: xrpl.Client, wallets: Wallet[], selectedWalletIndex: number, addressesToRefresh?: string[], onUpdate?: (updatedWallets: Wallet[], newCurrentWallet: Wallet) => void): Promise<void> {
          console.info('Entering refreshWallets');
          const start = performance.now();
          const now = Date.now();

          try {
               const normalize = (w: Wallet) => w.classicAddress ?? w.address;

               const addressFilter = addressesToRefresh ? new Set(addressesToRefresh) : null;

               const walletsToUpdate = wallets.filter(w => {
                    const address = normalize(w);
                    const needsUpdate = !w.lastUpdated || now - w.lastUpdated > this.REFRESH_THRESHOLD_MS;

                    const inFilter = addressFilter ? addressFilter.has(address) : true;

                    return needsUpdate && inFilter;
               });

               if (!walletsToUpdate.length) {
                    console.info('Leaving refreshWallets (nothing to update)');
                    return;
               }

               // Parallel account fetch
               const accountInfos = await Promise.all(walletsToUpdate.map(w => this.xrplService.getAccountInfo(client, normalize(w), 'validated', '')));

               // Cache reserve once per service lifecycle
               if (!this.cachedReserves) {
                    this.cachedReserves = await this.utilsService.getXrplReserve(client);
               }

               // Heavy computation outside Angular
               const updatedWallets = await this.ngZone.runOutsideAngular(async () => {
                    const results: Wallet[] = [];

                    for (let i = 0; i < walletsToUpdate.length; i++) {
                         const wallet = walletsToUpdate[i];
                         const accountInfo = accountInfos[i];
                         const address = normalize(wallet);

                         try {
                              const balanceDrops = accountInfo.result.account_data.Balance;

                              const balanceXrp = Number(xrpl.dropsToXrp(balanceDrops));

                              const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, address);

                              const reserves = Number(totalXrpReserves || 0);
                              const spendable = balanceXrp - reserves;

                              results.push({
                                   ...wallet,
                                   ownerCount,
                                   xrpReserves: totalXrpReserves,
                                   balance: spendable.toFixed(6),
                                   spendableXrp: spendable.toFixed(6),
                                   lastUpdated: now,
                              });
                         } catch (err) {
                              console.error(`Wallet update failed: ${address}`, err);
                              results.push(wallet);
                         }
                    }

                    return results;
               });

               // Re-enter Angular zone for state updates
               this.ngZone.run(() => {
                    const walletMap = new Map(updatedWallets.map(w => [normalize(w), w]));

                    wallets.forEach((wallet, index) => {
                         const updated = walletMap.get(normalize(wallet));
                         if (updated) {
                              this.walletManagerService.updateWallet(index, updated);
                         }
                    });

                    const currentWallet = wallets[selectedWalletIndex];
                    if (currentWallet) {
                         const updatedCurrent = walletMap.get(normalize(currentWallet)) ?? currentWallet;

                         onUpdate?.(wallets, { ...updatedCurrent });
                    }
               });
          } catch (error: any) {
               console.error('Error in refreshWallets:', error);
               throw new Error(error.message);
          } finally {
               console.info(`Leaving refreshWallets in ${(performance.now() - start).toFixed(2)}ms`);
          }
     }
}

// import { Injectable, NgZone } from '@angular/core';
// import * as xrpl from 'xrpl';
// import { UtilsService } from '../../util-service/utils.service';
// import { XrplService } from '../../xrpl-services/xrpl.service';
// import { Wallet, WalletManagerService } from '../manager/wallet-manager.service';

// @Injectable({
//      providedIn: 'root',
// })
// export class WalletDataService {
//      private cachedReserves: any = null;

//      constructor(
//           private ngZone: NgZone,
//           private utilsService: UtilsService,
//           private xrplService: XrplService,
//           private walletManagerService: WalletManagerService
//      ) {}

//      async refreshWallets(client: xrpl.Client, wallets: Wallet[], selectedWalletIndex: number, addressesToRefresh?: string[], onUpdate?: (updatedWallets: Wallet[], newCurrentWallet: Wallet) => void): Promise<void> {
//           console.log('Entering refreshWallets (service)');
//           const REFRESH_THRESHOLD_MS = 3000;
//           const now = Date.now();

//           try {
//                // Filter wallets that need refresh
//                const walletsToUpdate = wallets.filter(w => {
//                     const needsUpdate = !w.lastUpdated || now - w.lastUpdated > REFRESH_THRESHOLD_MS;
//                     const inFilter = addressesToRefresh ? addressesToRefresh.includes(w.classicAddress ?? w.address) : true;
//                     return needsUpdate && inFilter;
//                });

//                if (walletsToUpdate.length === 0) {
//                     console.debug('No wallets need updating.');
//                     return;
//                }

//                console.debug(`Refreshing ${walletsToUpdate.length} wallet(s)...`);

//                // Fetch account info in parallel
//                let accountInfos: any;
//                try {
//                     accountInfos = await Promise.all(walletsToUpdate.map(w => this.xrplService.getAccountInfo(client, w.classicAddress ?? w.address, 'validated', '')));
//                } catch (error: any) {
//                     throw new Error(error.message);
//                }

//                // Cache reserves once
//                if (!this.cachedReserves) {
//                     this.cachedReserves = await this.utilsService.getXrplReserve(client);
//                }

//                // Heavy computation outside Angular zone
//                const updatedWallets = await this.ngZone.runOutsideAngular(() =>
//                     Promise.all(
//                          walletsToUpdate.map(async (wallet, i) => {
//                               try {
//                                    const accountInfo = accountInfos[i];
//                                    const address = wallet.classicAddress ?? wallet.address;
//                                    const balanceInDrops = String(accountInfo.result.account_data.Balance);
//                                    const balanceXrp = xrpl.dropsToXrp(balanceInDrops);

//                                    const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, address);

//                                    const spendable = parseFloat(String(balanceXrp)) - parseFloat(String(totalXrpReserves || '0'));

//                                    return {
//                                         ...wallet,
//                                         ownerCount,
//                                         xrpReserves: totalXrpReserves,
//                                         balance: spendable.toFixed(6),
//                                         spendableXrp: spendable.toFixed(6),
//                                         lastUpdated: now,
//                                    };
//                               } catch (err) {
//                                    console.error(`Error updating wallet ${wallet.address}:`, err);
//                                    return wallet;
//                               }
//                          })
//                     )
//                );

//                // Apply updates inside Angular zone
//                this.ngZone.run(() => {
//                     updatedWallets.forEach(updated => {
//                          const idx = wallets.findIndex(w => (w.classicAddress ?? w.address) === (updated.classicAddress ?? updated.address));
//                          if (idx !== -1) {
//                               this.walletManagerService.updateWallet(idx, updated);
//                          }
//                     });

//                     // Update current wallet if it's in the list
//                     const currentWallet = wallets[selectedWalletIndex];
//                     if (currentWallet) {
//                          const updatedCurrent = updatedWallets.find(w => (w.classicAddress ?? w.address) === (currentWallet.classicAddress ?? currentWallet.address));
//                          const newCurrentWallet = updatedCurrent || currentWallet;
//                          onUpdate?.(wallets, { ...newCurrentWallet });
//                     }
//                });
//           } catch (error: any) {
//                console.error('Error in refreshWallets:', error);
//                throw new Error(error.message);
//           } finally {
//                console.log(`Leaving refreshWallets in ${(Date.now() - now).toString()}ms`);
//           }
//      }
// }
