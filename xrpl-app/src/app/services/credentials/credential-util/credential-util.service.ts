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
import { CredentialTxType } from '../../../components/credentials/constants/credential.constants';

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

     clearInputFields(): void {
          if (this.txUiService.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.txUiService.clearAllOptions();
          this.credentialStore.resetCredentailFields();
     }
}
