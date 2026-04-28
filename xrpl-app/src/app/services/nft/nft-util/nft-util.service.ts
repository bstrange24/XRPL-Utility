import { computed, inject, Injectable, signal } from '@angular/core';
import { CreateNftStoreService } from '../nft-store/nft-store.service';
import { AccountFlags, NftFlagKey, NftFlags } from '../../../components/nft-create/constants/nft-create.types';
import * as xrpl from 'xrpl';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { LogServiceService } from '../../shared/log-service/log-service.service';

@Injectable({
     providedIn: 'root',
})
export class NftUtilService {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplService = inject(XrplService);
     public readonly utilsService = inject(UtilsService);
     public readonly logService = inject(LogServiceService);

     readonly nftFlagValues = {
          burnableNft: 0x00000001,
          onlyXrpNft: 0x00000002,
          trustLine: 0x00000004,
          transferableNft: 0x00000008,
          mutableNft: 0x00000010,
     };
     readonly nftFlags = signal<NftFlags>({
          burnableNft: false,
          onlyXrpNft: false,
          trustLine: false,
          transferableNft: false,
          mutableNft: false,
     });
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
          if (step === 'waiting_validation') return 'Create NFT';
          return this.txUiService.stepMessage();
     });

     readonly burnNftButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Burn NFT';
          if (step === 'waiting_validation') return 'Burn NFT';
          return this.txUiService.stepMessage();
     });

     readonly updateNftMetadataButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Update NFT Metadata';
          if (step === 'waiting_validation') return 'Update NFT Metadata';
          return this.txUiService.stepMessage();
     });

     readonly createNftBuyButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Buy NFT';
          if (step === 'waiting_validation') return 'Buy NFT';
          return this.txUiService.stepMessage();
     });
     readonly createNftSellButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Sell NFT';
          if (step === 'waiting_validation') return 'Sell NFT';
          return this.txUiService.stepMessage();
     });
     readonly createNftBuyOfferButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Buy NFT Offer';
          if (step === 'waiting_validation') return 'Buy NFT Offer';
          return this.txUiService.stepMessage();
     });
     readonly createNftSellOfferButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Sell NFT Offer';
          if (step === 'waiting_validation') return 'Sell NFT Offer';
          return this.txUiService.stepMessage();
     });
     readonly createNftCancelOfferButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Cancel NFT Offer';
          if (step === 'waiting_validation') return 'Cancel NFT Offer';
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

     getFlagsValue(): number {
          const flags = this.nftFlags();
          let v_flags = 0;
          if (flags.burnableNft) v_flags |= xrpl.NFTokenMintFlags.tfBurnable;
          if (flags.onlyXrpNft) v_flags |= xrpl.NFTokenMintFlags.tfOnlyXRP;
          if (flags.transferableNft) v_flags |= xrpl.NFTokenMintFlags.tfTransferable;
          if (flags.mutableNft) v_flags |= xrpl.NFTokenMintFlags.tfMutable;
          if (flags.trustLine) v_flags |= xrpl.NFTokenMintFlags.tfTrustLine;
          return v_flags;
     }

     resetFlags() {
          this.nftFlags.set({
               burnableNft: false,
               onlyXrpNft: false,
               trustLine: false,
               transferableNft: false,
               mutableNft: false,
          });
          this.updateNftFlagTotal();
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

     toggleFlag(flag: NftFlagKey): void {
          this.nftFlags.update(current => ({
               ...current,
               [flag]: !current[flag],
          }));
          this.updateNftFlagTotal();
     }

     private updateNftFlagTotal(): void {
          const flags = this.nftFlags();
          let sum = 0;

          if (flags.burnableNft) sum |= this.nftFlagValues.burnableNft;
          if (flags.onlyXrpNft) sum |= this.nftFlagValues.onlyXrpNft;
          if (flags.trustLine) sum |= this.nftFlagValues.trustLine;
          if (flags.transferableNft) sum |= this.nftFlagValues.transferableNft;
          if (flags.mutableNft) sum |= this.nftFlagValues.mutableNft;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

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

     async getNftOfferDetails(client: any, wallet: any, prefetched?: { accountInfo?: any; accountObjects?: xrpl.AccountObjectsResponse; ledgerInfo?: any }) {
          // ── Phase 1: Core data (reuse what the caller already has) ──
          const coreTasks: Promise<any>[] = [
               prefetched?.ledgerInfo ?? this.xrplService.getLedgerInfo(client),
               prefetched?.accountInfo ?? this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
               prefetched?.accountObjects ?? this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
               this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } })),
               this.xrplService.getAccountNFTOffers(client, wallet.classicAddress, 'validated', 'nft_offer').catch(() => ({ result: { account_nfts: [] } })),
          ];

          const nftId = this.nftCreateStoreService.nftId();

          // Only fetch per-NFT sell/buy offers when a specific NFT ID is entered
          if (nftId) {
               coreTasks.push(
                    this.xrplService.getNFTSellOffers(client, nftId).catch(() => ({ result: { offers: [] } })),
                    this.xrplService.getNFTBuyOffers(client, nftId).catch(() => ({ result: { offers: [] } }))
               );
          }

          const results = await Promise.all(coreTasks);

          const ledgerInfo = results[0];
          const accountInfo = results[1];
          const accountObjects = results[2];
          const nftInfo = results[3];
          const nftAccountOffers = results[4];
          const sellOffersResponse = nftId ? results[5] : null;
          const buyOffersResponse = nftId ? results[6] : null;

          // ── Phase 2: Filter account-level offers ──
          const s = this.filterSellOffers(nftAccountOffers, wallet);
          const b = this.filterBuyOffers(nftAccountOffers, wallet);

          // ── Phase 3: If a specific NFT ID was provided, return directly ──
          if (nftId) {
               return {
                    ledgerInfo,
                    accountInfo,
                    accountObjects,
                    nftInfo,
                    sellOffersResponse,
                    buyOffersResponse,
                    s,
                    b,
               };
          }

          // ── Phase 4: No NFT ID — account-level offer aggregation ──
          const nfts = nftInfo.result.account_nfts;
          if (nfts.length === 0) {
               return {
                    ledgerInfo,
                    accountInfo,
                    accountObjects,
                    nftInfo,
                    sellOffersResponse: [],
                    buyOffersResponse: [],
               };
          }

          // Fetch per-NFT offers in parallel (N+1, but only when no single NFT is selected)
          const [buyOffersResponses, sellOffersResponses] = await Promise.all([Promise.all(this.createBuyOfferPromises(nfts, client)), Promise.all(this.createSellOfferPromises(nfts, client))]);

          const buyOffers = this.createBuyOffersResponse(nfts, buyOffersResponses);
          const sellOffers = this.createSellOffersResponse(nfts, sellOffersResponses);

          const mergedBuyOffersResponse = this.mergeOffers(buyOffers, b);
          const mergedSellOffersResponse = this.mergeOffers(sellOffers, s);

          return {
               ledgerInfo,
               accountInfo,
               accountObjects,
               nftInfo,
               sellOffersResponse: mergedSellOffersResponse,
               buyOffersResponse: mergedBuyOffersResponse,
          };
     }

     async getNftOfferDetails1(client: any, wallet: any, prefetched?: { accountInfo?: any; accountObjects?: any }) {
          if (this.nftCreateStoreService.nftId()) {
               // Single NFT mode - returns { result: { offers: [...] } }
               const [ledgerInfo, accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse, nftAccountOffers] = await Promise.all([
                    this.xrplService.getLedgerInfo(client),
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } })),
                    this.xrplService.getNFTSellOffers(client, this.nftCreateStoreService.nftId()).catch(() => ({ result: { offers: [] } })),
                    this.xrplService.getNFTBuyOffers(client, this.nftCreateStoreService.nftId()).catch(() => ({ result: { offers: [] } })),
                    this.xrplService.getAccountNFTOffers(client, wallet.classicAddress, 'validated', 'nft_offer').catch(() => ({ result: { account_nfts: [] } })),
               ]);

               // Filter only sell offers (Flags = 1) and buy offers (Flags = 0)
               const s = this.filterSellOffers(nftAccountOffers, wallet);
               const b = this.filterBuyOffers(nftAccountOffers, wallet);

               return { ledgerInfo, accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse, s, b };
          } else {
               const [ledgerInfo, accountInfo, accountObjects, nftInfo, nftAccountOffers] = await Promise.all([
                    this.xrplService.getLedgerInfo(client),
                    this.xrplService.getAccountInfo(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountObjects(client, wallet.classicAddress, 'validated', ''),
                    this.xrplService.getAccountNFTs(client, wallet.classicAddress, 'validated', '').catch(() => ({ result: { account_nfts: [] } })),
                    this.xrplService.getAccountNFTOffers(client, wallet.classicAddress, 'validated', 'nft_offer').catch(() => ({ result: { account_nfts: [] } })),
               ]);

               const nfts = nftInfo.result.account_nfts;
               if (nfts.length === 0) {
                    return { ledgerInfo, accountInfo, accountObjects, nftInfo, sellOffersResponse: [], buyOffersResponse: [] };
               }

               // CREATE ALL PROMISES FIRST
               const buyOfferPromises = this.createBuyOfferPromises(nfts, client);
               const sellOfferPromises = this.createSellOfferPromises(nfts, client);

               // AWAIT ALL PROMISES IN PARALLEL
               const [buyOffersResponses, sellOffersResponses] = await Promise.all([Promise.all(buyOfferPromises), Promise.all(sellOfferPromises)]);

               const buyOffersResponse = this.createBuyOffersResponse(nfts, buyOffersResponses);
               const sellOffersResponse = this.createSellOffersResponse(nfts, sellOffersResponses);
               this.logService.logObjects('buyOffersResponse', buyOffersResponse);
               this.logService.logObjects('sellOffersResponse', sellOffersResponse);

               // Filter only sell offers (Flags = 1) and buy offers (Flags = 0)
               const s = this.filterSellOffers(nftAccountOffers, wallet);
               const b = this.filterBuyOffers(nftAccountOffers, wallet);
               this.logService.logObjects('s', s);
               this.logService.logObjects('b', b);

               const mergedBuyOffersResponse = this.mergeOffers(buyOffersResponse, b);
               const mergedSellOffersResponse = this.mergeOffers(sellOffersResponse, s);
               // const mergedBuyOffersResponse = this.mergeByNftId(buyOffersResponse, b, false);
               // const mergedSellOffersResponse = this.mergeByNftId(sellOffersResponse, s, true);
               this.logService.logObjects('mergedBuyOffersResponse', mergedBuyOffersResponse);
               this.logService.logObjects('mergedSellOffersResponse', mergedSellOffersResponse);

               // return { accountInfo, accountObjects, nftInfo, sellOffersResponse, buyOffersResponse };
               return { ledgerInfo, accountInfo, accountObjects, nftInfo, sellOffersResponse: mergedSellOffersResponse, buyOffersResponse: mergedBuyOffersResponse };
          }
     }

     private createSellOffersResponse(nfts: any, sellOffersResponses: any[]) {
          return nfts.map((nft: any, index: any) => ({
               nftId: nft.NFTokenID,
               offers: sellOffersResponses[index]?.result?.offers || [],
          }));
     }

     private createBuyOffersResponse(nfts: any, buyOffersResponses: any[]) {
          return nfts.map((nft: any, index: any) => ({
               nftId: nft.NFTokenID,
               offers: buyOffersResponses[index]?.result?.offers || [],
          }));
     }

     private createSellOfferPromises(nfts: any, client: any) {
          return nfts.map((nft: any) =>
               this.xrplService.getNFTSellOffers(client, nft.NFTokenID).catch(err => {
                    console.warn(`Sell offers error for ${nft.NFTokenID}:`, err.message);
                    return { result: { offers: [] } };
               })
          );
     }

     private createBuyOfferPromises(nfts: any, client: any) {
          return nfts.map((nft: any) =>
               this.xrplService.getNFTBuyOffers(client, nft.NFTokenID).catch(err => {
                    console.warn(`Buy offers error for ${nft.NFTokenID}:`, err.message);
                    return { result: { offers: [] } };
               })
          );
     }

     private filterBuyOffers(nftAccountOffers: any, wallet: any) {
          const sells = nftAccountOffers.result.account_objects.filter((obj: any) => {
               return obj.LedgerEntryType === 'NFTokenOffer' && obj.Flags === 0;
          });

          const b = sells.map((o: any) => ({
               nftOfferIndex: o.index,
               nftId: o.NFTokenID,
               amount: o.Amount,
               owner: o.Owner, // the NFT’s current owner (seller)
               buyer: wallet.classicAddress, // the account that submitted this offer
               expiration: o.Expiration ?? null,
          }));
          return b;
     }

     private filterSellOffers(nftAccountOffers: any, wallet: any) {
          const buys = nftAccountOffers.result.account_objects.filter((obj: any) => {
               return obj.LedgerEntryType === 'NFTokenOffer' && obj.Flags === 1;
          });

          const s = buys.map((o: any) => ({
               nftOfferIndex: o.index,
               nftId: o.NFTokenID,
               amount: o.Amount,
               seller: wallet.classicAddress, // the account that submitted this offer
               buyer: o.Destination ?? null, // optional target buyer
               expiration: o.Expiration ?? null,
          }));
          return s;
     }

     private mergeOffers(existingResponses: any[], newOffers: any[]) {
          // Flatten all existing offer indices
          const existingIndices = new Set(existingResponses.flatMap(r => r.offers.map((o: any) => o.nftOfferIndex || o.nft_offer_index)));

          // Filter new offers to only those not already in existingIndices
          const filteredNewOffers = newOffers.filter(o => !existingIndices.has(o.nftOfferIndex));

          if (filteredNewOffers.length > 0) {
               return [
                    ...existingResponses,
                    {
                         nftId: 'account_level', // marker bucket for account_objects
                         offers: filteredNewOffers,
                    },
               ];
          }
          return existingResponses;
     }

     mergeByNftId(existingResponses: any[], newOffers: any[], isSell: boolean) {
          // Clone so we don't mutate original
          const merged = [...existingResponses];

          for (const offer of newOffers) {
               const nftId = offer.nftId;

               // Find existing entry for this NFT
               let existing = merged.find(r => r.nftId === nftId);
               if (!existing) {
                    // No entry yet → create it
                    existing = { nftId, offers: [] };
                    merged.push(existing);
               }

               // Collect existing offer indices
               const existingIndices = new Set(existing.offers.map((o: any) => o.nftOfferIndex || o.index));

               // Only push if not already there
               if (!existingIndices.has(offer.nftOfferIndex)) {
                    existing.offers.push(offer);
               }
          }

          return merged;
     }

     getExistingNfts(checkObjects: any, classicAddress: string) {
          const nftPages = (checkObjects?.result?.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'NFTokenPage');

          // Flatten all NFTokens from all pages
          const allNfts = nftPages.flatMap((page: any) => {
               return page.NFTokens.map((entry: any) => {
                    const nft = entry.NFToken;

                    return {
                         LedgerEntryType: page.LedgerEntryType,
                         PageIndex: page.index,
                         NFTokenID: nft.NFTokenID,
                         Flags: nft.Flags ?? 0,
                         Issuer: nft.Issuer,
                         Taxon: nft.NFTaxon,
                         TransferFee: nft.TransferFee,
                         Sequence: nft.Sequence,
                         URI_hex: nft.URI,
                         URI: nft.URI ? this.utilsService.decodeHex(nft.URI) : null,
                    };
               });
          });

          this.nftCreateStoreService.setField('existingNfts', allNfts);
          this.logService.logObjects('existingNfts', this.nftCreateStoreService.existingNfts());
          return this.nftCreateStoreService.existingNfts();
     }

     getExistingSellOffers(accountObjects: any, ledgerInfo: any) {
          const offers = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'NFTokenOffer' && (obj.Flags & 1) === 1) // tfSellNFToken
               .map((obj: any) => ({
                    OfferIndex: obj.index,
                    NFTokenID: obj.NFTokenID,
                    Amount: obj.Amount,
                    Owner: obj.Owner,
                    Destination: obj.Destination,
                    Expiration: obj.Expiration,
                    Flags: obj.Flags,
                    isExpired: obj.Expiration ? ledgerInfo.currentRippleTime > obj.Expiration : false,
               }));

          this.nftCreateStoreService.setField('existingSellOffers', offers);
          this.logService.logObjects('existingSellOffers (from account_objects)', this.nftCreateStoreService.existingSellOffers());
     }

     getExistingBuyOffers(accountObjects: any, ledgerInfo: any) {
          const offers = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'NFTokenOffer' && (obj.Flags & 1) === 0) // Buy offer
               .map((obj: any) => ({
                    OfferIndex: obj.index,
                    NFTokenID: obj.NFTokenID,
                    Amount: obj.Amount,
                    Owner: obj.Owner,
                    Destination: obj.Destination,
                    Expiration: obj.Expiration,
                    Flags: obj.Flags,
                    isExpired: obj.Expiration ? ledgerInfo.currentRippleTime > obj.Expiration : false,
               }));

          this.nftCreateStoreService.setField('existingBuyOffers', offers);
          this.logService.logObjects('existingBuyOffers (from account_objects)', this.nftCreateStoreService.existingBuyOffers());
     }

     getExistingSellOffers1(sellOfferData: any) {
          if (sellOfferData.length > 0) {
               const allSellOffers = sellOfferData.flatMap((nft: any) => {
                    return nft.offers.map((offer: any) => {
                         return {
                              LedgerEntryType: 'NFTokenOffer',
                              NFTokenID: nft.nftId,
                              OfferIndex: offer.nft_offer_index,
                              AmountDrops: offer.amount,
                              AmountXRP: xrpl.dropsToXrp(offer.amount),
                              Flags: offer.flags ?? 0,
                              Owner: offer.owner,
                              IsSellOffer: (offer.flags & 1) === 1,
                         };
                    });
               });

               this.nftCreateStoreService.setField('existingSellOffers', allSellOffers);
          }
          this.logService.logObjects('existingSellOffers', this.nftCreateStoreService.existingSellOffers());
          return this.nftCreateStoreService.existingSellOffers();
     }

     getExistingBuyOffers1(checkObjects: any) {
          if (checkObjects && checkObjects?.result?.offers?.length > 0) {
               const nftPages = (checkObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'NFTokenPage');

               // Flatten all NFTokens from all pages
               const allNfts = nftPages.flatMap((page: any) => {
                    return page.NFTokens.map((entry: any) => {
                         const nft = entry.NFToken;

                         return {
                              LedgerEntryType: page.LedgerEntryType,
                              PageIndex: page.index,
                              NFTokenID: nft.NFTokenID,
                              Flags: nft.Flags ?? 0,
                              Issuer: nft.Issuer,
                              Taxon: nft.NFTaxon,
                              TransferFee: nft.TransferFee,
                              Sequence: nft.Sequence,
                              URI_hex: nft.URI,
                              URI: nft.URI ? this.utilsService.decodeHex(nft.URI) : null,
                         };
                    });
               });

               this.nftCreateStoreService.setField('existingBuyOffers', allNfts);
          }
          this.logService.logObjects('existingBuyOffers', this.nftCreateStoreService.existingBuyOffers());
          return this.nftCreateStoreService.existingBuyOffers();
     }

     /** filterOffers
      * Filter offers where:
      * - no Destination is specified (anyone can buy)
      * - OR destination matches our wallet
      * - And price is valid
      */
     filterOffers(sellOffer: any[], wallet: any) {
          const validOffers = sellOffer.filter(offer => {
               const isUnrestricted = !offer.Destination;
               const isTargeted = offer.Destination === wallet.classicAddress;
               return (isUnrestricted || isTargeted) && offer.amount;
          });
          // Sort by lowest price
          validOffers.sort((a, b) => parseInt(a.amount) - parseInt(b.amount));
          return validOffers;
     }

     parseAndValidateNFTokenIDs(idsString: string): string[] {
          const ids = idsString.split(',').map(id => id.trim());
          const validIds = ids.filter(id => /^[0-9A-Fa-f]{64}$/.test(id));
          return validIds;
     }
}
