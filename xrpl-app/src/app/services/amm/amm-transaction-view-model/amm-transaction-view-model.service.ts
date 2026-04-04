import { computed, inject, Injectable, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { AmmActionTypes } from '../../../components/amm/constants/amm.types';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { NftUtilService } from '../../nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustline-currency/trustline-util/trustline-currency.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { UtilsService } from '../../util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { AmmStoreService } from '../amm-store/amm-store.service';

@Injectable({
     providedIn: 'root',
})
export class AmmTransactionViewModelService {
     public readonly xrplCacheService = inject(XrplCacheService);
     public readonly checkUtilService = inject(CheckUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineStoreService = inject(TrustlineStoreService);
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     readonly activeTab = signal<AmmActionTypes>('createAMM');

     currencyItems = this.trustlineCurrencyService.currencyItems;
     issuerItems = this.trustlineCurrencyService.issuerItems;
     currencyBalanceField = this.currencyStoreService.balance();

     selectedIssuerAddress = computed(() => this.currencyStoreService.issuer());
     selectedCurrencyItem = computed(() => this.currencyItems().find(i => i.id === this.currencyStoreService.currency()) ?? null);
     selectedIssuerItem = computed(() => this.issuerItems().find(i => i.id === this.currencyStoreService.issuer()) ?? null);
}
