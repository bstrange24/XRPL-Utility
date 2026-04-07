import { computed, inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DidStoreService } from '../../did/did-store/did-store.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';

@Injectable({
     providedIn: 'root',
})
export class SendXrpUtilService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly didStoreService = inject(DidStoreService);

     constructor() {
          super();
     }

     sendButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Send XRP';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     clearInputFields(): void {
          this.txUiService.wantsOptions.set(false);
     }
}
