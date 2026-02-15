import { computed, inject, Injectable, Signal, WritableSignal } from '@angular/core';
import { CheckItem, MPToken } from '../../../models/interface-items.model';
import { CopyUtilService } from '../../copy-util/copy-util.service';
import { DownloadUtilService } from '../../download-util/download-util.service';
import { ToastService } from '../../toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustline-currency/trustline-currency.service';
import { UtilsService } from '../../util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { XrplTransactionExecutorService } from '../../xrpl-transaction-executor/xrpl-transaction-executor.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../../components/base/performance-base/performance-base.component';
import * as xrpl from 'xrpl';
import { SelectItem } from '../../../components/ui-dropdowns/select-search-dropdown/select-search-dropdown.component';

@Injectable({
     providedIn: 'root',
})
export class MptUtilService {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);

     getExistingMpts(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (escrowObjects.result.account_objects ?? [])
               .filter((obj: any) => (obj.LedgerEntryType === 'MPToken' || obj.LedgerEntryType === 'MPTokenIssuance') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any): MPToken => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         MPTAmount: obj.MaximumAmount ? obj.MaximumAmount : obj.MPTAmount,
                         mpt_issuance_id: obj.mpt_issuance_id ? obj.mpt_issuance_id : obj.MPTokenIssuanceID,
                    };
               })
               .sort((a, b) => {
                    const ai = a.mpt_issuance_id ?? '';
                    const bi = b.mpt_issuance_id ?? '';
                    return ai.localeCompare(bi);
               });

          this.utilsService.logObjects('existingMpts', mapped);
          return mapped;
     }
}
