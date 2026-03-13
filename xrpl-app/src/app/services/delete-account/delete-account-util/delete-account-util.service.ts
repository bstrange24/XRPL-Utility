import { inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AccountDeleteTxType } from '../../../components/delete-account/constants/delete-account.constants';
import { AppConstants } from '../../../core/app.constants';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../toast/toast.service';

export type DeleteAccountTxType = 'deleteAccount';

@Injectable({
     providedIn: 'root',
})
export class DeleteAccountUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly toastService = inject(ToastService);
     constructor() {
          super();
     }

     readonly deleteAccountSpecificKeys = ['destinationTagField'] as const;

     stripHtml(text: string): string {
          return text.replaceAll(/<\/?[^>]+(>|$)/g, '');
     }

     buildSuccessMessage(type: AccountDeleteTxType, t?: any, d?: any): string {
          return `Successfully Deleted Account`;
     }

     handleSimulationSuccess(type: AccountDeleteTxType, hash?: any, h?: any, t?: any, d?: any) {
          let msg = `Successfully simulated Deleting Account`;

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
