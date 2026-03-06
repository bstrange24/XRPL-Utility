import { computed, Injectable, signal } from '@angular/core';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';
import { ToastService } from '../../toast/toast.service';
import { AccountConfigTxType } from '../account-configurator-orchestrator/account-configurator-orchestrator.service';
import { PrepareTxEnvironmentResult } from '../../transaction-environment/tx-environment.service';

export interface XrplAccountFlags {
     asfRequireDest: boolean;
     asfRequireAuth: boolean;
     asfDisallowXRP: boolean;
     asfDisableMaster: boolean;
     asfNoFreeze: boolean;
     asfGlobalFreeze: boolean;
     asfDefaultRipple: boolean;
     asfDepositAuth: boolean;
     asfAuthorizedNFTokenMinter: boolean;
     asfDisallowIncomingNFTokenOffer: boolean;
     asfDisallowIncomingCheck: boolean;
     asfDisallowIncomingPayChan: boolean;
     asfDisallowIncomingTrustline: boolean;
     asfAllowTrustLineClawback: boolean;
     asfAllowTrustLineLocking: boolean;
}

type AccountConfigTxDisplayType = 'modifyAccountFlags' | 'modifyMetaData' | 'modifyDepositAuth' | 'modifyMultiSigners' | 'modifyRegularKey';

@Injectable({
     providedIn: 'root',
})
export class AccountConfiguratorUtilService extends PerformanceBaseComponent {
     constructor(
          public readonly txUiService: TransactionUiService,
          public readonly utilsService: UtilsService,
          private readonly toastService: ToastService
     ) {
          super();
     }

     hasSignerList = signal<boolean>(false);
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
     accountFlagsConfig = [
          {
               key: 'asfRequireDest',
               title: 'Require Destination Tag',
               desc: 'Require a destination tag to send transactions to this account.',
          },
          {
               key: 'asfRequireAuth',
               title: 'Require Trust Line Auth',
               desc: 'Require authorization for users to hold balances issued by this address can only be enabled if the address has no trust lines connected to it.',
          },
          {
               key: 'asfDisallowXRP',
               title: 'Disallow XRP',
               desc: 'XRP should not be sent to this account.',
          },
          {
               key: 'asfDisableMaster',
               title: 'Disable Master Key',
               desc: 'Disallow use of the master key pair. Can only be enabled if the account has configured another way to sign transactions, such as a Regular Key or a Signer List.',
          },
          {
               key: 'asfNoFreeze',
               title: 'No Freeze',
               desc: 'Permanently give up the ability to freeze individual trust lines or disable Global Freeze. This flag can never be disabled after being enabled.',
          },
          {
               key: 'asfGlobalFreeze',
               title: 'Global Freeze',
               desc: 'Freeze all assets issued by this account.',
          },
          {
               key: 'asfDefaultRipple',
               title: 'Default Ripple',
               desc: "Enable rippling on this account's trust lines by default.",
          },
          {
               key: 'asfDepositAuth',
               title: 'Deposit Authorization',
               desc: 'Enable Deposit Authorization on this account.',
          },
          {
               key: 'asfAuthorizedNFTokenMinter',
               title: 'Authorized NFToken Minter',
               desc: 'Allow another account to mint and burn tokens on behalf of this account.',
          },
          {
               key: 'asfDisallowIncomingNFTokenOffer',
               title: 'Disallow Incoming NFToken Offer',
               desc: 'Disallow other accounts from creating incoming NFTOffers.',
          },
          {
               key: 'asfDisallowIncomingCheck',
               title: 'Disallow Incoming Check',
               desc: 'Disallow other accounts from creating incoming Checks.',
          },
          {
               key: 'asfDisallowIncomingPayChan',
               title: 'Disallow Incoming Payment Channel',
               desc: 'Disallow other accounts from creating incoming PayChannels.',
          },
          {
               key: 'asfDisallowIncomingTrustline',
               title: 'Disallow Incoming Trustline',
               desc: 'Disallow other accounts from creating incoming Trustlines.',
          },
          {
               key: 'asfAllowTrustLineClawback',
               title: 'Allow TrustLine Clawback',
               desc: 'Permanently gain the ability to claw back issued IOUs.',
          },
          {
               key: 'asfAllowTrustLineLocking',
               title: 'Allow TrustLine Locking',
               desc: 'Issuers allow their IOUs to be used as escrow amounts.',
          },
     ] as const;

     readonly tabs: {
          key: AccountConfigTxDisplayType;
          label: string;
          icon: string;
          color: string;
          iconSize: string;
     }[] = [
          {
               key: 'modifyAccountFlags',
               label: 'Account Flags',
               icon: 'heroArrowPath',
               color: 'green',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'modifyMetaData',
               label: 'Meta Data',
               icon: 'heroArrowPath',
               color: 'green',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'modifyDepositAuth',
               label: 'Deposit Auth',
               icon: 'heroArrowPath',
               color: 'green',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'modifyMultiSigners',
               label: 'Multi-Sign',
               icon: 'heroPlusCircle',
               color: 'green',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
          {
               key: 'modifyRegularKey',
               label: 'Regular Key',
               icon: 'heroPlusCircle',
               color: 'green',
               iconSize: AppConstants.TAB_ICON_SIZE,
          },
     ];

     readonly tabMeta = {
          modifyAccountFlags: {
               icon: 'heroArrowPath',
               colorClass: 'white-button-submenu',
               title: 'Modify Account Flags',
               desc: 'Set or Clear account level flags.',
               color: 'green',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          modifyMetaData: {
               icon: 'heroArrowPath',
               colorClass: 'white-button-submenu',
               title: 'Modify Account Meta Data',
               desc: 'Modify the account Meta Data.',
               color: 'green',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          modifyDepositAuth: {
               icon: 'heroArrowPath',
               colorClass: 'white-button-submenu',
               title: 'Modify Account Deposit Auth',
               desc: 'Modify the account Deposit Authorization Addresses.',
               color: 'green',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          modifyMultiSigners: {
               icon: 'heroPlusCircle',
               colorClass: 'blue-button-submenu',
               title: 'Modify Multi Sign',
               desc: 'Modify Multi Signers for signing transactions.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
          modifyRegularKey: {
               icon: 'heroPlusCircle',
               colorClass: 'blue-button-submenu',
               title: 'Modify Regular Key Address',
               desc: 'Modify Regular Key address for signing transactions.',
               color: '',
               iconSize: AppConstants.TAB_META_INFO_ICON_SIZE,
          },
     };

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

     buildSuccessMessage(type: AccountConfigTxType, formValues: any, extra: any): string {
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

     handleSimulationSuccess(type: AccountConfigTxType, formValues: any, hash?: string, extra?: any) {
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
          const totalWeight = this.txUiService.signers().reduce((sum: any, s: { SignerWeight: any }) => sum + (s.SignerWeight || 0), 0);
          if (this.txUiService.signerQuorum() > totalWeight) {
               this.txUiService.signerQuorum.set(Math.floor(totalWeight));
          }
     }

     addSigner() {
          this.txUiService.addSignersSignal({ Account: '', seed: '', SignerWeight: 1 });
     }

     removeSigner(index: number) {
          this.txUiService.removeSignerSignal(index);
     }

     addDepositAuthAddresses() {
          this.txUiService.addDepositAuthAddressesSignal({ Account: '', seed: '', SignerWeight: 1 });
     }

     removeDepositAuthAddresses(index: number) {
          this.txUiService.removeDepositAuthAddressesSignal(index);
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
          return !!(this.txUiService.tickSize() || this.txUiService.transferRate() || (this.txUiService.isMessageKey() && env.wallet.publicKey) || (this.txUiService.domain() && this.txUiService.domain().trim() !== ''));
     }

     async setTxOptionalFields(client: xrpl.Client, accountTx: any, wallet: xrpl.Wallet, accountInfo: any) {
          if (this.txUiService.isTicket()) {
               const ticket = this.txUiService.selectedSingleTicket() || this.txUiService.selectedTickets()[0];
               if (ticket) {
                    const exists = await this.xrplService.checkTicketExists(client, wallet.classicAddress, Number(ticket));
                    if (!exists) throw new Error(`Ticket ${ticket} not found`);
                    this.utilsService.setTicketSequence(accountTx, ticket, true);
               }
          }
          if (this.txUiService.isMemoEnabled() && this.txUiService.memoField()) {
               this.utilsService.setMemoField(accountTx, this.txUiService.memoField());
          }
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
          return this.txUiService
               .signers()
               .filter(s => s.Account && s.SignerWeight > 0)
               .map(s => ({
                    Account: s.Account,
                    SignerWeight: Number(s.SignerWeight),
                    seed: s.seed,
               }));
     }

     createDepsoitAuthEntries() {
          return this.txUiService
               .depositAuthAddresses()
               .filter(s => s.account)
               .map(s => ({
                    Account: s.account,
               }));
     }

     clearUiIAccountMetaData() {
          this.txUiService.tickSize.set('');
          this.txUiService.transferRate.set('');
          this.txUiService.domain.set('');
          this.txUiService.isMessageKey.set(false);
     }

     toggleMessageKey() {
          if (this.txUiService.isMessageKey()) {
               this.txUiService.isMessageKey.set(false);
          } else {
               this.txUiService.isMessageKey.set(true);
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
