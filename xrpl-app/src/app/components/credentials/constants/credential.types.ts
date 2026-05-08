import { CredentialState } from '../../../services/credentials/credential-store/credential-store.service';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';

export interface CredentialItemVm extends CredentialItem {
     accepted: boolean;
     selectable: boolean;
     issuedByMe: boolean;
}
export type CredentialActionTypes = 'createCredential' | 'acceptCredential' | 'deleteCredential' | 'verifyCredential';
export type CredentialField = 'credentialIDs' | 'credentialID' | 'credentialType' | 'subject' | 'credential' | 'uri' | 'expirationDate' | 'credentialIssuer' | 'credentialIdSearchQuery' | 'credentialIdSearchTerm' | 'existingCredentials' | 'selectedCredentials' | 'subjectCredentials' | 'domainId' | 'regularKeySigningEnabled';

export interface CredentialTxConfig {
     credential: CredentialState;
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

export interface CredentialItem {
     index: string;
     CredentialType: string;
     Subject: string;
     Issuer: string;
     Expiration: string;
     ExpirationRaw?: number;
     URI: string;
     Flags: number;
     expired?: boolean;
}

// export interface CredentialItem {
//      index: string;
//      CredentialType: string;
//      Subject: string;
//      Issuer: string;
//      Expiration?: string;
//      URI?: string;
//      Flags?: any;
//      expired?: boolean;
// }

export interface CredentialData {
     version: string;
     credential_type: string;
     issuer: string;
     subject: {
          full_name: string;
          destinationAddress: string;
          dob: string;
          country: string;
          id_type: string;
          id_number: string;
          expirationDate: string;
     };
     verification: {
          method: string;
          verified_at: string;
          verifier: string;
     };
     hash: string;
     uri: string;
}
