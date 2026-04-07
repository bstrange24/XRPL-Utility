import { inject, Injectable, NgZone } from '@angular/core';
import * as xrpl from 'xrpl';
import { Subject, from } from 'rxjs';
import { debounceTime, exhaustMap } from 'rxjs/operators';
import { UtilsService } from '../../utils/util-service/utils.service';
import { Wallet, WalletManagerService } from '../manager/wallet-manager.service';
import { AppConstants } from '../../../core/app.constants';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';

interface RefreshPayload {
     client: xrpl.Client;
     wallets: Wallet[];
     selectedWalletIndex: number;
     addressesToRefresh?: string[];
     onUpdate?: (updatedWallets: Wallet[], newCurrentWallet: Wallet) => void;
     resolve: () => void;
}

@Injectable({
     providedIn: 'root',
})
export class WalletDataService extends PerformanceBaseComponent {
     private cachedReserves: any = null;
     private readonly REFRESH_THRESHOLD_MS = 3000;
     private readonly refreshRequests$ = new Subject<RefreshPayload>();
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly utilsService = inject(UtilsService);
     public readonly ngZone = inject(NgZone);
     public readonly txUiService = inject(TransactionUiService);
     public readonly toastService = inject(ToastService);

     constructor() {
          super();
          // Debounced + non-overlapping refresh pipeline
          this.refreshRequests$
               .pipe(
                    debounceTime(250),
                    exhaustMap(payload => from(this.performRefreshWallets(payload.client, payload.wallets, payload.selectedWalletIndex, payload.addressesToRefresh, payload.onUpdate, payload.resolve)))
               )
               .subscribe();
     }

     //  This only queues a refresh request.
     async refreshWallets(client: xrpl.Client, addressesToRefresh?: string[], onUpdate?: (updatedWallets: Wallet[], newCurrentWallet: Wallet) => void): Promise<void> {
          return new Promise<void>(resolve => {
               this.refreshRequests$.next({
                    client,
                    wallets: [],
                    selectedWalletIndex: this.walletManagerService.getSelectedIndex() || 0,
                    addressesToRefresh,
                    onUpdate,
                    resolve, // pass resolver forward
               });
          });
     }

     private async performRefreshWallets(client: xrpl.Client, wallets: Wallet[], selectedWalletIndex: number, addressesToRefresh?: string[], onUpdate?: (updatedWallets: Wallet[], newCurrentWallet: Wallet) => void, resolve?: () => void): Promise<void> {
          await this.measure('performRefreshWallets', true, async () => {
               const now = Date.now();

               try {
                    const currentWallets = this.walletManagerService.wallets();
                    console.log('currentWallets: ', currentWallets);
                    const normalize = (w: Wallet) => w.classicAddress ?? w.address;

                    const addressFilter = addressesToRefresh ? new Set(addressesToRefresh) : null;

                    const walletsToUpdate = currentWallets.filter(w => {
                         const address = normalize(w);
                         const needsUpdate = !w.lastUpdated || now - w.lastUpdated > this.REFRESH_THRESHOLD_MS;
                         const inFilter = addressFilter ? addressFilter.has(address) : true;
                         return needsUpdate && inFilter;
                    });

                    if (!walletsToUpdate.length) {
                         console.info('No wallets need update');

                         this.ngZone.run(() => {
                              const currentWallet = currentWallets[selectedWalletIndex];
                              onUpdate?.(currentWallets, currentWallet);
                         });

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

                         currentWallets.forEach((wallet, index) => {
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
                    console.error('Error in performRefreshWallets:', error);
                    this.toastService.error(`${error.message || 'Transaction failed'}`, AppConstants.TOAST.ERROR);
               } finally {
                    resolve?.();
               }
          });
     }
}
