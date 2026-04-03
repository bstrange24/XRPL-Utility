import { computed, inject, Injectable, signal } from '@angular/core';
import { CreateNftStoreService } from '../nft-store/nft-store.service';
import { AccountFlags, NftFlags } from '../../../components/nft-create/constants/nft-create.types';
import * as xrpl from 'xrpl';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';

@Injectable({
     providedIn: 'root',
})
export class NftUtilService {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly txUiService = inject(TransactionUiService);

     nftFlagValues = {
          burnableNft: 0x00000001,
          onlyXrpNft: 0x00000002,
          trustLine: 0x00000004,
          transferableNft: 0x00000008,
          mutableNft: 0x00000010,
     };
     nftFlags: NftFlags = {
          burnableNft: false,
          onlyXrpNft: false,
          trustLine: false,
          transferableNft: false,
          mutableNft: false,
     };
     flags: AccountFlags = {
          asfRequireDest: false,
          asfRequireAuth: false,
          asfDisallowXRP: false,
          asfDisableMaster: false,
          asfNoFreeze: false,
          asfGlobalFreeze: false,
          asfDefaultRipple: false,
          asfDepositAuth: false,
          asfAllowTrustLineClawback: false,
          asfDisallowIncomingNFTokenOffer: false,
          asfDisallowIncomingCheck: false,
          asfDisallowIncomingPayChan: false,
          asfDisallowIncomingTrustline: false,
          asfAllowTrustLineLocking: false,
     };

     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');

     readonly createNftButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create NFT';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly burnNftButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Burn NFT';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     readonly updateNftMetadataButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Update NFT Metadata';
          if (step === 'waiting_validation') return 'Waiting for ledger validation...';
          return this.txUiService.stepMessage();
     });

     decodeNftFlags(flags: number): string[] {
          if (!flags) return [];

          const results = [];

          if (flags & 0x0001) results.push('tfBurnable');
          if (flags & 0x0002) results.push('tfOnlyXRP');
          if (flags & 0x0004) results.push('tfTrustLine');
          if (flags & 0x0008) results.push('tfTransferable');
          if (flags & 0x0010) results.push('tfMutable');

          return results;
     }

     getFlagsValue(flags: NftFlags): number {
          let v_flags = 0;
          if (flags.burnableNft) {
               v_flags |= xrpl.NFTokenMintFlags.tfBurnable;
          }
          if (flags.onlyXrpNft) {
               v_flags |= xrpl.NFTokenMintFlags.tfOnlyXRP;
          }
          if (flags.transferableNft) {
               v_flags |= xrpl.NFTokenMintFlags.tfTransferable;
          }
          if (flags.mutableNft) {
               v_flags |= xrpl.NFTokenMintFlags.tfMutable;
          }
          if (flags.trustLine) {
               v_flags |= xrpl.NFTokenMintFlags.tfTrustLine;
          }
          return v_flags;
     }

     resetFlags() {
          this.nftFlags.burnableNft = false;
          this.nftFlags.onlyXrpNft = false;
          this.nftFlags.transferableNft = false;
          this.nftFlags.mutableNft = false;
          this.nftFlags.trustLine = false;
     }

     selectedNftItem = computed(() => {
          const id = this.nftCreateStoreService.nftId();
          if (!id) return null;
          return this.nftItems().find((i: { id: string }) => i.id === id) || null;
     });

     // NFT Dropdown Items
     nftItems = computed(() => {
          return this.nftCreateStoreService.existingNfts().map((nft: { NFTokenID: string; URI: any }) => ({
               id: nft.NFTokenID,
               display: nft.URI ? `NFT • ${nft.URI}` : 'NFT • No URI',
               secondary: nft.NFTokenID.slice(0, 12) + '...' + nft.NFTokenID.slice(-10),
               isCurrentAccount: false,
               isCurrentCode: false,
               isCurrentToken: false,
          }));
     });

     decodeNftFlagsForUi(flags: number): string {
          const flagDefinitions = [
               { value: 1, name: 'burnableNft' },
               { value: 2, name: 'onlyXrpNft' },
               { value: 4, name: 'trustLine' },
               { value: 8, name: 'transferableNft' },
               { value: 16, name: 'mutableNft' },
          ];

          const activeFlags: string[] = [];

          for (const flag of flagDefinitions) {
               if ((flags & flag.value) === flag.value) {
                    activeFlags.push(flag.name);
               }
          }

          return activeFlags.length > 0 ? activeFlags.join(', ') : 'None';
     }

     // setBatchMode(mode: 'allOrNothing' | 'onlyOne' | 'untilFailure' | 'independent') {
     //      this.batchMode = mode;
     //      this.toggleFlags(); // optional: update your XRPL batch flags
     // }

     onBurnToggle(checked: boolean, nftId: string) {
          // normalize current ids
          const ids = (this.nftCreateStoreService.nftId() || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (checked) {
               if (!ids.includes(nftId)) ids.push(nftId);
          } else {
               // remove
               const idx = ids.indexOf(nftId);
               if (idx !== -1) ids.splice(idx, 1);
          }

          this.nftCreateStoreService.setField('nftId', ids.join(', '));
     }

     updateNftTextField(nftId: string, add: boolean) {
          let ids = (this.nftCreateStoreService.nftId() || '')
               .split(',')
               .map(s => s.trim())
               .filter(Boolean);

          if (add && !ids.includes(nftId)) {
               ids.push(nftId);
          } else if (!add) {
               ids = ids.filter(id => id !== nftId);
          }

          this.nftCreateStoreService.setField('nftId', ids.join(', '));
     }
}
