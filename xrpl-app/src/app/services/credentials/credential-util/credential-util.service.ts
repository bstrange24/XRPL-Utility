import { computed, inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { CredentialItem } from '../../../models/interface-items.model';
import * as xrpl from 'xrpl';

export type CredentialTxType = 'createCredential' | 'deleteCredentials' | 'acceptCredentials';
type CredentialConfigTxDisplayType = 'create' | 'accept' | 'verify' | 'delete';
type IconType = 'ng-icon' | 'lucide-icon';

@Injectable({
     providedIn: 'root',
})
export class CredentialUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);

     constructor() {
          super();
     }

     private readonly decodeCache = new Map<string, string>();

     readonly tabs: {
          key: CredentialConfigTxDisplayType;
          label: string;
          icon: string;
          iconType: IconType;
          color: string;
          iconSize: string;
     }[] = [
          {
               key: 'create',
               label: 'Create',
               icon: 'heroPlusCircle',
               iconType: 'ng-icon',
               color: '',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'accept',
               label: 'Accept',
               icon: 'copy-plus',
               iconType: 'lucide-icon',
               color: '',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'verify',
               label: 'Verify',
               icon: 'shield-ellipsis',
               iconType: 'lucide-icon',
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
          create: {
               icon: 'heroPlusCircle',
               colorClass: 'blue-button-submenu',
               title: 'Create Credentials',
               desc: 'Create Credentials to another XRPL address.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          accept: {
               icon: 'heroArrowPath',
               colorClass: 'green-button-submenu',
               title: 'Accept Credentials',
               desc: 'Accept Credentials from another XRPL address.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          verify: {
               icon: 'shield-ellipsis',
               colorClass: 'orange-button-submenu',
               title: 'Verify Credentials',
               desc: 'Verify Credentials have been accepted by another XRPL address.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          delete: {
               icon: 'heroTrash',
               colorClass: 'red-button-submenu',
               title: 'Delete Credentials',
               desc: 'Delete Credentials to another XRPL address.',
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

     readonly createCredentialButtonLabel = this.buildTxLabel('Create Credential');
     readonly acceptCredentialsButtonLabel = this.buildTxLabel('Accept Credential');
     readonly deleteCredentialsButtonLabel = this.buildTxLabel('Delete Credential');
     readonly verifyCredentialLabel = this.buildTxLabel('Verify Credential');

     private decodeutf8Hex(hex: string | undefined): string {
          if (!hex) return 'N/A';
          if (this.decodeCache.has(hex)) return this.decodeCache.get(hex)!;

          try {
               const result = Buffer.from(hex, 'hex').toString('utf8') || 'N/A';
               this.decodeCache.set(hex, result);
               return result;
          } catch {
               this.decodeCache.set(hex, 'Invalid Hex');
               return 'Invalid Hex';
          }
     }

     getExistingCredentials(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Credential' && obj.Issuer === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
                         Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
                         Issuer: obj.Issuer,
                         Subject: obj.Subject,
                         URI: this.decodeutf8Hex(obj.URI),
                         Flags: this.utilsService.getCredentialStatus(obj.Flags),
                    };
               })
               .sort((a, b) => a.Expiration.localeCompare(b.Expiration));
          this.utilsService.logObjects('existingCredentials', mapped);
          return mapped;
     }

     getSubjectCredentials(checkObjects: xrpl.AccountObjectsResponse, sender: string) {
          const mapped = (checkObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Credential' && obj.Subject === sender)
               .map((obj: any) => {
                    return {
                         index: obj.index,
                         CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
                         Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
                         Issuer: obj.Issuer,
                         Subject: obj.Subject,
                         URI: this.decodeutf8Hex(obj.URI),
                         Flags: this.utilsService.getCredentialStatus(obj.Flags),
                    };
               })
               .sort((a, b) => a.Expiration.localeCompare(b.Expiration));
          this.utilsService.logObjects('subjectCredentials', mapped);
          return mapped;
     }

     private mapCredential(obj: any): CredentialItem {
          return {
               index: obj.index,
               CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
               Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
               Issuer: obj.Issuer,
               Subject: obj.Subject,
               URI: this.decodeutf8Hex(obj.URI),
               Flags: this.utilsService.getCredentialStatus(obj.Flags),
          };
     }

     parseIssuedCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string) {
          const objs = accountObjects.result.account_objects ?? [];

          return objs
               .filter(o => o.LedgerEntryType === 'Credential' && o.Issuer === address)
               .map(o => this.mapCredential(o))
               .sort((a, b) => (a.Expiration || '').localeCompare(b.Expiration || ''));
     }

     parseSubjectCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string) {
          const objs = accountObjects.result.account_objects ?? [];

          return objs
               .filter(o => o.LedgerEntryType === 'Credential' && o.Subject === address)
               .map(o => this.mapCredential(o))
               .sort((a, b) => (a.Expiration || '').localeCompare(b.Expiration || ''));
     }

     isCredentialAccepted(cred: CredentialItem): boolean {
          // Flags come from XRPL as number, but your utilsService.getCredentialStatus() returns object
          // So we check both possibilities
          if (typeof cred.Flags === 'number') {
               return (cred.Flags & AppConstants.LSF_ACCEPTED) !== 0;
          }
          if (typeof cred.Flags === 'object') {
               return !!cred.Flags.lsfAccepted;
          }
          if (cred.Flags === 'Credential accepted') {
               return true;
          }
          return false;
     }

     buildSuccessMessage(type: CredentialTxType, formValues: any, extra: any): string {
          if (type === 'createCredential') {
               return `Successfully Create Credential`;
          }
          if (type === 'deleteCredentials') {
               return `Successfully Deleted Credential`;
          }
          return `Successfully Accepted Credential`;
     }

     handleSimulationSuccess(type: CredentialTxType, formValues: any, hash?: string, extra?: any) {
          let msg: string;

          if (type === 'createCredential') {
               msg = `Simulated Credential create`;
          } else if (type === 'deleteCredentials') {
               msg = `Simulated Credential delete`;
          } else {
               msg = `Simulated Credential accept`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }
}
