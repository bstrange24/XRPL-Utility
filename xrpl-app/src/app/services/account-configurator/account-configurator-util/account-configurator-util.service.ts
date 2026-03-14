import { computed, inject, Injectable, signal } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';
import { AccountConfiguratorStoreService } from '../account-configurator-store/Account-configurator-store.service';
import { XRPL_ACCOUNT_FLAGS_CONFIG } from '../../../components/account-configurator/constants/account-configurator.flags';
import { ACCOUNT_CONFIG_TAB_META, ACCOUNT_CONFIG_TABS } from '../../../components/account-configurator/constants/account-configurator.ui';
import { AccountConfigAction, XrplAccountFlags } from '../../../components/account-configurator/constants/account-configurator.types';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorUtilService extends PerformanceBaseComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly toastService = inject(ToastService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);

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

          const type = this.accountConfiguratorStoreService.get('configurationType') || '';
          const configActions: Record<string, () => void> = {
               holder: () => this.setHolder(),
               exchanger: () => this.setExchanger(),
               issuer: () => this.setIssuer(),
          };

          configActions[type]?.();
          this.updateFlagTotal();

          console.log('Configuration changed to:', this.accountConfiguratorStoreService.get('configurationType'));
     }

     private buildTxLabel(defaultText: string) {
          return computed(() => {
               const step = this.txUiService.currentStep();
               if (step === 'idle') return defaultText;
               if (step === 'waiting_validation') return 'Waiting for confirmation...';
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

     buildSuccessMessage(type: AccountConfigAction, formValues: any, extra: any): string {
          if (type === 'modifyMetaData') {
               if (extra?.enableNftMinter === 'Y') {
                    return `Successfully Set NFT Minter ${formValues.nfTokenMinterAddress ? formValues.nfTokenMinterAddress : ''}`;
               } else {
                    return `Successfully Remove NFT Minter`;
               }
          }
          if (type === 'modifyRegularKey') {
               if (extra?.enableRegularKeyFlag === 'Y') {
                    return `Successfully Set Regular Key ${formValues.regularKeyAddress}`;
               } else {
                    return `Successfully Remove Regular Key ${formValues.regularKeyAddress ? formValues.regularKeyAddress : ''}`;
               }
          }
          if (type === 'updateMetaData') {
               return `Successfully Updated Account Meta Data`;
          }

          return `Successfully Cancelled Time Based Escrow ${formValues.escrowSequenceNumberField}`;
     }

     handleSimulationSuccess(type: AccountConfigAction, formValues: any, hash?: string, extra?: any) {
          let msg: string;

          if (type === 'modifyMetaData') {
               const address = formValues.nfTokenMinterAddress ?? '';
               msg = extra?.enableNftMinter === 'Y' ? `Simulated Setting NFT Minter ${address}` : `Simulated Removing NFT Minter ${address}`;
          } else if (type === 'modifyRegularKey') {
               if (extra?.enableRegularKeyFlag === 'Y') {
                    msg = `Simulated Setting Regular Key ${formValues.regularKeyAddress}`;
               } else {
                    msg = `Simulated Removing Regular Key ${formValues.regularKeyAddress ? formValues.regularKeyAddress : ''}`;
               }
          } else {
               msg = `Simulated Updating Account Meta Data`;
          }

          this.txUiService.resetCurrentStepToIdle();
          this.toastService.success(msg, AppConstants.TOAST.SUCCESS, false, hash, this.txUiService.explorerUrl() + 'tx/');

          return { success: true, hash };
     }

     validateQuorum() {
          const totalWeight = this.accountConfiguratorStoreService.get('signers').reduce((sum: any, s: { SignerWeight: any }) => sum + (s.SignerWeight || 0), 0);
          const quorum = this.accountConfiguratorStoreService.get('signerQuorum');
          if (quorum > totalWeight) {
               this.accountConfiguratorStoreService.set('signerQuorum', Math.floor(totalWeight));
          }
     }

     validateQuorum1() {
          const totalWeight = this.accountConfiguratorStoreService.get('signers').reduce((sum: any, s: { SignerWeight: any }) => sum + (s.SignerWeight || 0), 0);
          if (this.accountConfiguratorStoreService.get('signerQuorum') > totalWeight) {
               this.accountConfiguratorStoreService.set('signerQuorum', Math.floor(totalWeight));
          }
     }

     addSigner() {
          this.accountConfiguratorStoreService.addSigner({
               Account: '',
               seed: '',
               SignerWeight: 1,
          });
     }

     removeSigner(index: number) {
          this.accountConfiguratorStoreService.removeSigner(index);
     }

     addDepositAuthAddresses() {
          this.accountConfiguratorStoreService.addDepositAuthAddress({
               Account: '',
               seed: '',
               SignerWeight: 1,
          });
     }

     removeDepositAuthAddresses(index: number) {
          this.accountConfiguratorStoreService.removeDepositAuthAddress(index);
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
          return !!(this.accountConfiguratorStoreService.get('tickSize') || this.accountConfiguratorStoreService.get('transferRate') || (this.accountConfiguratorStoreService.get('isMessageKey') && env.wallet.publicKey) || (this.accountConfiguratorStoreService.get('domain') && this.accountConfiguratorStoreService.get('domain').trim() !== ''));
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
               .get('signers')
               .filter((s: { Account: any; SignerWeight: number }) => s.Account && s.SignerWeight > 0)
               .map((s: { Account: any; SignerWeight: any; seed: any }) => ({
                    Account: s.Account,
                    SignerWeight: Number(s.SignerWeight),
                    seed: s.seed,
               }));
     }

     createDepsoitAuthEntries() {
          return this.accountConfiguratorStoreService
               .get('depositAuthAddresses')
               .filter((s: { account: any }) => s.account)
               .map((s: { account: any }) => ({
                    Account: s.account,
               }));
     }

     clearUiIAccountMetaData() {
          this.accountConfiguratorStoreService.set('tickSize', '');
          this.accountConfiguratorStoreService.set('transferRate', '');
          this.accountConfiguratorStoreService.set('domain', '');
          this.accountConfiguratorStoreService.set('isMessageKey', false);
     }

     toggleMessageKey() {
          if (this.accountConfiguratorStoreService.get('isMessageKey')) {
               this.accountConfiguratorStoreService.set('isMessageKey', false);
          } else {
               this.accountConfiguratorStoreService.set('isMessageKey', true);
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

          this.txUiService.totalFlagsValue.set(sum);
          this.txUiService.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     preventNegative(event: KeyboardEvent): void {
          if (event.key === '-' || event.key === 'e') {
               event.preventDefault();
          }
     }
}
