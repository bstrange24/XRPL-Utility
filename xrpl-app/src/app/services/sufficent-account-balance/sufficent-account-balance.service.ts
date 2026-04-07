import { inject, Injectable } from '@angular/core';
import { AppConstants } from '../../core/app.constants';
import { UtilsService } from '../utils/util-service/utils.service';

@Injectable({
     providedIn: 'root',
})
export class SufficentAccountBalanceService {
     private readonly utilsService = inject(UtilsService);

     async checkXrpBalance(env: any, tx: any, amount: string) {
          if (this.utilsService.isInsufficientXrpBalance1(env.serverInfo, env.accountInfo, amount, env.wallet.classicAddress, tx, env.fee)) {
               return { success: false, error: AppConstants.INSUFFICIENT_XRP_BALANCE };
          }
          return { success: true, error: '' };
     }

     async checkTokenBalance(env: any) {
          if (this.utilsService.isInsufficientIouTrustlineBalance(env.accountLines, env.tx, env.destination)) {
               return { success: false, error: AppConstants.INSUFFICIENT_XRP_BALANCE };
          }
          return { success: true, error: '' };
     }
}
