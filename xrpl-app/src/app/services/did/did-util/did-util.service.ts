import { computed, inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { UtilsService } from '../../utils/util-service/utils.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { DidStoreService } from '../did-store/did-store.service';

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
          this.didStoreService.setField('existingDid', mapped);
          this.utilsService.logObjects('existingDid', mapped);
     }

     onDidDataChange(newValue: string) {
          this.didStoreService.setField('didData', newValue);
     }

     onUriDataChange(newValue: string) {
          this.didStoreService.setField('uriData', newValue);
     }

     onDidDocumentDataChange(newValue: string) {
          this.didStoreService.setField('didDocumentData', newValue);
     }

     clearJsonField(field: 'document' | 'uri' | 'data') {
          if (field === 'document') this.didStoreService.setField('didDocumentData', '');
          if (field === 'uri') this.didStoreService.setField('uriData', '');
          if (field === 'data') this.didStoreService.setField('didData', '');
     }

     populateDidDefaultData() {
          this.didStoreService.setField(
               'didData',
               `{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:xrpl:test:rJNo2iPnuDmXqqw31cobafG37k1GaMZ3Vc",
  "authentication": [
    "did:xrpl:test:rJNo2iPnuDmXqqw31cobafG37k1GaMZ3Vc#keys-1"
  ]
}`
          );
          this.didStoreService.setField('uriData', `{"ipfs":"//bafybeiexamplehash"}`);
          this.didStoreService.setField('didDocumentData', `{"did:example":"123#public-key-0"}`);
     }

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for ledger validation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly setDidButtonLabel = this.buildTxLabel('Set DID');
     readonly deleteDidButtonLabel = this.buildTxLabel('Delete DID');
}
