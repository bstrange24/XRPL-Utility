import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { Wallet } from '../../wallets/manager/wallet-manager.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { ValidationService } from '../../utils/validation/transaction-validation-rule.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { CredentialStore } from '../../credentials/credential-store/credential-store.service';

interface SignTransactionsConfig {
     wallet: Wallet;
     formValues: {
          amountField: string; // must be present
          destinationAddress: string;
          destinationTagField?: any;
          invoiceIdField?: any;
          sourceTagField?: any;
          txType?: string;
          isSimulateEnabled?: boolean;
          useMultiSign?: boolean;
          isRegularKeyAddress?: boolean;
          regularKeyAddress?: string;
          regularKeySeed?: string;
          multiSignAddress?: string;
          multiSignSeeds?: string;
          [key: string]: any;
     };
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          wallet?: any;
     };
     extra?: Record<string, any>;
}

@Injectable({
     providedIn: 'root',
})
export class SignTransactionsOrchestratorService extends PerformanceBaseComponent {
     private readonly txEnv = inject(TxEnvironmentService);
     private readonly validator = inject(ValidationService);
     private readonly toast = inject(ToastService);
     private readonly utilsService = inject(UtilsService);
     private readonly txUiService = inject(TransactionUiService);
     public readonly xrplTransactionService = inject(XrplTransactionService);
     public readonly credentialStore = inject(CredentialStore);
}
