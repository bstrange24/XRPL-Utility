import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { CredentialState } from '../../../services/credentials/credential-store/credential-store.service';
import { CredentialItem } from '../../credentials/constants/credential.types';

export interface CredentialItemVm extends CredentialItem {
     accepted: boolean;
     selectable: boolean;
     issuedByMe: boolean;
}
export type SendXrpActionTypes = 'sendXrp';
export type CredentialField = 'credentialIDs' | 'credentialID' | 'credentialType' | 'subject' | 'credential' | 'uri' | 'expirationDate' | 'credentialIssuer' | 'credentialIdSearchQuery' | 'credentialIdSearchTerm' | 'existingCredentials' | 'selectedCredentials' | 'subjectCredentials' | 'domainId' | 'regularKeySigningEnabled';

export interface XrpPaymentConfig {
     credentialState?: CredentialState;
     account?: AccountConfiguratorState;
     txOptions?: XrplTxOptionsState;
     wallet: Wallet;
     preFetchedEnv?: {
          client: xrpl.Client;
          accountInfo: any;
          accountObjects?: any;
          fee: string;
          currentLedger: number;
          ledgerInfo: any;
          wallet?: any;
     };
     extra?: Record<string, any>;
}
