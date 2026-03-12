import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import { CredentialStore } from '../credential-store/credential-store.service';
import { CredentialUtilService } from '../credential-util/credential-util.service';
import { CredentialItem } from '../../../models/interface-items.model';
import { Wallet, WalletManagerService } from '../../wallets/manager/wallet-manager.service';

export interface CredentialItemVm extends CredentialItem {
     accepted: boolean;
     selectable: boolean;
     issuedByMe: boolean;
}

@Injectable({
     providedIn: 'root',
})
export class CredentialViewModelService {
     constructor(
          private credentialStore: CredentialStore,
          private credentialUtilService: CredentialUtilService,
          private walletManager: WalletManagerService
          // private currentWallet: WritableSignal<Wallet | null>
     ) {}

     /** active tab signal, e.g., 'create' | 'accept' | 'delete' | 'verify' */
     readonly activeTab = signal<'create' | 'accept' | 'delete' | 'verify'>('create');

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
               summaryMessage: this.credentialUtilService.summaryMessage(tab),
               actionButtonLabel: this.credentialUtilService.actionButtonLabel(tab),
               actionButtonClass: this.credentialUtilService.actionButtonClass(tab),
               hasCredentials: creds.hasCredentials,
          };
     });
}
