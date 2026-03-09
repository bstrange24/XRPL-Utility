import { computed, inject, Injectable } from '@angular/core';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';

export type DeleteAccountTxType = 'deleteAccount';

@Injectable({
     providedIn: 'root',
})
export class DeleteAccountUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);

     constructor() {
          super();
     }

     readonly deleteAccountSpecificKeys = ['destinationTagField'] as const;

     readonly tabMeta = {
          deleteAccount: {
               icon: 'heroTrash',
               colorClass: 'red-button-submenu',
               title: 'Delete Wallet',
               desc: 'Delete currenlty selected wallet.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
     };

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for confirmation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly deleteWalletButtonLabel = this.buildTxLabel('Delete Wallet');

     stripHtml(text: string): string {
          return text.replaceAll(/<\/?[^>]+(>|$)/g, '');
     }
}
