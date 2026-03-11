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

     readonly createCredentialKeySpecificKeys = [] as const;
     readonly deleteCredentialKeySpecificKeys = ['credentialID', 'credentialIssuer'] as const;
     readonly acceptCredentialKeySpecificKeys = ['credentialType', 'credentialIssuer'] as const;
     private readonly decodeCache = new Map<string, string>();

     readonly txTypeMap = {
          create: 'CredentialCreate',
          accept: 'CredentialAccept',
          delete: 'CredentialDelete',
          verify: 'CredentialVerify',
     } as const;

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

     readonly issuedByMe = computed(() => this.txUiService.existingCredentials());
     readonly issuedToMe = computed(() => this.txUiService.subjectCredentials());
     readonly pendingIssued = computed(() => this.issuedByMe().filter(c => !this.isCredentialAccepted(c)));
     readonly acceptedIssued = computed(() => this.issuedByMe().filter(c => this.isCredentialAccepted(c)));
     readonly pendingToAccept = computed(() => this.issuedToMe().filter(c => !this.isCredentialAccepted(c)));
     readonly acceptedByMe = computed(() => this.issuedToMe().filter(c => this.isCredentialAccepted(c)));

     // Filtered credentials — derived state, fully reactive
     filteredExisting = computed(() => this.filterCredentials(this.txUiService.existingCredentials(), this.txUiService.credentialIdSearchTerm()));
     filteredSubject = computed(() => this.filterCredentials(this.txUiService.subjectCredentials(), this.txUiService.credentialIdSearchTerm()));
     selectedCredentialIndex = computed(() => this.txUiService.credentialID());

     actionButtonLabel(tab: 'create' | 'accept' | 'delete' | 'verify') {
          switch (tab) {
               case 'create':
                    return this.createCredentialButtonLabel();
               case 'accept':
                    return this.acceptCredentialsButtonLabel();
               case 'delete':
                    return this.deleteCredentialsButtonLabel();
               case 'verify':
                    return this.verifyCredentialLabel();
          }
     }

     actionButtonClass(tab: 'create' | 'accept' | 'delete' | 'verify') {
          switch (tab) {
               case 'create':
                    return 'btn-primary-blue';
               case 'accept':
                    return 'btn-primary-green';
               case 'delete':
                    return 'btn-primary-red';
               case 'verify':
                    return 'btn-primary-orange';
          }
     }

     selectCredentialFromList(cred: CredentialItem, tab: string, walletAddress: string) {
          this.txUiService.selectedCredentials.set(cred);

          const isVerifyTab = tab === 'verify';
          const isSubject = cred.Subject === walletAddress;

          if (!isVerifyTab || !isSubject) {
               this.txUiService.credentialID.set(cred.index);
               this.txUiService.credentialType.set(cred.CredentialType || '');
               this.txUiService.credentialIssuer.set(cred.Issuer);
          } else {
               this.txUiService.credentialID.set('');
               this.txUiService.credentialType.set('');
               this.txUiService.credentialIssuer.set('');
          }
     }

     readonly credentialStats = computed(() => {
          const issuedByMe = this.issuedByMe();
          const issuedToMe = this.issuedToMe();

          const pendingIssued = this.pendingIssued();
          const acceptedIssued = this.acceptedIssued();

          const pendingToAccept = this.pendingToAccept();
          const acceptedByMe = this.acceptedByMe();

          return {
               issuedByMe,
               issuedToMe,
               pendingIssued,
               acceptedIssued,
               pendingToAccept,
               acceptedByMe,

               counts: {
                    issued: issuedByMe.length,
                    received: issuedToMe.length,
                    pendingIssued: pendingIssued.length,
                    acceptedIssued: acceptedIssued.length,
                    pendingToAccept: pendingToAccept.length,
                    acceptedByMe: acceptedByMe.length,
               },
          };
     });

     credentialsToShow(tab: 'create' | 'accept' | 'delete' | 'verify') {
          const s = this.credentialStats();

          switch (tab) {
               case 'create':
                    return [...s.pendingIssued, ...s.acceptedIssued];

               case 'accept':
                    return s.pendingToAccept.length ? s.pendingToAccept : s.acceptedByMe;

               case 'delete':
                    return s.issuedByMe;

               case 'verify':
                    return [...s.pendingToAccept, ...s.acceptedByMe, ...s.pendingIssued, ...s.acceptedIssued];
          }
     }

     summaryMessage(tab: 'create' | 'accept' | 'delete' | 'verify') {
          const s = this.credentialStats();

          switch (tab) {
               case 'create':
                    if (s.counts.issued === 0) return 'has not issued any credentials yet.';

                    return `has issued <strong>${s.counts.issued}</strong> credential${s.counts.issued === 1 ? '' : 's'}.`;

               case 'accept':
                    if (s.counts.pendingToAccept === 0) return 'has no pending credentials to accept.';

                    return `has <strong>${s.counts.pendingToAccept}</strong> credential${s.counts.pendingToAccept === 1 ? '' : 's'} pending acceptance.`;

               case 'delete':
                    if (s.counts.issued === 0) return 'has no credentials to delete.';

                    return `has <strong>${s.counts.issued}</strong> issued credential${s.counts.issued === 1 ? '' : 's'} that can be deleted.`;

               case 'verify': {
                    const total = s.counts.issued + s.counts.received;

                    if (total === 0) return 'is not involved in any credentials.';

                    return `is involved in <strong>${total}</strong> credential${total === 1 ? '' : 's'} — Received: ${s.counts.received} • Issued: ${s.counts.issued}`;
               }
          }
     }

     credentialItems(tab: 'create' | 'accept' | 'delete' | 'verify', walletAddress: string) {
          let list = tab === 'accept' ? this.txUiService.subjectCredentials() : this.txUiService.existingCredentials();

          if (tab === 'verify') {
               list = list.filter(c => c.Issuer === walletAddress);
          }

          return list.map(cred => ({
               id: cred.index,
               display: cred.CredentialType || 'Unknown Type',
               secondary: `${cred.index.slice(0, 12)}...${cred.index.slice(-10)}`,
               pending: !this.isCredentialAccepted(cred) && tab === 'accept',
          }));
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
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter(o => o.LedgerEntryType === 'Credential' && o.Issuer === address)
               .map(o => this.mapCredential(o))
               .sort((a, b) => {
                    // Check if Expiration is 'N/A' or has a value
                    const aHasExpiration = a.Expiration && a.Expiration !== 'N/A';
                    const bHasExpiration = b.Expiration && b.Expiration !== 'N/A';

                    // If one has expiration and the other doesn't, put the one with expiration first
                    if (aHasExpiration && !bHasExpiration) return -1;
                    if (!aHasExpiration && bHasExpiration) return 1;

                    // If both have expiration or both don't have expiration, sort by index
                    // Convert index to number for numeric sorting (assuming index is numeric or can be converted)
                    const aIndex = typeof a.index === 'number' ? a.index : Number.parseInt(a.index, 10) || 0;
                    const bIndex = typeof b.index === 'number' ? b.index : Number.parseInt(b.index, 10) || 0;

                    return aIndex - bIndex;
               });

          this.utilsService.logObjects('parseIssuedCredentials', mapped);
          return mapped;
     }

     parseSubjectCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string) {
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter(o => o.LedgerEntryType === 'Credential' && o.Subject === address)
               .map(o => this.mapCredential(o))
               .sort((a, b) => {
                    // Check if Expiration is 'N/A' or has a value
                    const aHasExpiration = a.Expiration && a.Expiration !== 'N/A';
                    const bHasExpiration = b.Expiration && b.Expiration !== 'N/A';

                    // Items with expiration come first
                    if (aHasExpiration && !bHasExpiration) return -1;
                    if (!aHasExpiration && bHasExpiration) return 1;

                    // If both have expiration, compare them as dates/timestamps
                    if (aHasExpiration && bHasExpiration) {
                         // Parse as numbers if they're timestamps
                         const aExp = Number.parseInt(a.Expiration!, 10) || 0;
                         const bExp = Number.parseInt(b.Expiration!, 10) || 0;
                         return aExp - bExp; // Earlier expiration first
                    }

                    // If neither has expiration, sort by index
                    const aIndex = typeof a.index === 'number' ? a.index : Number.parseInt(a.index, 10) || 0;
                    const bIndex = typeof b.index === 'number' ? b.index : Number.parseInt(b.index, 10) || 0;

                    return aIndex - bIndex;
               });

          this.utilsService.logObjects('parseSubjectCredentials', mapped);
          return mapped;
     }

     applySelectedCredential(cred: CredentialItem | null) {
          if (!cred) {
               this.txUiService.credentialID.set('');
               this.txUiService.credentialType.set('');
               this.txUiService.credentialIssuer.set('');
               this.txUiService.selectedCredentials.set(null);
               return;
          }

          this.txUiService.selectedCredentials.set(cred);
          this.txUiService.credentialID.set(cred.index);
          this.txUiService.credentialIssuer.set(cred.Issuer);
          this.txUiService.credentialType.set(cred.CredentialType || '');
     }

     filterCredentials(list: CredentialItem[], term: string): CredentialItem[] {
          if (!term) return list;
          const lower = term.toLowerCase();
          return list.filter(c => [c.CredentialType, c.Issuer, c.Subject, c.index].some(f => f?.toLowerCase().includes(lower)));
     }

     private formatDateTimeLocal(date: Date): string {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const secs = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${secs}`;
     }

     addCredentialToExpiration(seconds: number): void {
          // Get current value (or use now if empty)
          let currentDateStr = this.txUiService.credential().subject.expirationDate;
          if (!currentDateStr) {
               currentDateStr = this.formatDateTimeLocal(new Date());
          }

          const date = new Date(currentDateStr);
          date.setSeconds(date.getSeconds() + seconds);

          const newDateTime = this.formatDateTimeLocal(date);

          // Update nested signal immutably
          this.txUiService.credential.update(cred => ({
               ...cred,
               subject: {
                    ...cred.subject,
                    expirationDate: newDateTime,
               },
          }));
     }

     setCredentialExpirationToNow(): void {
          const now = new Date();
          const formatted = this.formatDateTimeLocal(now);

          this.txUiService.credential.update(cred => ({
               ...cred,
               subject: {
                    ...cred.subject,
                    expirationDate: formatted,
               },
          }));
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
