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

export type DidTxType = 'setDid' | 'deleteDid';
type DidConfigTxDisplayType = 'set' | 'delete';
type IconType = 'ng-icon' | 'lucide-icon';

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

     constructor() {
          super();
     }

     readonly setDidKeySpecificKeys = [] as const;
     readonly deleteSpecificKeys = ['credentialID', 'credentialIssuer'] as const;

     readonly tabs: {
          key: DidConfigTxDisplayType;
          label: string;
          icon: string;
          iconType: IconType;
          color: string;
          iconSize: string;
     }[] = [
          {
               key: 'set',
               label: 'Set',
               icon: 'heroPlusCircle',
               iconType: 'ng-icon',
               color: '',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'delete',
               label: 'Delete',
               icon: 'heroTrash',
               iconType: 'ng-icon',
               color: '',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
     ];

     readonly tabMeta = {
          set: {
               icon: 'heroPlusCircle',
               colorClass: 'blue-button-submenu',
               title: 'Set DID',
               desc: 'Set DID for the selected account.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          delete: {
               icon: 'heroTrash',
               colorClass: 'red-button-submenu',
               title: 'Delete DID',
               desc: 'Delete DID for the selected account.',
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

     readonly setDidButtonLabel = this.buildTxLabel('Set DID');
     readonly deleteDidButtonLabel = this.buildTxLabel('Delete DID');

     getExistingDid(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'DID')
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         DIDDocument: obj.DIDDocument ? JSON.stringify(JSON.parse(Buffer.from(obj.DIDDocument, 'hex').toString('utf8')), null, 2) : 'N/A',
                         Data: obj.Data ? JSON.stringify(JSON.parse(Buffer.from(obj.Data, 'hex').toString('utf8')), null, 2) : 'N/A',
                         URI: obj.URI ? JSON.stringify(JSON.parse(Buffer.from(obj.URI, 'hex').toString('utf8')), null, 2) : 'N/A',
                    };
               })
               .sort((a, b) => a.index.localeCompare(b.index));
          this.txUiService.existingDid.set(mapped);
          this.utilsService.logObjects('existingDid', mapped);
     }

     didDataByteLength = computed(() => {
          const meta = this.txUiService.didData().trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
               console.log('DID JSON -> Hex length:', hex.length, '→ Bytes:', hex.length / 2);
               return hex.length / 2;
          } catch (e) {
               console.error('Failed to convert DID JSON to hex:', e);
               return 0;
          }
     });

     uriDataByteLength = computed(() => {
          const meta = this.txUiService.uriData().trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
               console.log('URI JSON -> Hex length:', hex.length, '→ Bytes:', hex.length / 2);
               return hex.length / 2;
          } catch (e) {
               console.error('Failed to convert URI JSON to hex:', e);
               return 0;
          }
     });

     didDocumentDataByteLength = computed(() => {
          const meta = this.txUiService.didDocumentData().trim();
          if (!meta) return 0;

          try {
               const hex = xrpl.convertStringToHex(meta);
               console.log('DID Document JSON -> Hex length:', hex.length, '→ Bytes:', hex.length / 2);
               return hex.length / 2;
          } catch (e) {
               console.error('Failed to convert DID Document JSON to hex:', e);
               return 0;
          }
     });

     didDataIsValid = computed(() => {
          return this.didDataByteLength() <= 256;
     });

     uriDataIsValid = computed(() => {
          return this.uriDataByteLength() <= 256;
     });

     didDocumentDataIsValid = computed(() => {
          return this.didDocumentDataByteLength() <= 256;
     });

     onDidDataChange(newValue: string) {
          this.txUiService.didData.set(newValue);
          this.txUiService.didDetails.update(d => ({ ...d, data: newValue }));
     }

     onUriDataChange(newValue: string) {
          this.txUiService.uriData.set(newValue);
          this.txUiService.didDetails.update(d => ({ ...d, uri: newValue }));
     }

     onDidDocumentDataChange(newValue: string) {
          this.txUiService.didDocumentData.set(newValue);
          this.txUiService.didDetails.update(d => ({ ...d, document: newValue }));
     }

     buildSuccessMessage(type: DidTxType, formValues: any, extra: any): string {
               if (type === 'setDid') {
                    return `Successfully Set DID`;
               }
               return `Successfully Deleted DID`;
          }
     
          handleSimulationSuccess(type: DidTxType, formValues: any, hash?: string, extra?: any) {
               let msg: string;
     
               if (type === 'setDid') {
                    msg = `Simulated Setting DID`;
               } else {
                    msg = `Simulated Deleting DID`;
               }
     
               this.txUiService.resetCurrentStepToIdle();
               this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');
     
               return { success: true, hash };
          }
}
