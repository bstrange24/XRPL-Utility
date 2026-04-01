import * as xrpl from 'xrpl';
import { Wallet } from '../../../services/wallets/manager/wallet-manager.service';
import { XrplTxOptionsState } from '../../shared/stores/xrpl-tx-options.store';
import { AccountConfiguratorState } from '../../account-configurator/constants/account-configurator.types';
import { TicketState } from '../../../services/tickets/tickets-store/tickets-store.service';

export type TicketActionTypes = 'createTicket' | 'deleteTicket';

export interface TicketTxConfig {
     ticket: TicketState;
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
