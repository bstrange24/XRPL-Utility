import { computed, inject, Injectable, signal } from '@angular/core';
import { CredentialStore } from '../credential-store/credential-store.service';
import { CredentialUtilService } from '../credential-util/credential-util.service';
import { CredentialItem } from '../../../models/interface-items.model';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { CredentialItemVm } from '../../../components/credentials/constants/credential.constants';

@Injectable({
     providedIn: 'root',
})
export class CredentialViewModelService {
     private credentialStore = inject(CredentialStore);
     private credentialUtilService = inject(CredentialUtilService);
     private walletManager = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     readonly activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');

     readonly issuedByMe = computed(() => this.credentialStore.get('existingCredentials'));
     readonly issuedToMe = computed(() => this.credentialStore.get('subjectCredentials'));
     readonly pendingIssued = computed(() => this.issuedByMe().filter((c: CredentialItem) => !this.credentialUtilService.isCredentialAccepted(c)));
     readonly acceptedIssued = computed(() => this.issuedByMe().filter((c: CredentialItem) => this.credentialUtilService.isCredentialAccepted(c)));
     readonly pendingToAccept = computed(() => this.issuedToMe().filter((c: CredentialItem) => !this.credentialUtilService.isCredentialAccepted(c)));
     readonly acceptedByMe = computed(() => this.issuedToMe().filter((c: CredentialItem) => this.credentialUtilService.isCredentialAccepted(c)));

     /** Fully reactive credential VM */
     readonly credentialVm = computed<{
          list: CredentialItemVm[];
          dropdown: { id: string; display: string; secondary: string }[];
          stats: any;
          hasCredentials: boolean;
     }>(() => {
          const wallet = this.walletManager.getSelectedWallet();
          const tab = this.activeTab(); // <-- make sure tab is read inside computed

          if (!wallet) return { list: [], dropdown: [], stats: {}, hasCredentials: false };

          const issued = this.credentialStore.get('existingCredentials') ?? [];
          const received = this.credentialStore.get('subjectCredentials') ?? [];

          // normalize function
          const normalize = (c: CredentialItem, issuedByMe: boolean): CredentialItemVm => ({
               ...c,
               accepted: typeof c.Flags === 'number' ? (c.Flags & 65536) !== 0 : c.Flags === 'Credential accepted',
               issuedByMe,
               selectable: tab !== 'create' && (tab !== 'verify' || issuedByMe),
          });

          const pendingIssued: CredentialItemVm[] = [];
          const acceptedIssued: CredentialItemVm[] = [];
          const pendingReceived: CredentialItemVm[] = [];
          const acceptedReceived: CredentialItemVm[] = [];

          issued.forEach((c: CredentialItem) => (normalize(c, true).accepted ? acceptedIssued.push(normalize(c, true)) : pendingIssued.push(normalize(c, true))));
          received.forEach((c: CredentialItem) => (normalize(c, false).accepted ? acceptedReceived.push(normalize(c, false)) : pendingReceived.push(normalize(c, false))));

          let list: CredentialItemVm[] = [];
          switch (tab) {
               case 'create':
               case 'delete':
                    list = [...pendingIssued, ...acceptedIssued];
                    break;
               case 'accept':
                    list = pendingReceived.length ? pendingReceived : acceptedReceived;
                    break;
               case 'verify':
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

     /** Main VM for templates */
     readonly vm = computed(() => {
          const tab = this.activeTab(); // <-- read active tab here
          const wallet = this.walletManager.getSelectedWallet();
          const creds = this.credentialVm(); // <-- must read here, so vm re-runs on tab change

          const selectedId = this.credentialStore.get('credentialID');
          const selectedCredentialItem = selectedId ? (creds.dropdown.find(i => i.id === selectedId) ?? null) : null;

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
               if (step === 'waiting_validation') return 'Waiting for confirmation...';
               return this.txUiService.stepMessage();
          });
     }

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
}
