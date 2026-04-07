import { computed, inject, Injectable, signal } from '@angular/core';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { CreateNftStoreService } from '../nft-store/nft-store.service';
import { NftUtilService } from '../nft-util/nft-util.service';
import { NftOfferActionTypes } from '../../../components/nft-offers/constants/nft-offers.types';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';

@Injectable({
     providedIn: 'root',
})
export class NftOffersTransactionViewModelService {
     public readonly xrplCacheService = inject(XrplCacheService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     readonly activeTab = signal<NftOfferActionTypes>('sellNft');

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.currencyStoreService.balance();

     selectedIssuerAddress = computed(() => this.currencyStoreService.issuer());
     selectedCurrencyItem = computed(() => this.currencyItems().find(i => i.id === this.currencyStoreService.currency()) ?? null);
     selectedIssuerItem = computed(() => this.issuerItems().find(i => i.id === this.currencyStoreService.issuer()) ?? null);

     infoData = computed(() => {
          const wallet = this.walletManagerService.getSelectedWallet();
          if (!wallet?.address) return null;

          const walletName = wallet.name || wallet.address.slice(0, 10) + '...';
          const baseUrl = this.txUiService.explorerUrl();
          const address = wallet.address;

          let offers: any[] = [];
          switch (this.activeTab()) {
               case 'buyNft':
               case 'buyNftOffer':
                    offers = this.nftCreateStoreService.existingBuyOffers();
                    break;
               case 'sellNft':
               case 'sellNftOffer':
               case 'cancelNftOffer':
                    offers = this.nftCreateStoreService.existingSellOffers();
                    break;
          }

          const count = offers.length;

          const links = count > 0 ? `<a href="${baseUrl}account/${address}/nft-offers" target="_blank" rel="noopener noreferrer" class="xrpl-win-link">View Offers</a>` : '';

          const offersToShow = true
               ? offers.map(o => {
                      return {
                           index: o.OfferIndex || o.nft_offer_index,
                           nftId: o.NFTokenID || o.nftId,
                           amount: typeof o.Amount === 'string' ? xrpl.dropsToXrp(o.Amount) + ' XRP' : o.Amount,
                           counterparty: o.Owner || o.owner || o.Destination || o.buyer,
                           isSell: !!(o.Flags & 1),
                           expiration: o.Expiration,
                           isExpired: o.isExpired, // Add this field
                      };
                 })
               : [];

          return {
               walletName,
               activeTab: this.activeTab(),
               offerCount: count,
               offersToShow,
               links,
          };
     });

     // Offer Dropdown Items
     offerItems = computed(() => {
          return this.nftCreateStoreService.existingSellOffers().map(o => {
               let display = '';

               // Check if Amount is an object (IOU token) or string (XRP)
               if (typeof o.Amount === 'object' && o.Amount !== null) {
                    // Handle IOU token
                    display = `${o.Amount.value} ${o.Amount.currency} offer (issuer: ${o.Amount.issuer.slice(0, 6)}...${o.Amount.issuer.slice(-4)})`;
               } else {
                    // Handle XRP
                    display = `${xrpl.dropsToXrp(o.Amount)} XRP offer`;
               }

               return {
                    id: o.OfferIndex,
                    display: display,
                    secondary: o.NFTokenID.slice(0, 12) + '...' + o.NFTokenID.slice(-10),
                    isCurrentAccount: false,
                    isCurrentCode: false,
                    isCurrentToken: false,
                    // Optional: Add raw amount data for debugging or additional logic
                    rawAmount: o.Amount,
                    isIOU: typeof o.Amount === 'object' && o.Amount !== null,
               };
          });
     });
}
