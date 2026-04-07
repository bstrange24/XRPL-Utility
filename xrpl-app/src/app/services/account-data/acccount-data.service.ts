import { Injectable, signal, inject } from '@angular/core';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../utils/download-util/download-util.service';
import { CopyUtilService } from '../utils/copy-util/copy-util.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../utils/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import * as xrpl from 'xrpl';
import { TrustlineCurrencyService } from '../trustline-currency/trustline-util/trustline-currency.service';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';
import { AccountConfiguratorStoreService } from '../account-configurator/account-configurator-store/account-configurator-store.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';

@Injectable({
     providedIn: 'root',
})
export class AcccountDataService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly txExecutor = inject(XrplTransactionExecutorService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly xrplTransactions = inject(XrplTransactionService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);

     hasSignerList = signal<boolean>(false);

     refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          this.xrplTxOptionsStore.setField('ticketArray', this.utilsService.getAccountTickets(accountObjects));
          const store = this.accountConfiguratorStoreService;

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          store.setField('signerQuorum', signerQuorum);

          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();
          store.setField('multiSigningEnabled', hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               if (entries.length > 0) store.setField('signers', entries);
               else store.setField('signers', [{ Account: '', seed: '', SignerWeight: 1 }]);
          } else {
               store.setField('signers', [{ Account: '', seed: '', SignerWeight: 1 }]);
          }

          this.setRegularKeyProperties(accountInfo);
     }

     public refreshUiStateAccountConfigure(wallet: xrpl.Wallet, env: any): void {
          this.setRegularKeyProperties(env.accountInfo);
          this.setDepositAuth(env);
          this.setNfTokenMinter(env);
          this.refreshUiAccountMetaData(env.accountInfo?.result?.account_data);
     }

     private setNfTokenMinter(env: any) {
          const nftTokenMinter = env.accountInfo?.result?.account_data.NFTokenMinter;
          this.setNfTokenMinterProperties(nftTokenMinter);
     }

     private setDepositAuth(env: any) {
          const preAuthAccounts = this.utilsService.findDepositPreauthObjects(env.accountObjects);
          const hasPreAuthAccounts = preAuthAccounts?.length > 0;
          this.setDepositAuthProperties(hasPreAuthAccounts, preAuthAccounts);
     }

     setRegularKeyProperties(accountInfo: any) {
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          const store = this.accountConfiguratorStoreService;
          store.setField('regularKeySigningEnabled', hasRegularKey);
          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };
          store.setField('regularKeyAddress', rkProps.regularKeyAddress);
          store.setField('regularKeySeed', rkProps.regularKeySeed);
     }

     public setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          const store = this.accountConfiguratorStoreService;
          store.setField('signers', signerEntries);
          store.setField('multiSignAddress', signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          store.setField('multiSignSeeds', signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     public clearMultiSignersConfiguration(): void {
          const store = this.accountConfiguratorStoreService;
          store.setField('signerQuorum', 1);
          store.setField('signers', [{ Account: '', seed: '', SignerWeight: 1 }]);
          store.setField('multiSignAddress', 'No Multi-Sign address configured for account');
          store.setField('multiSignSeeds', '');
          this.storageService.removeValue('signerEntries');
     }

     setDepositAuthProperties(hasPreAuthAccounts: boolean, preAuthAccounts: string[]): void {
          const store = this.accountConfiguratorStoreService;
          if (hasPreAuthAccounts) {
               store.setField(
                    'depositAuthAddresses',
                    preAuthAccounts.map(a => ({ account: a }))
               );
               store.setField('isdepositAuthAddress', true);
               store.setField('depositAuthEnabled', true);
               return;
          }

          store.setField('depositAuthAddresses', [{ account: '' }]);
          store.setField('isdepositAuthAddress', false);
          store.setField('depositAuthEnabled', false);
          this.storageService.removeValue('depositAuthEntries');
     }

     setNfTokenMinterProperties(nftTokenMinter: string | undefined): void {
          const store = this.accountConfiguratorStoreService;
          if (nftTokenMinter) {
               store.setField('isAuthorizedNFTokenMinter', false);
               store.setField('isNFTokenMinterEnabled', true);
               store.setField('nfTokenMinterAddress', nftTokenMinter);
          } else {
               store.setField('isAuthorizedNFTokenMinter', false);
               store.setField('isNFTokenMinterEnabled', false);
               store.setField('nfTokenMinterAddress', '');
          }
     }

     refreshUiAccountMetaData(accountData: any): void {
          this.clearUiIAccountMetaData();
          const { TickSize, TransferRate, Domain, MessageKey } = accountData;
          const hasMetaData = TickSize || TransferRate || Domain || MessageKey;
          const store = this.accountConfiguratorStoreService;
          if (hasMetaData) {
               store.setField('isUpdateMetaData', true);
               this.refreshUiIAccountMetaData(accountData);
          } else {
               store.setField('isUpdateMetaData', false);
          }
     }

     async refreshUiIAccountMetaData(accountInfo: any) {
          const { TickSize, TransferRate, Domain, MessageKey } = accountInfo;
          const store = this.accountConfiguratorStoreService;
          store.setField('tickSize', TickSize || '');
          store.setField('transferRate', TransferRate ? ((TransferRate / 1_000_000_000 - 1) * 100).toFixed(3) : '');
          store.setField('domain', Domain ? this.utilsService.decodeHex(Domain) : '');
          store.setField('isMessageKey', !!MessageKey);
     }

     clearUiIAccountMetaData() {
          const store = this.accountConfiguratorStoreService;
          store.setField('tickSize', '');
          store.setField('transferRate', '');
          store.setField('domain', '');
          store.setField('isMessageKey', false);
     }
}
