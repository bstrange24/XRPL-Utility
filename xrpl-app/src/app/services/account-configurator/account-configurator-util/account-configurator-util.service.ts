import { computed, inject, Injectable } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../utils/toast/toast.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { XRPL_ACCOUNT_FLAGS_CONFIG } from '../../../components/account-configurator/constants/account-configurator.flags';
import { ACCOUNT_CONFIG_TAB_META, ACCOUNT_CONFIG_TABS } from '../../../components/account-configurator/constants/account-configurator.ui';
import { AccountConfig, XrplAccountFlags } from '../../../components/account-configurator/constants/account-configurator.types';
import { AccountConfiguratorStoreService } from '../account-configurator-store/account-configurator-store.service';
import { StorageService } from '../../local-storage/storage.service';
import { AccountConfiguratorOrchestratorService } from '../account-configurator-orchestrator/account-configurator-orchestrator.service';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly storageService = inject(StorageService);
     public readonly accountConfiguratorOrchestratorService = inject(AccountConfiguratorOrchestratorService);

     constructor() {
          super();
     }

     readonly modifyAccountFlagsSpecificKeys = [] as const;
     readonly modifyNftMinterSpecificKeys = ['nfTokenMinterAddress'] as const;
     readonly updateMetaDataSpecificKeys = ['tickSize', 'transferRate', 'domain', 'isMessageKey'] as const;
     readonly modifyRegularKeySpecificKeys = ['regularKeyAddress', 'regularKeySeed'] as const;
     readonly modifyMultiSignSpecificKeys = ['signerQuorum'] as const;
     readonly modifyDepositAuthSpecificKeys = [] as const;
     readonly accountFlagsConfig = XRPL_ACCOUNT_FLAGS_CONFIG;
     readonly accountConfigTabs = ACCOUNT_CONFIG_TABS;
     readonly accountConfigTabsMeta = ACCOUNT_CONFIG_TAB_META;

     readonly FLAG_VALUES = xrpl.AccountSetAsfFlags;
     flags: XrplAccountFlags = {
          asfRequireDest: false,
          asfRequireAuth: false,
          asfDisallowXRP: false,
          asfDisableMaster: false,
          asfNoFreeze: false,
          asfGlobalFreeze: false,
          asfDefaultRipple: false,
          asfDepositAuth: false,
          asfAuthorizedNFTokenMinter: false,
          asfDisallowIncomingNFTokenOffer: false,
          asfDisallowIncomingCheck: false,
          asfDisallowIncomingPayChan: false,
          asfDisallowIncomingTrustline: false,
          asfAllowTrustLineClawback: false,
          asfAllowTrustLineLocking: false,
     };

     onConfigurationChange() {
          this.resetFlags();

          const type = this.accountConfiguratorStoreService.configurationType() || '';
          const configActions: Record<string, () => void> = {
               holder: () => this.setHolder(),
               exchanger: () => this.setExchanger(),
               issuer: () => this.setIssuer(),
          };

          configActions[type]?.();
          this.updateFlagTotal();

          console.log('Configuration changed to:', this.accountConfiguratorStoreService.configurationType());
     }

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for ledger validation...';
               return this.txUiService.stepMessage();
          });
     }

     readonly setMultiSignButtonLabel = this.buildTxLabel('Set Multi-Sign');
     readonly removeMultiSignButtonLabel = this.buildTxLabel('Remove Multi-Sign');
     readonly setRegularKeyButtonLabel = this.buildTxLabel('Set Regular Key');
     readonly removeRegularKeyButtonLabel = this.buildTxLabel('Remove Regular Key');
     readonly modifyAccountMetaDataButtonLabel = this.buildTxLabel('Modify Account Meta Data');
     readonly setDepositAuthButtonLabel = this.buildTxLabel('Set Deposit Authorization');
     readonly removeDepositAuthButtonLabel = this.buildTxLabel('Remove Deposit Authorization');
     readonly modifyAccountFlagsButtonLabel = this.buildTxLabel('Modify Account Flags');
     readonly setNftMinterButtonLabel = this.buildTxLabel('Set NFT Minter');
     readonly removeNftMinterButtonLabel = this.buildTxLabel('Remove NFT Minter');

     setAccountFlags(currentTab: string, env: PrepareTxEnvironmentResult) {
          if (currentTab === 'modifyAccountFlags') {
               AppConstants.FLAGS.forEach(flag => {
                    const flagKey = AppConstants.FLAGMAP[flag.name as keyof typeof AppConstants.FLAGMAP];
                    if (flagKey) {
                         if (env?.accountInfo) {
                              const isEnabled = !!this.accountConfiguratorStoreService.accountInfo()?.result.account_flags?.[flagKey as keyof typeof env.accountInfo.result.account_flags];
                              const flagName = flag.name as keyof XrplAccountFlags;
                              this.flags[flagName] = isEnabled;
                         }
                    }
               });
               this.updateFlagTotal();
          }
     }

     readonly actionHandlers: Record<string, (config: AccountConfig, enabled: string) => Promise<any>> = {
          modifyAccountFlags: config => this.handleModifyAccountFlags(config),
          modifyDepositAuth: (config, enabled) => this.handleModifyDepositAuth(config, enabled),
          modifyMetaData: (config, enabled) => this.handleModifyMetaData(config, enabled),
          modifyMultiSigners: (config, enabled) => this.handleModifyMultiSigners(config, enabled),
          modifyRegularKey: (config, enabled) => this.handleModifyRegularKey(config, enabled),
     };

     async handleModifyAccountFlags(config: AccountConfig) {
          const { setFlags, clearFlags } = this.utilsService.getFlagUpdates(config.preFetchedEnv?.accountInfo.result.account_flags);

          if (setFlags.length === 0 && clearFlags.length === 0) {
               this.toastService.info('No flag changes detected', AppConstants.TOAST.INFO);
               return;
          }

          const operations: Array<{ operation: 'SetFlag' | 'ClearFlag'; flagValue: string; flagName: string }> = [];

          setFlags.forEach(f => {
               operations.push({
                    operation: 'SetFlag',
                    flagValue: f,
                    flagName: this.utilsService.getFlagName(f),
               });
          });

          clearFlags.forEach(f => {
               operations.push({
                    operation: 'ClearFlag',
                    flagValue: f,
                    flagName: this.utilsService.getFlagName(f),
               });
          });
          config.setFlags = setFlags;
          config.clearFlags = clearFlags;
          config.operations = operations;

          return this.accountConfiguratorOrchestratorService.executeAccountSetFlagsTx('modifyAccountFlags', config);
     }

     async handleModifyDepositAuth(config: AccountConfig, enabled: string) {
          const entries = this.createDepsoitAuthEntries();
          const formatted = this.formatDepositAuthEntries(entries);

          if (!formatted.length) {
               this.toastService.error('Deposit Auth address list is empty', AppConstants.TOAST.ERROR);
               return;
          }

          config.depsositAuthEntries = entries;
          config.formattedDepsositAuthEntries = formatted;
          config.authorizeFlag = enabled;

          return this.accountConfiguratorOrchestratorService.executeDepositAuthTx('modifyDepositAuth', config);
     }

     private async handleModifyMetaData(config: AccountConfig, enabled: string): Promise<{ success: boolean; error?: string } | null> {
          try {
               // Enable or disable NFT minter
               if (enabled === 'Y' || enabled === 'N') {
                    config.enableNftMinter = enabled;

                    return await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyMetaData', config);
               }

               // Otherwise update metadata fields
               return await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('updateMetaData', config);
          } catch (err: any) {
               console.error('Error modifying metadata', err);

               this.toastService.error(err.message || 'Failed to modify metadata', AppConstants.TOAST.ERROR);

               return null;
          }
     }

     async handleModifyMultiSigners(config: AccountConfig, enabled: string) {
          const signerEntries = this.createSignerEntries();
          const formatted = this.formatSignerEntries(signerEntries);

          if (!formatted.length) {
               this.toastService.error('Multi Signer list is empty', AppConstants.TOAST.ERROR);
               return;
          }

          config.account.signerEntries = signerEntries;
          config.account.formattedSignerEntries = formatted;
          config.account.enableMultiSignFlag = enabled;
          console.log('config: ', config.account);

          return this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyMultiSigners', config);
     }

     private async handleModifyRegularKey(config: AccountConfig, enabled: string): Promise<{ success: boolean; error?: string } | null> {
          try {
               config.enableRegularKeyFlag = enabled;

               return await this.accountConfiguratorOrchestratorService.executeModifyAccountTx('modifyRegularKey', config);
          } catch (err: any) {
               console.error('Error modifying regular key', err);

               this.toastService.error(err.message || 'Failed to modify regular key', AppConstants.TOAST.ERROR);

               return null;
          }
     }

     handlePostSuccess(tab: string, config: AccountConfig, envRef: any) {
          const store = this.accountConfiguratorStoreService;
          const walletAddress = envRef.wallet.classicAddress;
          switch (tab) {
               case 'modifyMultiSigners':
                    if (config.account.enableMultiSignFlag === 'Y') {
                         const entries = config.account.signerEntries || [];
                         this.storageService.set(`${walletAddress}signerEntries`, entries);

                         store.setField('signers', entries);
                         store.setField('multiSignAddress', entries.map((e: { Account: any }) => e.Account).join(',\n'));
                         store.setField('multiSignSeeds', entries.map((e: { seed: any }) => e.seed || '').join(',\n'));
                         store.setField('multiSigningEnabled', true);
                         store.setField('signerQuorum', config.account.signerQuorum || 1);
                    } else {
                         this.storageService.removeValue(`${walletAddress}signerEntries`);
                         store.setField('signers', [{ Account: '', seed: '', SignerWeight: 1 }]);
                         store.setField('multiSignAddress', '');
                         store.setField('multiSignSeeds', '');
                         store.setField('multiSigningEnabled', false);
                         store.setField('signerQuorum', 1);
                    }
                    break;
               case 'modifyRegularKey': {
                    const regularKey = walletAddress + 'regularKey';
                    const regularKeySeed = walletAddress + 'regularKeySeed';

                    if (config.enableRegularKeyFlag === 'Y') {
                         this.storageService.set(regularKey, config.regularKeyAddress);
                         this.storageService.set(regularKeySeed, config.regularKeySeed);
                    } else {
                         store.setField('regularKeyAddress', '');
                         store.setField('regularKeySeed', '');

                         this.storageService.removeValue(regularKey);
                         this.storageService.removeValue(regularKeySeed);
                    }
                    break;
               }
          }
     }

     validateQuorum() {
          const totalWeight = this.accountConfiguratorStoreService.signers().reduce((sum: any, s: { SignerWeight: any }) => sum + (s.SignerWeight || 0), 0);
          const quorum = this.accountConfiguratorStoreService.signerQuorum();
          if (quorum > totalWeight) {
               const store = this.accountConfiguratorStoreService;
               store.setField('signerQuorum', Math.floor(quorum));
          }
     }

     validateQuorum1() {
          const totalWeight = this.accountConfiguratorStoreService.signers().reduce((sum: any, s: { SignerWeight: any }) => sum + (s.SignerWeight || 0), 0);
          if (this.accountConfiguratorStoreService.signerQuorum() > totalWeight) {
               const store = this.accountConfiguratorStoreService;
               store.setField('signerQuorum', Math.floor(totalWeight));
          }
     }

     addSigner() {
          const store = this.accountConfiguratorStoreService;
          store.addSigner({
               Account: '',
               seed: '',
               SignerWeight: 1,
          });
     }

     removeSigner(index: number) {
          const store = this.accountConfiguratorStoreService;
          store.removeSigner(index);
     }

     addDepositAuthAddresses() {
          const store = this.accountConfiguratorStoreService;
          store.addDepositAuthAddress({
               Account: '',
               SignerWeight: 1,
          });
     }

     removeDepositAuthAddresses(index: number) {
          const store = this.accountConfiguratorStoreService;
          store.removeDepositAuthAddress(index);
     }

     onNoFreezeChange() {
          if (this.flags.asfNoFreeze) {
               alert('Prevent Freezing Trust Lines (No Freeze) cannot be unset!');
          }
     }

     onClawbackChange() {
          if (this.flags.asfAllowTrustLineClawback) {
               alert('Trust Line Clawback cannot be unset!');
          }
     }

     hasFieldsToUpdate(env: PrepareTxEnvironmentResult): boolean {
          return !!(this.accountConfiguratorStoreService.tickSize() || this.accountConfiguratorStoreService.transferRate() || (this.accountConfiguratorStoreService.isMessageKey() && env.wallet.publicKey) || (this.accountConfiguratorStoreService.domain() && this.accountConfiguratorStoreService.domain().trim() !== ''));
     }

     formatSignerEntries(signerEntries: { Account: string; SignerWeight: number; seed: string }[]) {
          return signerEntries.map(entry => ({
               SignerEntry: {
                    Account: entry.Account,
                    SignerWeight: entry.SignerWeight,
               },
          }));
     }

     formatDepositAuthEntries(signerEntries: { Account: string }[]) {
          return signerEntries.map(entry => ({
               SignerEntry: {
                    Account: entry.Account,
               },
          }));
     }

     createSignerEntries() {
          return this.accountConfiguratorStoreService
               .signers()
               .filter((s: { Account: any; SignerWeight: number }) => s.Account && s.SignerWeight > 0)
               .map((s: { Account: any; SignerWeight: any; seed: any }) => ({
                    Account: s.Account,
                    SignerWeight: Number(s.SignerWeight),
                    seed: s.seed,
               }));
     }

     createDepsoitAuthEntries() {
          return this.accountConfiguratorStoreService
               .depositAuthAddresses()
               .filter((s: { account: any }) => s.account)
               .map((s: { account: any }) => ({
                    Account: s.account,
               }));
     }

     clearUiIAccountMetaData() {
          const store = this.accountConfiguratorStoreService;
          store.setField('tickSize', '');
          store.setField('transferRate', '');
          store.setField('domain', '');
          store.setField('isMessageKey', false);
     }

     toggleMessageKey() {
          const store = this.accountConfiguratorStoreService;
          if (this.accountConfiguratorStoreService.isMessageKey()) {
               store.setField('isMessageKey', false);
          } else {
               store.setField('isMessageKey', true);
          }
     }

     resetFlags() {
          Object.keys(this.flags).forEach(key => (this.flags[key as keyof XrplAccountFlags] = false));

          ['domainField', 'transferRateField', 'tickSizeField'].forEach(id => {
               const elem = document.getElementById(id) as HTMLInputElement | null;
               if (elem) elem.value = '';
          });
     }

     setHolder() {
          // Update flags for Holder configuration
          this.flags.asfRequireDest = false;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = false;
          this.flags.asfDepositAuth = false;
          this.flags.asfAllowTrustLineClawback = false;
          this.flags.asfDisallowIncomingNFTokenOffer = false;
          this.flags.asfDisallowIncomingCheck = false;
          this.flags.asfDisallowIncomingPayChan = false;
          this.flags.asfDisallowIncomingTrustline = false;
     }

     setExchanger() {
          // Update flags for Exchanger configuration
          this.flags.asfRequireDest = true;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = true;
          this.flags.asfDepositAuth = false;
          this.flags.asfAuthorizedNFTokenMinter = false;
          this.flags.asfDisallowIncomingNFTokenOffer = true;
          this.flags.asfDisallowIncomingCheck = false;
          this.flags.asfDisallowIncomingPayChan = true;
          this.flags.asfDisallowIncomingTrustline = false;
          this.flags.asfAllowTrustLineClawback = false;
          this.flags.asfAllowTrustLineLocking = false;
     }

     setIssuer() {
          // Update flags for Issuer configuration
          this.flags.asfRequireDest = false;
          this.flags.asfRequireAuth = false;
          this.flags.asfDisallowXRP = false;
          this.flags.asfDisableMaster = false;
          this.flags.asfNoFreeze = false;
          this.flags.asfGlobalFreeze = false;
          this.flags.asfDefaultRipple = true;
          this.flags.asfDepositAuth = false;
          this.flags.asfAuthorizedNFTokenMinter = false;
          this.flags.asfDisallowIncomingNFTokenOffer = true;
          this.flags.asfDisallowIncomingCheck = true;
          this.flags.asfDisallowIncomingPayChan = true;
          this.flags.asfDisallowIncomingTrustline = false;
          this.flags.asfAllowTrustLineClawback = true;
          this.flags.asfAllowTrustLineLocking = true;
     }

     getFlagNames(results: any): string {
          return results
               .map((r: any) =>
                    r.flagName
                         .replace(/^asf/, '')
                         .replaceAll(/([A-Z])/g, ' $1')
                         .replaceAll(/\bN F T\b/g, 'NFT')
                         .replaceAll(/\bI O U\b/g, 'IOU')
                         .replaceAll(/\bX R P\b/g, 'XRP')
                         .trim()
               )
               .join(' - ');
     }

     toggleFlag(key: 'asfRequireDest' | 'asfRequireAuth' | 'asfDisallowXRP' | 'asfDisableMaster' | 'asfNoFreeze' | 'asfGlobalFreeze' | 'asfDefaultRipple' | 'asfDepositAuth' | 'asfAuthorizedNFTokenMinter' | 'asfDisallowIncomingNFTokenOffer' | 'asfDisallowIncomingCheck' | 'asfDisallowIncomingPayChan' | 'asfDisallowIncomingTrustline' | 'asfAllowTrustLineClawback' | 'asfAllowTrustLineLocking') {
          this.flags[key] = !this.flags[key];
          this.updateFlagTotal();
     }

     updateFlagTotal() {
          let sum = 0;
          (Object.keys(this.flags) as (keyof typeof this.flags)[]).forEach(key => {
               if (this.flags[key]) {
                    sum |= 1 << this.FLAG_VALUES[key];
               }
          });

          this.accountConfiguratorStoreService.setField('totalFlagsValue', sum);
          this.accountConfiguratorStoreService.setField('totalFlagsHex', '0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     preventNegative(event: KeyboardEvent): void {
          if (event.key === '-' || event.key === 'e') {
               event.preventDefault();
          }
     }
}
