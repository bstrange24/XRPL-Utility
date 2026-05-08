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
               this.credentialStore.setField('subject', cred.Subject);
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

     private sortCredentials(a: CredentialItem, b: CredentialItem) {
          // Use raw timestamps for accurate comparison
          const aHasExpiration = a.ExpirationRaw !== undefined && a.ExpirationRaw !== 0;
          const bHasExpiration = b.ExpirationRaw !== undefined && b.ExpirationRaw !== 0;

          if (aHasExpiration && !bHasExpiration) return -1;
          if (!aHasExpiration && bHasExpiration) return 1;

          if (aHasExpiration && bHasExpiration) {
               return (a.ExpirationRaw || 0) - (b.ExpirationRaw || 0);
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
          const expirationRaw = obj.Expiration || 0;

          return {
               index: obj.index,
               CredentialType: credentialType ? this.decodeutf8Hex(credentialType) : 'Unknown Type',
               Expiration: expirationRaw ? this.utilsService.fromRippleTime(expirationRaw).est : 'N/A',
               ExpirationRaw: expirationRaw, // Store raw for comparisons
               Issuer: obj.Issuer,
               Subject: obj.Subject,
               URI: this.decodeutf8Hex(uri),
               Flags: obj.Flags || 0, // Always store as number
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

     /**
      * Check if a credential has been accepted
      * LSF_ACCEPTED flag value is 65536 (0x10000)
      */
     isCredentialAccepted(cred: CredentialItem): boolean {
          // Flags should always be a number from the XRPL
          if (typeof cred.Flags === 'number') {
               return (cred.Flags & AppConstants.LSF_ACCEPTED) !== 0;
          }
          // Fallback for any edge cases
          console.warn('Credential Flags is not a number:', cred.index, cred.Flags);
          return false;
     }

     /**
      * Check if a credential is expired
      * Uses raw XRPL timestamp for accurate comparison
      */
     isCredentialExpired(cred: CredentialItem): boolean {
          if (!cred.ExpirationRaw || cred.ExpirationRaw === 0) {
               return false; // No expiration date
          }

          // Convert XRPL time (seconds since 2000-01-01) to JS timestamp
          const RIPPLE_EPOCH_OFFSET = 946684800; // Seconds from 1970 to 2000
          const expirationDate = new Date((cred.ExpirationRaw + RIPPLE_EPOCH_OFFSET) * 1000);
          const now = new Date();

          return expirationDate < now;
     }

     selectCredential(item: SelectItem | CredentialItem | null, activeTab: CredentialActionTypes, walletAddress: string | undefined, source: 'dropdown' | 'list' = 'list'): void {
          if (!item || !walletAddress) {
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

          const isWalletSubject = cred.Subject === walletAddress;
          const isWalletIssuer = cred.Issuer === walletAddress;

          // Tab-specific business rules - FIXED
          if (activeTab === 'verifyCredential') {
               // Allow verification but provide appropriate warnings
               if (isWalletSubject) {
                    this.toastService.warn('You are the subject of this credential. Verification results may have limited meaning for third parties.', AppConstants.TOAST.WARN);
               }

               if (isWalletIssuer) {
                    this.toastService.info('You are the issuer of this credential. Verification confirms your own issued credential.', AppConstants.TOAST.INFO);
               }

               this.applySelectedCredential(cred);
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
          return this.isCredentialAccepted({ Flags: flags } as CredentialItem) ? 'Credential accepted' : 'Credential not accepted';
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
