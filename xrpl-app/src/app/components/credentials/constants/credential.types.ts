import { CredentialItem } from '../../../models/interface-items.model';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';

export interface CredentialItemVm extends CredentialItem {
     accepted: boolean;
     selectable: boolean;
     issuedByMe: boolean;
}
export type CredentialActionTypes = 'create' | 'accept' | 'delete' | 'verify';
export type CredentialField = 'credentialIDs' | 'credentialID' | 'credentialType' | 'subject' | 'credential' | 'uri' | 'expirationDate' | 'credentialIssuer' | 'credentialIdSearchQuery' | 'credentialIdSearchTerm' | 'existingCredentials' | 'selectedCredentials' | 'subjectCredentials' | 'domainId' | 'regularKeySigningEnabled';

export interface CredentialTxConfig {
     wallet: Wallet;
     simulate?: boolean;
     multiSign?: boolean;
     credentialType?: string;
     expirationDate?: string;
     uri?: string;
     subject?: string;
     credentialID?: string;
     credentialIssuer?: string;
     subjectDestination?: string;
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
