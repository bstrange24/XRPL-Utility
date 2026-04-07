import { inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';

export type AccountDeleteTxType = 'deleteAccount';

@Injectable({
     providedIn: 'root',
})
export class AccountDeleteUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly toastService = inject(ToastService);
     constructor() {
          super();
     }

     readonly deleteAccountSpecificKeys = ['destinationTagField'] as const;

     stripHtml(text: string): string {
          return text.replaceAll(/<\/?[^>]+(>|$)/g, '');
     }
}
