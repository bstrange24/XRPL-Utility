import { computed, inject, Injectable, signal } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CopyUtilService } from '../../copy-util/copy-util.service';
import { DownloadUtilService } from '../../download-util/download-util.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import * as xrpl from 'xrpl';
import { SelectItem } from '../../../components/ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { PermissionDomainTxType } from '../permissioned-domain-orchestrator/permissioned-domain-orchestrator.service';
import { AppConstants } from '../../../core/app.constants';

export type PermissionedDomainTxType = 'setPermissionedDomain' | 'deletePermissionedDomain';
type PermissionedDomainConfigTxDisplayType = 'set' | 'delete';
type IconType = 'ng-icon' | 'lucide-icon';

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

     createdDomains = signal<boolean>(false);
     createdPermissionedDomains = signal<any[]>([]);
     selectedDomainId = signal<string | null>(null);

     constructor() {
          super();
     }

     readonly setPermissionDomainKeySpecificKeys = ['subject', 'credentialType'] as const;
     readonly deletePermissionDomainSpecificKeys = ['domainId'] as const;

     readonly tabs: {
          key: PermissionedDomainConfigTxDisplayType;
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
               title: 'Set Permissioned Domain',
               desc: 'Set Permissioned Domain for the selected account.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          delete: {
               icon: 'heroTrash',
               colorClass: 'red-button-submenu',
               title: 'Delete Permissioned Domain',
               desc: 'Delete Permissioned Domain for the selected account.',
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

     readonly setPermissionedDomainButtonLabel = this.buildTxLabel('Set Permissioned Domain');
     readonly deletePermissionedDomainButtonLabel = this.buildTxLabel('Delete Permissioned Domain');

     actionButtonLabel(tab: 'set' | 'delete') {
          switch (tab) {
               case 'set':
                    return this.setPermissionedDomainButtonLabel();
               case 'delete':
                    return this.deletePermissionedDomainButtonLabel();
          }
     }

     actionButtonClass(tab: 'set' | 'delete') {
          switch (tab) {
               case 'set':
                    return 'btn-primary-blue';
               case 'delete':
                    return 'btn-primary-red';
          }
     }

     resetDomainDropDown() {
          this.selectedDomainId.set(null);
          this.txUiService.domainId.set('');
     }

     selectedDomainItem = computed(() => {
          const id = this.selectedDomainId();
          if (!id) return null;
          return this.domainItems().find(i => i.id === id) || null;
     });

     onDomainSelected(item: SelectItem | null) {
          const domainId = item?.id || '';
          this.selectedDomainId.set(domainId);
          this.txUiService.domainId.set(domainId); // auto-fill the field
     }

     getCreatedPermissionedDomains(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'PermissionedDomain' && obj.Owner === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         AcceptedCredentials: obj.AcceptedCredentials
                              ? JSON.stringify(
                                     obj.AcceptedCredentials.map(
                                          (item: {
                                               Credential: {
                                                    CredentialType: any;
                                                    Issuer?: string; // Assuming Issuer exists in the original data
                                               };
                                          }) => ({
                                               ...item,
                                               Credential: {
                                                    ...item.Credential,
                                                    CredentialType: Buffer.from(item.Credential.CredentialType, 'hex').toString('utf8'),
                                                    Issuer: item.Credential.Issuer, // Adjust based on actual structure
                                               },
                                          })
                                     ),
                                     null,
                                     '\t'
                                )
                              : 'N/A',
                         Owner: obj.Owner,
                         Sequence: obj.Sequence,
                    };
               })
               .sort((a, b) => a.index.localeCompare(b.index));
          this.createdPermissionedDomains.set(mapped);
          this.utilsService.logObjects('createdPermissionedDomains', this.createdPermissionedDomains());
     }

     domainItems = computed(() => {
          return this.createdPermissionedDomains().map(domain => ({
               id: domain.index,
               display: domain.index.slice(0, 10) + '...' + domain.index.slice(-8),
               secondary: domain.AcceptedCredentials ? `Credentials: ${domain.AcceptedCredentials.length}` : 'No credentials',
               // secondary: domain.index,
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     buildSuccessMessage(type: PermissionDomainTxType): string {
          if (type === 'set') {
               return `Successfully Set Permission Domain`;
          }
          return `Successfully Deleted Permission Domain`;
     }

     handleSimulationSuccess(type: PermissionDomainTxType, hash?: string) {
          let msg: string;

          if (type === 'set') {
               msg = `Simulated Setting Permission Domain`;
          } else {
               msg = `Simulated Deleting Permission Domain`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }

     clearFields() {
          this.txUiService.clearAllOptions();
          this.txUiService.clearOptionalInputFields();
          this.txUiService.clearAllOptionsAndMessages();
          this.resetCredentialIdDropDown();
     }

     clearInputFields() {
          if (this.txUiService.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.txUiService.credentialType.set('');
          this.txUiService.domainId.set('');
          this.selectedDomainId.set(null);
     }

     resetCredentialIdDropDown() {
          this.txUiService.credentialType.set('');
          this.txUiService.domainId.set('');
          this.selectedDomainId.set(null);
     }
}
