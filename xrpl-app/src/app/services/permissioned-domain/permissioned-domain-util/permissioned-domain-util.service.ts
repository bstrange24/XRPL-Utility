import { inject, Injectable, signal } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CopyUtilService } from '../../copy-util/copy-util.service';
import { DownloadUtilService } from '../../download-util/download-util.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';

import { SelectItem } from '../../../components/ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { PermissionedDomainStoreService } from '../permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainViewModelService } from '../permissioned-domain-view-model/permissioned-domain-view-model.service';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';

@Injectable({
     providedIn: 'root',
})
export class PermissionedDomainUtilService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly permissionedDomainViewModelService = inject(PermissionedDomainViewModelService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     // in PermissionedDomainStoreService (or wherever you keep form state)
     acceptedCredentials = signal<Array<{ issuer: string; credentialType: string }>>([]);

     constructor() {
          super();
     }

     addCredential(issuer: string, credType: string) {
          this.acceptedCredentials.update(list => [...list, { issuer, credentialType: credType }]);
     }

     removeCredential(index: number) {
          this.acceptedCredentials.update(list => list.filter((_, i) => i !== index));
     }

     resetCredentials() {
          this.acceptedCredentials.set([]);
     }

     onDomainSelected(item: SelectItem | null) {
          const domainId = item?.id || '';
          this.permissionedDomainStoreService.setField('selectedDomainId', domainId);
     }

     onCredentialIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.permissionedDomainStoreService.setField('credentialIdSearchQuery', value);
     }

     setCredentialType(value: string) {
          this.permissionedDomainStoreService.setField('credentialType', value);
     }

     clearFields() {
          this.txUiService.clearAllOptionsAndMessages();
          this.permissionedDomainStoreService.resetDomainFields();
     }

     clearInputFields() {
          if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.permissionedDomainStoreService.resetDomainFields();
     }
}
