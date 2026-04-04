import { computed, inject, Injectable, signal } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { AmmStoreService } from '../amm-store/amm-store.service';
import { PoolOptions } from '../../../components/amm/constants/amm.types';
import { AmmTransactionViewModelService } from '../amm-transaction-view-model/amm-transaction-view-model.service';

@Injectable({
     providedIn: 'root',
})
export class AmmUtilsService {
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplService = inject(XrplService);
     public readonly utilsService = inject(UtilsService);
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
               case 'withdrawlTokenFromAMM':
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
               case 'withdrawlTokenFromAMM':
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
