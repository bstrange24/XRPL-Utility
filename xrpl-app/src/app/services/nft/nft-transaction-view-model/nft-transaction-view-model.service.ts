import { computed, inject, Injectable, signal } from '@angular/core';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { CreateNftStoreService } from '../nft-store/nft-store.service';
import { NftCreateActionTypes } from '../../../components/nft-create/constants/nft-create.types';
import { NftUtilService } from '../nft-util/nft-util.service';

@Injectable({
     providedIn: 'root',
})
export class NftTransactionViewModelService {
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     readonly activeTab = signal<NftCreateActionTypes>('createNft');

     infoData = computed(() => {
          const wallet = this.walletManagerService.getSelectedWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const baseUrl = this.txUiService.explorerUrl();
          const address = wallet.address;

          const nfts = this.nftCreateStoreService.existingNfts();
          const count = nfts.length;

          const links = count > 0 ? `<a href="${baseUrl}account/${address}/nfts" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View NFTs</a>` : '';

          const nftsToShow = true
               ? nfts.map((nft: { NFTokenID: any; URI: any; Taxon: any; Sequence: any; TransferFee: any; Flags: any }) => ({
                      id: nft.NFTokenID,
                      uri: nft.URI,
                      taxon: nft.Taxon,
                      sequence: nft.Sequence,
                      transferFee: nft.TransferFee,
                      flags: this.nftUtilService.decodeNftFlagsForUi(nft.Flags || 0),
                 }))
               : [];

          return {
               walletName,
               activeTab: this.activeTab(),
               nftCount: count,
               nftsToShow,
               links,
          };
     });

     getExistingNfts(checkObjects: any, classicAddress: string) {
          const raw = Array.isArray(checkObjects) ? checkObjects : (checkObjects?.result?.account_nfts ?? []);

          const allNfts = (raw as any[]).flatMap((pageOrNft: any) => {
               // Case A: page object that contains .NFTokens (each entry may be { NFToken: { ... } })
               if (pageOrNft && Array.isArray(pageOrNft.NFTokens)) {
                    return pageOrNft.NFTokens.map((entry: any) => {
                         const nft = entry?.NFToken ?? entry ?? {};
                         return this.normalizeNft(pageOrNft, nft);
                    });
               }

               // Case B: element is already an NFT object (your sample)
               // e.g. { NFTokenID, Issuer, NFTokenTaxon or NFTaxon, nft_serial, ... }
               if (pageOrNft && (pageOrNft.NFTokenID || pageOrNft.nft_serial || pageOrNft.Issuer)) {
                    // treat the element itself as the NFT
                    return [this.normalizeNft(null, pageOrNft)];
               }

               // Unknown shape -> skip
               return [];
          });

          this.nftCreateStoreService.setField('existingNfts', allNfts);
          this.utilsService.logObjects('existingNfts', allNfts);
          return allNfts;
     }

     private normalizeNft(page: any | null, nft: any) {
          const get = <T = any>(...keys: string[]) => {
               for (const k of keys) {
                    if (nft?.[k] !== undefined) return nft[k] as T;
                    if (page?.[k] !== undefined) return page[k] as T;
               }
               return undefined as unknown as T;
          };

          // NFTokenID can be at nft.NFTokenID or nft.NFTokenID (already)
          const nfTokenId = get<string>('NFTokenID', 'NFTokenId') ?? 'N/A';

          // Flags numeric (default 0)
          const flags = get<number>('Flags') ?? 0;

          // Issuer
          const issuer = get<string>('Issuer') ?? 'N/A';

          // Taxon may appear as NFTokenTaxon, NFTaxon, Taxon
          const taxon = get<number>('NFTokenTaxon', 'NFTaxon', 'Taxon') ?? 'N/A';

          // TransferFee
          const transferFee = get<number | string>('TransferFee') ?? 'N/A';

          // Sequence or nft_serial may exist
          const sequence = get<number | string>('Sequence', 'nft_serial') ?? 'N/A';

          // URI: sometimes hex string under URI; if absent we set 'N/A'
          const uriHex = get<string>('URI') ?? get<string>('uri') ?? 'N/A';
          const uriDecoded = uriHex && uriHex !== 'N/A' ? this.utilsService.decodeHex(uriHex) : null;

          return {
               LedgerEntryType: page?.LedgerEntryType ?? nft?.LedgerEntryType ?? 'N/A',
               PageIndex: page?.index ?? page?.PageIndex ?? 'N/A',
               NFTokenID: nfTokenId,
               Flags: flags,
               Issuer: issuer,
               Taxon: taxon,
               TransferFee: transferFee,
               Sequence: sequence,
               URI_hex: uriHex,
               URI: uriDecoded,
          };
     }
}
