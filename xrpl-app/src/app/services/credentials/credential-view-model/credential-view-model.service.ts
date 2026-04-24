import { computed, inject, Injectable, signal } from '@angular/core';
import { CredentialStore } from '../credential-store/credential-store.service';
import { CredentialUtilService } from '../credential-util/credential-util.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { CredentialActionTypes, CredentialItem, CredentialItemVm } from '../../../components/credentials/constants/credential.types';

@Injectable({
     providedIn: 'root',
})
export class CredentialViewModelService {
     private readonly credentialStore = inject(CredentialStore);
     private readonly credentialUtilService = inject(CredentialUtilService);
     private readonly walletManager = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     readonly activeTab = signal<CredentialActionTypes>('createCredential');

     readonly issuedByMe = computed(() => this.credentialStore.existingCredentials());
     readonly issuedToMe = computed(() => this.credentialStore.subjectCredentials());
     readonly pendingIssued = computed(() => this.issuedByMe().filter((c: CredentialItem) => !this.credentialUtilService.isCredentialAccepted(c)));
     readonly acceptedIssued = computed(() => this.issuedByMe().filter((c: CredentialItem) => this.credentialUtilService.isCredentialAccepted(c)));
     readonly pendingToAccept = computed(() => this.issuedToMe().filter((c: CredentialItem) => !this.credentialUtilService.isCredentialAccepted(c)));
     readonly acceptedByMe = computed(() => this.issuedToMe().filter((c: CredentialItem) => this.credentialUtilService.isCredentialAccepted(c)));

     /** Fully reactive credential VM */
     readonly credentialVm = computed<{ list: CredentialItemVm[]; dropdown: { id: string; display: string; secondary: string }[]; stats: any; hasCredentials: boolean }>(() => {
          const wallet = this.walletManager.getSelectedWallet();
          const tab = this.activeTab(); // <-- make sure tab is read inside computed

          if (!wallet) return { list: [], dropdown: [], stats: {}, hasCredentials: false };

          const issued = this.credentialStore.existingCredentials() ?? [];
          const received = this.credentialStore.subjectCredentials() ?? [];

          // normalize function
          const normalize = (c: CredentialItem, issuedByMe: boolean): CredentialItemVm => ({
               ...c,
               accepted: typeof c.Flags === 'number' ? (c.Flags & 65536) !== 0 : c.Flags === 'Credential accepted',
               issuedByMe,
               selectable: tab !== 'createCredential' && (tab !== 'verifyCredential' || issuedByMe),
               expired: !!c.Expiration && c.Expiration !== 'N/A' && new Date(c.Expiration) < new Date(),
          });

          const pendingIssued: CredentialItemVm[] = [];
          const acceptedIssued: CredentialItemVm[] = [];
          const pendingReceived: CredentialItemVm[] = [];
          const acceptedReceived: CredentialItemVm[] = [];

          issued.forEach((c: CredentialItem) => (normalize(c, true).accepted ? acceptedIssued.push(normalize(c, true)) : pendingIssued.push(normalize(c, true))));
          received.forEach((c: CredentialItem) => (normalize(c, false).accepted ? acceptedReceived.push(normalize(c, false)) : pendingReceived.push(normalize(c, false))));

          let list: CredentialItemVm[] = [];
          switch (tab) {
               case 'createCredential':
               case 'deleteCredential':
                    list = [...pendingIssued, ...acceptedIssued];
                    break;
               case 'acceptCredential':
                    list = pendingReceived.length ? pendingReceived : acceptedReceived;
                    break;
               case 'verifyCredential':
                    list = [...pendingIssued, ...acceptedIssued, ...pendingReceived, ...acceptedReceived];
                    break;
          }

          const dropdown = list.map(c => ({
               id: c.index,
               display: c.CredentialType || 'Unknown',
               secondary: `${c.index.slice(0, 12)}...`,
          }));

          return {
               list,
               dropdown,
               stats: {
                    issued: issued.length,
                    received: received.length,
                    pendingIssued: pendingIssued.length,
                    acceptedIssued: acceptedIssued.length,
                    pendingReceived: pendingReceived.length,
                    acceptedReceived: acceptedReceived.length,
               },
               hasCredentials: list.length > 0,
          };
     });

     readonly selectedCredentialIsExpired = computed<boolean>(() => {
          const selectedId = this.credentialStore.credentialID();
          if (!selectedId) return false;

          const credsVm = this.credentialVm();
          const selectedCred = credsVm.list.find(c => c.index === selectedId);

          return selectedCred?.expired ?? false;
     });

     /** Main VM for templates */
     readonly vm = computed(() => {
          const tab = this.activeTab(); // <-- read active tab here
          const wallet = this.walletManager.getSelectedWallet();
          const creds = this.credentialVm(); // <-- must read here, so vm re-runs on tab change

          const selectedId = this.credentialStore.credentialID();
          const selectedCredentialItem = selectedId ? (creds.dropdown.find((i: { id: string }) => i.id === selectedId) ?? null) : null;

          return {
               tab,
               wallet,
               walletName: wallet?.name || 'Selected wallet',
               address: wallet?.address ?? '',
               selectedCredentialItem,
               summaryMessage: this.summaryMessage(tab),
               actionButtonLabel: this.actionButtonLabel(tab),
               actionButtonClass: this.actionButtonClass(tab),
               hasCredentials: creds.hasCredentials,
          };
     });

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

     readonly createCredentialButtonLabel = this.buildTxLabel('Create Credential');
     readonly acceptCredentialsButtonLabel = this.buildTxLabel('Accept Credential');
     readonly deleteCredentialsButtonLabel = this.buildTxLabel('Delete Credential');
     readonly verifyCredentialLabel = this.buildTxLabel('Verify Credential');

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for ledger validation...';
               return this.txUiService.stepMessage();
          });
     }

     actionButtonLabel(tab: CredentialActionTypes) {
          switch (tab) {
               case 'createCredential':
                    return this.createCredentialButtonLabel();
               case 'acceptCredential':
                    return this.acceptCredentialsButtonLabel();
               case 'deleteCredential':
                    return this.deleteCredentialsButtonLabel();
               case 'verifyCredential':
                    return this.verifyCredentialLabel();
          }
     }

     actionButtonClass(tab: CredentialActionTypes) {
          switch (tab) {
               case 'createCredential':
                    return 'btn-primary';
               case 'acceptCredential':
                    return 'btn-purple';
               case 'deleteCredential':
                    return 'btn-primary-red';
               case 'verifyCredential':
                    return 'btn-amber';
          }
     }

     credentialsToShow(tab: CredentialActionTypes) {
          const s = this.credentialStats();

          switch (tab) {
               case 'createCredential':
                    return [...s.pendingIssued, ...s.acceptedIssued];
               case 'acceptCredential':
                    return s.pendingToAccept.length ? s.pendingToAccept : s.acceptedByMe;
               case 'deleteCredential':
                    return s.issuedByMe;
               case 'verifyCredential':
                    return [...s.pendingToAccept, ...s.acceptedByMe, ...s.pendingIssued, ...s.acceptedIssued];
          }
     }

     summaryMessage(tab: CredentialActionTypes) {
          const s = this.credentialStats();

          switch (tab) {
               case 'createCredential':
                    if (s.counts.issued === 0) return ' has not issued any credentials yet.';
                    return ` has issued <strong>${s.counts.issued}</strong> credential${s.counts.issued === 1 ? '' : 's'}.`;
               case 'acceptCredential':
                    if (s.counts.pendingToAccept === 0) return ' has no pending credentials to accept.';
                    return ` has <strong>${s.counts.pendingToAccept}</strong> credential${s.counts.pendingToAccept === 1 ? '' : 's'} pending acceptance.`;
               case 'deleteCredential':
                    if (s.counts.issued === 0) return ' has no credentials to delete.';
                    return ` has <strong>${s.counts.issued}</strong> issued credential${s.counts.issued === 1 ? '' : 's'} that can be deleted.`;
               case 'verifyCredential': {
                    const total = s.counts.issued + s.counts.received;
                    if (total === 0) return ' is not involved in any credentials.';
                    return ` is involved in <strong>${total}</strong> credential${total === 1 ? '' : 's'} — Received: ${s.counts.received} • Issued: ${s.counts.issued}`;
               }
          }
     }
}
