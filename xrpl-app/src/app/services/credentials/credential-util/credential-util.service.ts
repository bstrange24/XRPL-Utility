import { computed, inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { CredentialItem } from '../../../models/interface-items.model';
import * as xrpl from 'xrpl';
import { CredentialStore } from '../credential-store/credential-store.service';
import { XrplDateService } from '../../../core/xrpl-date.service';

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
     public readonly credentialStore = inject(CredentialStore);
     public readonly xrplDateService = inject(XrplDateService);

     constructor() {
          super();
     }

     private readonly decodeCache = new Map<string, string>();

     readonly issuedByMe = computed(() => this.credentialStore.get('existingCredentials'));
     readonly issuedToMe = computed(() => this.credentialStore.get('subjectCredentials'));
     readonly pendingIssued = computed(() => this.issuedByMe().filter((c: CredentialItem) => !this.isCredentialAccepted(c)));
     readonly acceptedIssued = computed(() => this.issuedByMe().filter((c: CredentialItem) => this.isCredentialAccepted(c)));
     readonly pendingToAccept = computed(() => this.issuedToMe().filter((c: CredentialItem) => !this.isCredentialAccepted(c)));
     readonly acceptedByMe = computed(() => this.issuedToMe().filter((c: CredentialItem) => this.isCredentialAccepted(c)));

     filteredExisting = computed(() => this.filterCredentials(this.credentialStore.get('existingCredentials'), this.credentialStore.get('credentialIdSearchTerm')));
     filteredSubject = computed(() => this.filterCredentials(this.credentialStore.get('subjectCredentials'), this.credentialStore.get('credentialIdSearchTerm')));
     selectedCredentialIndex = computed(() => this.credentialStore.get('credentialID'));

     selectCredentialFromList(cred: CredentialItem, tab: string, walletAddress: string) {
          this.credentialStore.set('selectedCredentials', cred);

          const isVerifyTab = tab === 'verify';
          const isSubject = cred.Subject === walletAddress;

          if (!isVerifyTab || !isSubject) {
               this.credentialStore.set('credentialID', cred.index);
               this.credentialStore.set('credentialType', cred.CredentialType || '');
               this.credentialStore.set('credentialIssuer', cred.Issuer);
          } else {
               this.credentialStore.resetCredentialIdDropDown();
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

     credentialItems(tab: 'create' | 'accept' | 'delete' | 'verify', walletAddress: string) {
          let list = tab === 'accept' ? this.credentialStore.get('subjectCredentials') : this.credentialStore.get('existingCredentials');

          if (tab === 'verify') list = list.filter((c: { Issuer: string }) => c.Issuer === walletAddress);

          return list.map((cred: CredentialItem) => ({
               id: cred.index,
               display: cred.CredentialType || 'Unknown Type',
               secondary: `${cred.index.slice(0, 12)}...${cred.index.slice(-10)}`,
               pending: !this.isCredentialAccepted(cred) && tab === 'accept',
          }));
     }

     private parseCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string, role: 'issuer' | 'subject') {
          const objects = accountObjects.result.account_objects ?? [];

          const mapped = objects
               .filter(obj => obj.LedgerEntryType === 'Credential' && (role === 'issuer' ? obj.Issuer === address : obj.Subject === address))
               .map(obj => this.mapCredential(obj))
               .sort(this.sortCredentials);

          this.utilsService.logObjects(`credentials-${role}`, mapped);

          return mapped;
     }

     private sortCredentials(a: any, b: any) {
          const aHasExpiration = a.Expiration && a.Expiration !== 'N/A';
          const bHasExpiration = b.Expiration && b.Expiration !== 'N/A';

          if (aHasExpiration && !bHasExpiration) return -1;
          if (!aHasExpiration && bHasExpiration) return 1;

          if (aHasExpiration && bHasExpiration) {
               const aExp = Number.parseInt(a.Expiration, 10) || 0;
               const bExp = Number.parseInt(b.Expiration, 10) || 0;

               return aExp - bExp;
          }

          const aIndex = typeof a.index === 'number' ? a.index : Number.parseInt(a.index, 10) || 0;
          const bIndex = typeof b.index === 'number' ? b.index : Number.parseInt(b.index, 10) || 0;

          return aIndex - bIndex;
     }

     parseIssuedCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string) {
          return this.parseCredentials(accountObjects, address, 'issuer');
     }

     parseSubjectCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string) {
          return this.parseCredentials(accountObjects, address, 'subject');
     }

     private mapCredential(obj: any): CredentialItem {
          return {
               index: obj.index,
               CredentialType: obj.CredentialType ? this.decodeutf8Hex(obj.CredentialType) : 'Unknown Type',
               Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
               Issuer: obj.Issuer,
               Subject: obj.Subject,
               URI: this.decodeutf8Hex(obj.URI),
               Flags: this.getCredentialStatus(obj.Flags),
          };
     }

     applySelectedCredential(cred: CredentialItem | null) {
          if (!cred) {
               this.credentialStore.resetCredentialIdDropDown();
               return;
          }

          this.credentialStore.set('selectedCredentials', cred);
          this.credentialStore.set('credentialID', cred.index);
          this.credentialStore.set('credentialIssuer', cred.Issuer);
          this.credentialStore.set('credentialType', cred.CredentialType || '');
          this.credentialStore.set('subject', cred.Subject);
     }

     filterCredentials(list: CredentialItem[], term: string): CredentialItem[] {
          if (!term) return list;
          const lower = term.toLowerCase();
          return list.filter(c => [c.CredentialType, c.Issuer, c.Subject, c.index].some(f => f?.toLowerCase().includes(lower)));
     }

     isCredentialAccepted(cred: CredentialItem): boolean {
          // Flags come from XRPL as number, but your utilsService.getCredentialStatus() returns object
          // So we check both possibilities
          if (typeof cred.Flags === 'number') return (cred.Flags & AppConstants.LSF_ACCEPTED) !== 0;
          if (typeof cred.Flags === 'object') return !!cred.Flags.lsfAccepted;
          if (cred.Flags === 'Credential accepted') return true;
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

     getCredentialStatus(flags: number): string {
          return flags === 65536 ? 'Credential accepted' : 'Credential not accepted';
     }

     onCredentialIdInput(event: Event): void {
          const value = (event.target as HTMLInputElement).value;
          this.credentialStore.set('credentialIdSearchQuery', value);
     }

     setCredentialType(value: string) {
          this.credentialStore.set('credentialType', value);
     }

     setCredentialUri(value: string) {
          this.credentialStore.set('uri', value);
     }

     buildSuccessMessage(type: CredentialTxType, formValues: any, extra: any): string {
          if (type === 'createCredential') return `Successfully Create Credential`;
          if (type === 'deleteCredentials') return `Successfully Deleted Credential`;
          return `Successfully Accepted Credential`;
     }

     handleSimulationSuccess(type: CredentialTxType, formValues: any, hash?: string, extra?: any) {
          let msg: string;

          if (type === 'createCredential') msg = `Successfully simulated creating the Credential.`;
          else if (type === 'deleteCredentials') msg = `Successfully simulated deleting the Credential.`;
          else msg = `Successfully simulated accepting the Credential.`;

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }

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

     clearInputFields(): void {
          if (this.txUiService.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.credentialStore.resetCredentailFields();
     }
}
