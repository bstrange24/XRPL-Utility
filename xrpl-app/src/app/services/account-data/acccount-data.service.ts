import { Injectable, signal, inject } from '@angular/core';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import * as xrpl from 'xrpl';
import { TrustlineCurrencyService } from '../trustline-currency/trustline-util/trustline-currency.service';
import { PerformanceBaseComponent } from '../../components/shared/performance-base/performance-base.component';
import { AccountConfiguratorStoreService } from '../account-configurator/account-configurator-store/account-configurator-store.service';

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

     hasSignerList = signal<boolean>(false);

     refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.accountConfiguratorStoreService.set('signerQuorum', signerQuorum);

          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();
          this.accountConfiguratorStoreService.set('multiSigningEnabled', hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.accountConfiguratorStoreService.set('signers', entries);
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
          this.accountConfiguratorStoreService.set('regularKeySigningEnabled', hasRegularKey);
          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };
          console.log('rkProps: ', rkProps);
          this.accountConfiguratorStoreService.set('regularKeyAddress', rkProps.regularKeyAddress);
          this.accountConfiguratorStoreService.set('regularKeySeed', rkProps.regularKeySeed);
     }

     public setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          this.accountConfiguratorStoreService.set('signers', signerEntries);
          this.accountConfiguratorStoreService.set('multiSignAddress', signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          this.accountConfiguratorStoreService.set('multiSignSeeds', signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     public clearMultiSignersConfiguration(): void {
          this.accountConfiguratorStoreService.set('signerQuorum', 0);
          this.accountConfiguratorStoreService.set('signers', [{ Account: '', seed: '', SignerWeight: 1 }]);
          this.accountConfiguratorStoreService.set('multiSignAddress', 'No Multi-Sign address configured for account');
          this.accountConfiguratorStoreService.set('multiSignSeeds', '');
          this.storageService.removeValue('signerEntries');
     }

     setDepositAuthProperties(hasPreAuthAccounts: boolean, preAuthAccounts: string[]): void {
          if (hasPreAuthAccounts) {
               this.accountConfiguratorStoreService.set(
                    'depositAuthAddresses',
                    preAuthAccounts.map(a => ({ account: a }))
               );
               this.accountConfiguratorStoreService.set('isdepositAuthAddress', true);
               this.accountConfiguratorStoreService.set('depositAuthEnabled', true);
               return;
          }

          this.accountConfiguratorStoreService.set('depositAuthAddresses', [{ account: '' }]);
          this.accountConfiguratorStoreService.set('isdepositAuthAddress', false);
          this.accountConfiguratorStoreService.set('depositAuthEnabled', false);
          this.storageService.removeValue('depositAuthEntries');
     }

     setNfTokenMinterProperties(nftTokenMinter: string | undefined): void {
          if (nftTokenMinter) {
               this.accountConfiguratorStoreService.set('isAuthorizedNFTokenMinter', false);
               this.accountConfiguratorStoreService.set('isNFTokenMinterEnabled', true);
               this.accountConfiguratorStoreService.set('nfTokenMinterAddress', nftTokenMinter);
          } else {
               this.accountConfiguratorStoreService.set('isAuthorizedNFTokenMinter', false);
               this.accountConfiguratorStoreService.set('isNFTokenMinterEnabled', false);
               this.accountConfiguratorStoreService.set('nfTokenMinterAddress', '');
          }
     }

     refreshUiAccountMetaData(accountData: any): void {
          this.clearUiIAccountMetaData();
          const { TickSize, TransferRate, Domain, MessageKey } = accountData;
          const hasMetaData = TickSize || TransferRate || Domain || MessageKey;
          if (hasMetaData) {
               this.accountConfiguratorStoreService.set('isUpdateMetaData', true);
               this.refreshUiIAccountMetaData(accountData);
          } else {
               this.accountConfiguratorStoreService.set('isUpdateMetaData', false);
          }
     }

     async refreshUiIAccountMetaData(accountInfo: any) {
          const { TickSize, TransferRate, Domain, MessageKey } = accountInfo;
          this.accountConfiguratorStoreService.set('tickSize', TickSize || '');
          this.accountConfiguratorStoreService.set('transferRate', TransferRate ? ((TransferRate / 1_000_000_000 - 1) * 100).toFixed(3) : '');
          this.accountConfiguratorStoreService.set('domain', Domain ? this.utilsService.decodeHex(Domain) : '');
          this.accountConfiguratorStoreService.set('isMessageKey', !!MessageKey);
     }

     clearUiIAccountMetaData() {
          this.accountConfiguratorStoreService.set('tickSize', '');
          this.accountConfiguratorStoreService.set('transferRate', '');
          this.accountConfiguratorStoreService.set('domain', '');
          this.accountConfiguratorStoreService.set('isMessageKey', false);
     }
}
