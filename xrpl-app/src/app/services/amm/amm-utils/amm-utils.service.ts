import { computed, inject, Injectable, signal } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { AmmStoreService } from '../amm-store/amm-store.service';
import { PoolOptions } from '../../../components/amm/constants/amm.types';
import { AmmTransactionViewModelService } from '../amm-transaction-view-model/amm-transaction-view-model.service';
import * as xrpl from 'xrpl';
import { LogServiceService } from '../../shared/log-service/log-service.service';

@Injectable({
     providedIn: 'root',
})
export class AmmUtilsService {
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplService = inject(XrplService);
     public readonly utilsService = inject(UtilsService);
     public readonly logService = inject(LogServiceService);
     public readonly ammTransactionViewModelService = inject(AmmTransactionViewModelService);

     readonly depositOptions = signal<PoolOptions>({
          bothPools: true,
          firstPoolOnly: false,
          secondPoolOnly: false,
     });

     readonly withdrawOptions = signal<PoolOptions>({
          bothPools: true,
          firstPoolOnly: false,
          secondPoolOnly: false,
     });

     readonly actionButtonLabel = computed(() => {
          const tab = this.ammTransactionViewModelService.activeTab();
          switch (tab) {
               case 'createAMM':
                    return 'Create AMM';
               case 'depositToAMM':
                    return 'Deposit Tokens to AMM';
               case 'withdrawalFromAMM':
                    return 'Withdraw Token from AMM';
               case 'clawbackFromAMM':
                    return 'Clawback Token from AMM';
               case 'swapViaAMM':
                    return 'Swap Token via AMM';
               case 'deleteAMM':
                    return 'Delete AMM';
               default:
                    return 'Submit';
          }
     });

     readonly actionButtonClass = computed(() => {
          const tab = this.ammTransactionViewModelService.activeTab();
          switch (tab) {
               case 'createAMM':
                    return 'btn-primary-blue';
               case 'depositToAMM':
               case 'withdrawalFromAMM':
               case 'swapViaAMM':
                    return 'btn-primary-green';
               case 'clawbackFromAMM':
               case 'deleteAMM':
                    return 'btn-primary-red';
               default:
                    return 'btn-primary-blue';
          }
     });

     selectDepositOption(key: keyof PoolOptions): void {
          this.depositOptions.set({
               bothPools: key === 'bothPools',
               firstPoolOnly: key === 'firstPoolOnly',
               secondPoolOnly: key === 'secondPoolOnly',
          });
     }

     selectWithdrawOption(key: keyof PoolOptions): void {
          this.withdrawOptions.set({
               bothPools: key === 'bothPools',
               firstPoolOnly: key === 'firstPoolOnly',
               secondPoolOnly: key === 'secondPoolOnly',
          });
     }

     async checkAmmParticipation(displayChanges: boolean = false, ammResponse?: any) {
          let result: { isAmmPool: boolean; isLiquidityProvider: boolean; ammInfo?: any; lpTokens: { issuer: string; currency: string; balance: string }[] } = {
               isAmmPool: false,
               isLiquidityProvider: false,
               ammInfo: undefined,
               lpTokens: [], // always an array
          };

          try {
               if (ammResponse.result && ammResponse.result.amm) {
                    this.logService.logObjects('checkAmmParticipation', ammResponse.result.amm);
                    result.isAmmPool = true;
                    result.ammInfo = ammResponse.result.amm;
                    result.lpTokens.push({
                         issuer: ammResponse.result.amm.account,
                         currency: ammResponse.result.amm.lp_token.currency, // Assuming LPTokenCurrency is part of the response
                         balance: ammResponse.result.amm.lp_token.value, // Balance not directly available here
                    });
                    if (displayChanges) {
                         this.ammStoreService.setField('lpTokenBalance', ammResponse.result.amm.lp_token.value);
                         const toDisplay = (amt: any): string => {
                              const val = typeof amt === 'string' ? xrpl.dropsToXrp(amt) : amt.value;
                              return this.utilsService.formatTokenBalance(val, 18);
                         };
                         this.ammStoreService.setField('assetPool1Balance', toDisplay(result.ammInfo.amount));
                         this.ammStoreService.setField('assetPool2Balance', toDisplay(result.ammInfo.amount2));
                    }
               } else {
                    if (displayChanges) {
                         this.ammStoreService.setField('lpTokenBalance', '0');
                         this.ammStoreService.setField('assetPool1Balance', '0');
                         this.ammStoreService.setField('assetPool2Balance', '0');
                    }
               }
          } catch (e) {
               // Not an AMM, ignore
               console.warn('Not an AMM account:', e);
          }
          return result;
     }

     clearInputFields(): void {
          this.ammStoreService.setField('weWantAmount', '');
          this.ammStoreService.setField('weSpendAmount', '');
          this.ammStoreService.setField('tradingFeeField', '0.1');
          this.ammStoreService.setField('holderField', '');
          this.ammStoreService.setField('withdrawlLpTokenFromPoolField', '');
          this.depositOptions.set({ bothPools: true, firstPoolOnly: false, secondPoolOnly: false });
          this.withdrawOptions.set({ bothPools: true, firstPoolOnly: false, secondPoolOnly: false });
     }
}
