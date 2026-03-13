import { computed, inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../util-service/utils.service';
import { CopyUtilService } from '../../copy-util/copy-util.service';
import { DownloadUtilService } from '../../download-util/download-util.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';
import { DidStoreService } from '../did-store/did-store.service';
import { DidTxType } from '../../../components/did/constants/did.constants';

@Injectable({
     providedIn: 'root',
})
export class DidUtilService extends PerformanceBaseComponent {
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

     getExistingDid(checkObjects: xrpl.AccountObjectsResponse) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'DID')
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         DIDDocument: obj.DIDDocument ? Buffer.from(obj.DIDDocument, 'hex').toString('utf8') : 'N/A',
                         Data: obj.Data ? Buffer.from(obj.Data, 'hex').toString('utf8') : 'N/A',
                         URI: obj.URI ? Buffer.from(obj.URI, 'hex').toString('utf8') : 'N/A',
                    };
               })
               .sort((a, b) => a.index.localeCompare(b.index));
          this.didStoreService.set('existingDid', mapped);
          this.utilsService.logObjects('existingDid', mapped);
     }

     onDidDataChange(newValue: string) {
          this.didStoreService.set('didData', newValue);
     }

     onUriDataChange(newValue: string) {
          this.didStoreService.set('uriData', newValue);
     }

     onDidDocumentDataChange(newValue: string) {
          this.didStoreService.set('didDocumentData', newValue);
     }

     clearJsonField(field: 'document' | 'uri' | 'data') {
          if (field === 'document') this.didStoreService.set('didDocumentData', '');
          if (field === 'uri') this.didStoreService.set('uriData', '');
          if (field === 'data') this.didStoreService.set('didData', '');
     }

     populateDidDefaultData() {
          this.didStoreService.set(
               'didData',
               `{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:xrpl:test:rJNo2iPnuDmXqqw31cobafG37k1GaMZ3Vc",
  "authentication": [
    "did:xrpl:test:rJNo2iPnuDmXqqw31cobafG37k1GaMZ3Vc#keys-1"
  ]
}`
          );
          this.didStoreService.set('uriData', `{"ipfs":"//bafybeiexamplehash"}`);
          this.didStoreService.set('didDocumentData', `{"did:example":"123#public-key-0"}`);
     }

     buildSuccessMessage(type: DidTxType, formValues: any, extra: any): string {
          if (type === 'setDid') return `Successfully Set DID`;

          return `Successfully Deleted DID`;
     }

     handleSimulationSuccess(type: DidTxType, formValues: any, hash?: string, extra?: any) {
          let msg: string;

          if (type === 'setDid') msg = `Successfully simulated setting the DID`;
          else msg = `Successfully simulated deleting the DID`;

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
     
     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for confirmation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly setDidButtonLabel = this.buildTxLabel('Set DID');
     readonly deleteDidButtonLabel = this.buildTxLabel('Delete DID');
}
