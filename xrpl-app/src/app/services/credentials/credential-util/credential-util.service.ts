import { computed, inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import * as xrpl from 'xrpl';
import { CredentialStore } from '../credential-store/credential-store.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CredentialActionTypes, CredentialItem } from '../../../components/credentials/constants/credential.types';
import { XrplTxOptionsStore } from '../../../components/shared/stores/xrpl-tx-options.store';
import { LogServiceService } from '../../shared/log-service/log-service.service';

@Injectable({
     providedIn: 'root',
})
export class CredentialUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);
     public readonly credentialStore = inject(CredentialStore);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly logService = inject(LogServiceService);

     constructor() {
          super();
     }

     private readonly decodeCache = new Map<string, string>();

     filteredExisting = computed(() => this.filterCredentials(this.credentialStore.existingCredentials(), this.credentialStore.credentialIdSearchTerm()));
     filteredSubject = computed(() => this.filterCredentials(this.credentialStore.subjectCredentials(), this.credentialStore.credentialIdSearchTerm()));
     selectedCredentialIndex = computed(() => this.credentialStore.credentialID());

     selectCredentialFromList(cred: CredentialItem, tab: string, walletAddress: string) {
          this.credentialStore.setField('selectedCredentials', cred);

          const isVerifyTab = tab === 'verifyCredential';
          const isSubject = cred.Subject === walletAddress;

          if (!isVerifyTab || !isSubject) {
               this.credentialStore.setField('credentialID', cred.index);
               this.credentialStore.setField('credentialType', cred.CredentialType || '');
               this.credentialStore.setField('credentialIssuer', cred.Issuer);
          } else {
               this.credentialStore.resetCredentialIdDropDown();
          }
     }

     private parseCredentials(accountObjects: xrpl.AccountObjectsResponse, address: string, role: 'issuer' | 'subject') {
          const objects = accountObjects.result.account_objects ?? [];

          const mapped = objects
               .filter(obj => obj.LedgerEntryType === 'Credential' && (role === 'issuer' ? obj.Issuer === address : obj.Subject === address))
               .map(obj => this.mapCredential(obj))
               .sort(this.sortCredentials);

          this.logService.logObjects(`credentials-${role}`, mapped);

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
          const credentialType = obj.CredentialType;
          const uri = obj.URI;

          return {
               index: obj.index,
               CredentialType: credentialType ? this.decodeutf8Hex(credentialType) : 'Unknown Type',
               Expiration: obj.Expiration ? this.utilsService.fromRippleTime(obj.Expiration).est : 'N/A',
               Issuer: obj.Issuer,
               Subject: obj.Subject,
               URI: this.decodeutf8Hex(uri),
               Flags: this.getCredentialStatus(obj.Flags),
          };
     }

     applySelectedCredential(cred: CredentialItem | null) {
          if (!cred) {
               this.credentialStore.resetCredentialIdDropDown();
               return;
          }

          this.credentialStore.setField('selectedCredentials', cred);
          this.credentialStore.setField('credentialID', cred.index);
          this.credentialStore.setField('credentialIssuer', cred.Issuer);
          this.credentialStore.setField('credentialType', cred.CredentialType || '');
          this.credentialStore.setField('subject', cred.Subject);
     }

     filterCredentials(list: CredentialItem[], term: string): CredentialItem[] {
          if (!term) return list;
          const lower = term.toLowerCase();
          return list.filter(c => c.CredentialType?.toLowerCase().includes(lower) || c.Issuer?.toLowerCase().includes(lower) || c.Subject?.toLowerCase().includes(lower) || c.index?.toLowerCase().includes(lower));
     }

     isCredentialAccepted(cred: CredentialItem): boolean {
          // Flags come from XRPL as number, but your utilsService.getCredentialStatus() returns object
          // So we check both possibilities
          if (typeof cred.Flags === 'number') return (cred.Flags & AppConstants.LSF_ACCEPTED) !== 0;
          if (typeof cred.Flags === 'object') return !!cred.Flags.lsfAccepted;
          if (cred.Flags === 'Credential accepted') return true;
          return false;
     }

     selectCredential(item: SelectItem | CredentialItem | null, activeTab: CredentialActionTypes, walletAddress: string | undefined, source: 'dropdown' | 'list' = 'list'): void {
          if (!item) {
               this.applySelectedCredential(null);
               return;
          }

          // Normalize input to CredentialItem
          let cred: CredentialItem | undefined;

          if (source === 'dropdown' && 'id' in item) {
               const existing = this.credentialStore.existingCredentials();
               const subject = this.credentialStore.subjectCredentials();
               cred = existing.find(c => c.index === item.id) ?? subject.find(c => c.index === item.id);
               if (!cred) return;
          } else {
               cred = item as CredentialItem;
          }

          if (!cred) return;

          const isWalletSubject = walletAddress && cred.Subject === walletAddress;
          const isWalletIssuer = walletAddress && cred.Issuer === walletAddress;

          // Tab-specific business rules
          if (activeTab === 'verifyCredential') {
               if (isWalletIssuer) {
                    this.applySelectedCredential(cred);
               } else if (isWalletSubject) {
                    this.applySelectedCredential(null);
                    this.toastService.info('You cannot verify credentials you are the subject of. Verification is typically performed by the issuer or a third party.', AppConstants.TOAST.INFO);
                    return;
               } else {
                    this.applySelectedCredential(cred);
               }
          } else {
               this.applySelectedCredential(cred);
          }
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
          this.credentialStore.setField('credentialIdSearchQuery', value);
     }

     setCredentialType(value: string) {
          this.credentialStore.setField('credentialType', value);
     }

     setCredentialUri(value: string) {
          this.credentialStore.setField('uri', value);
     }

     clearInputFields(): void {
          if (this.xrplTxOptionsStore.isSimulateEnabled()) return;
          this.txUiService.clearAllFields();
          this.credentialStore.resetCredentailFields();
     }
}
