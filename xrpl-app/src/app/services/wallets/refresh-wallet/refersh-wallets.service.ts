// wallet-data.service.ts
import { Injectable, NgZone } from '@angular/core';

import * as xrpl from 'xrpl';
import { UtilsService } from '../../util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { Wallet, WalletManagerService } from '../manager/wallet-manager.service';

@Injectable({
     providedIn: 'root',
})
export class WalletDataService {
     private cachedReserves: any = null;

     constructor(private ngZone: NgZone, private utilsService: UtilsService, private xrplService: XrplService, private walletManagerService: WalletManagerService) {}

     async refreshWallets(client: xrpl.Client, wallets: Wallet[], selectedWalletIndex: number, addressesToRefresh?: string[], onUpdate?: (updatedWallets: Wallet[], newCurrentWallet: Wallet) => void): Promise<void> {
          console.log('Entering refreshWallets (service)');
          const REFRESH_THRESHOLD_MS = 3000;
          const now = Date.now();

          try {
               // Filter wallets that need refresh
               const walletsToUpdate = wallets.filter(w => {
                    const needsUpdate = !w.lastUpdated || now - w.lastUpdated > REFRESH_THRESHOLD_MS;
                    const inFilter = addressesToRefresh ? addressesToRefresh.includes(w.classicAddress ?? w.address) : true;
                    return needsUpdate && inFilter;
               });

               if (walletsToUpdate.length === 0) {
                    console.debug('No wallets need updating.');
                    return;
               }

               console.debug(`Refreshing ${walletsToUpdate.length} wallet(s)...`);

               // Fetch account info in parallel
               let accountInfos: any;
               try {
                    accountInfos = await Promise.all(walletsToUpdate.map(w => this.xrplService.getAccountInfo(client, w.classicAddress ?? w.address, 'validated', '')));
               } catch (error: any) {
                    throw new Error(error.message);
               }

               // Cache reserves once
               if (!this.cachedReserves) {
                    this.cachedReserves = await this.utilsService.getXrplReserve(client);
               }

               // Heavy computation outside Angular zone
               const updatedWallets = await this.ngZone.runOutsideAngular(() =>
                    Promise.all(
                         walletsToUpdate.map(async (wallet, i) => {
                              try {
                                   const accountInfo = accountInfos[i];
                                   const address = wallet.classicAddress ?? wallet.address;
                                   const balanceInDrops = String(accountInfo.result.account_data.Balance);
                                   const balanceXrp = xrpl.dropsToXrp(balanceInDrops);

                                   const { ownerCount, totalXrpReserves } = await this.utilsService.updateOwnerCountAndReserves(client, accountInfo, address);

                                   const spendable = parseFloat(String(balanceXrp)) - parseFloat(String(totalXrpReserves || '0'));

                                   return {
                                        ...wallet,
                                        ownerCount,
                                        xrpReserves: totalXrpReserves,
                                        balance: spendable.toFixed(6),
                                        spendableXrp: spendable.toFixed(6),
                                        lastUpdated: now,
                                   };
                              } catch (err) {
                                   console.error(`Error updating wallet ${wallet.address}:`, err);
                                   return wallet;
                              }
                         })
                    )
               );

               // Apply updates inside Angular zone
               this.ngZone.run(() => {
                    updatedWallets.forEach(updated => {
                         const idx = wallets.findIndex(w => (w.classicAddress ?? w.address) === (updated.classicAddress ?? updated.address));
                         if (idx !== -1) {
                              this.walletManagerService.updateWallet(idx, updated);
                         }
                    });

                    // Update current wallet if it's in the list
                    const currentWallet = wallets[selectedWalletIndex];
                    if (currentWallet) {
                         const updatedCurrent = updatedWallets.find(w => (w.classicAddress ?? w.address) === (currentWallet.classicAddress ?? currentWallet.address));
                         const newCurrentWallet = updatedCurrent || currentWallet;
                         onUpdate?.(wallets, { ...newCurrentWallet });
                    }
               });
          } catch (error: any) {
               console.error('Error in refreshWallets:', error);
               throw new Error(error.message);
          }
     }
}
