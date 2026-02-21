import { Injectable, signal, inject } from '@angular/core';
import { XrplTransactionService } from '../../services/xrpl-transactions/xrpl-transaction.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { StorageService } from '../../services/local-storage/storage.service';
import { TransactionUiService } from '../../services/transaction-ui/transaction-ui.service';
import { DownloadUtilService } from '../../services/download-util/download-util.service';
import { CopyUtilService } from '../../services/copy-util/copy-util.service';
import { WalletManagerService } from '../../services/wallets/manager/wallet-manager.service';
import { TrustlineCurrencyService } from '../../services/trustline-currency/trustline-currency.service';
import { ToastService } from '../../services/toast/toast.service';
import { XrplTransactionExecutorService } from '../../services/xrpl-transaction-executor/xrpl-transaction-executor.service';
import * as xrpl from 'xrpl';
import { PerformanceBaseComponent } from '../../components/base/performance-base/performance-base.component';

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

     hasSignerList = signal<boolean>(false);

     refreshUiState(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.txUiService.regularKeySigningEnabled.set(hasRegularKey);

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.txUiService.multiSigningEnabled.set(hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.txUiService.signers.set(entries);
          }

          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

          this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);
     }

     public refreshUiState1(wallet: xrpl.Wallet, accountInfo: any, accountObjects: any): void {
          // Update multi-sign & regular key flags
          const hasRegularKey = !!accountInfo.result.account_data.RegularKey;
          this.txUiService.regularKeySigningEnabled.set(hasRegularKey);
          const nftTokenMinter = accountInfo?.result?.account_data.NFTokenMinter;

          // Update service state
          this.txUiService.ticketArray.set(this.utilsService.getAccountTickets(accountObjects));

          const { signerAccounts, signerQuorum } = this.utilsService.checkForSignerAccounts(accountObjects);
          const hasSignerList = signerAccounts?.length > 0;
          this.hasSignerList.set(hasSignerList);
          this.txUiService.signerQuorum.set(signerQuorum);
          const checkForMultiSigner = signerAccounts?.length > 0;
          checkForMultiSigner ? this.setupMultiSignersConfiguration(wallet) : this.clearMultiSignersConfiguration();

          this.txUiService.multiSigningEnabled.set(hasSignerList);
          if (hasSignerList) {
               const entries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
               this.txUiService.signers.set(entries);
          }

          const rkProps = this.utilsService.setRegularKeyProperties(accountInfo.result.account_data.RegularKey, accountInfo.result.account_data.Account) || { regularKeyAddress: '', regularKeySeed: '' };

          this.txUiService.regularKeyAddress.set(rkProps.regularKeyAddress);
          this.txUiService.regularKeySeed.set(rkProps.regularKeySeed);

          const preAuthAccounts = this.utilsService.findDepositPreauthObjects(accountObjects);
          const hasPreAuthAccounts = preAuthAccounts?.length > 0;
          this.setDepositAuthProperties(hasPreAuthAccounts, preAuthAccounts);

          // === NFT Minter ===
          this.setNfTokenMinterProperties(nftTokenMinter);

          this.refreshUiAccountMetaData(accountInfo?.result?.account_data);
     }

     public setupMultiSignersConfiguration(wallet: xrpl.Wallet): void {
          const signerEntries = this.storageService.get(`${wallet.classicAddress}signerEntries`) || [];
          this.txUiService.signers.set(signerEntries);
          this.txUiService.multiSignAddress.set(signerEntries.map((e: { Account: any }) => e.Account).join(',\n'));
          this.txUiService.multiSignSeeds.set(signerEntries.map((e: { seed: any }) => e.seed).join(',\n'));
     }

     public clearMultiSignersConfiguration(): void {
          this.txUiService.signerQuorum.set(0);
          this.txUiService.multiSignAddress.set('No Multi-Sign address configured for account');
          this.txUiService.multiSignSeeds.set('');
          this.storageService.removeValue('signerEntries');
     }

     private setDepositAuthProperties(hasPreAuthAccounts: boolean, preAuthAccounts: string[]): void {
          if (hasPreAuthAccounts) {
               console.debug('preAuthAccounts:', preAuthAccounts);
               this.txUiService.depositAuthAddresses.set(preAuthAccounts.map(a => ({ account: a })));
               this.txUiService.isdepositAuthAddress.set(true);
               this.txUiService.depositAuthEnabled.set(true);
          } else {
               this.txUiService.depositAuthAddresses.set([{ account: '' }]);
               this.txUiService.isdepositAuthAddress.set(false);
               this.txUiService.depositAuthEnabled.set(false);
          }
     }

     private setNfTokenMinterProperties(nftTokenMinter: string | undefined): void {
          if (nftTokenMinter) {
               this.txUiService.isAuthorizedNFTokenMinter.set(false); // stays false until verified externally
               this.txUiService.isNFTokenMinterEnabled.set(true);
               this.txUiService.nfTokenMinterAddress.set(nftTokenMinter);
          } else {
               this.txUiService.isAuthorizedNFTokenMinter.set(false);
               this.txUiService.isNFTokenMinterEnabled.set(false);
               this.txUiService.nfTokenMinterAddress.set('');
          }
     }

     private refreshUiAccountMetaData(accountData: any): void {
          this.clearUiIAccountMetaData();
          const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountData;

          const hasMetaData = TickSize || TransferRate || Domain || MessageKey || EmailHash;
          if (hasMetaData) {
               this.txUiService.isUpdateMetaData.set(true);
               this.refreshUiIAccountMetaData(accountData);
          } else {
               this.txUiService.isUpdateMetaData.set(false);
               if (!EmailHash) {
                    this.txUiService.userEmail.set('');
                    this.txUiService.avatarUrl.set('');
               }
          }
     }

     async refreshUiIAccountMetaData(accountInfo: any) {
          const { TickSize, TransferRate, Domain, MessageKey, EmailHash } = accountInfo;
          this.txUiService.tickSize.set(TickSize || '');
          this.txUiService.transferRate.set(TransferRate ? ((TransferRate / 1_000_000_000 - 1) * 100).toFixed(3) : '');
          this.txUiService.domain.set(Domain ? this.utilsService.decodeHex(Domain) : '');
          this.txUiService.isMessageKey.set(!!MessageKey);
          this.txUiService.userEmail.set(EmailHash || '');
     }

     clearUiIAccountMetaData() {
          this.txUiService.tickSize.set('');
          this.txUiService.transferRate.set('');
          this.txUiService.domain.set('');
          this.txUiService.isMessageKey.set(false);
     }
}
