import { computed, inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DidStoreService } from '../../did/did-store/did-store.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { PermissionedDomainStoreService } from '../../permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';

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
     public readonly didStoreService = inject(DidStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);

     constructor() {
          super();
     }

     sendButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle' || step === 'waiting_validation') return 'Send XRP';
          return this.txUiService.stepMessage();
     });

     clearInputFields(): void {
          // if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.xrplTxOptionsStore.setField('isSimulateEnabled', false);
          this.txUiService.disableAdditionalFields();
          this.xrplTxOptionsStore.setField('destinationTag', '');
          this.xrplTxOptionsStore.setField('sourceTag', '');
          this.xrplTxOptionsStore.setField('invoiceId', '');
          this.permissionedDomainStoreService.setField('domainId', '');
          this.accountConfiguratorStoreService.setField('amount', '');
     }
}
