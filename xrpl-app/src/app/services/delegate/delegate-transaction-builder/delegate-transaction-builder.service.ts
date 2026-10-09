import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';

import { DelegateTxType } from '../../../components/delegate/constants/delegate.types';
import { DelegateState } from '../delegate-store/delegate-store.service';

@Injectable({
     providedIn: 'root',
})
export class DelegateTransactionBuilderService {
     buildDelegateTx(wallet: { address?: string; classicAddress?: string }, delegate: DelegateState, type: DelegateTxType): xrpl.DelegateSet {
          const selectedPermissions = type === 'delegateCreate'
               ? delegate.actions
                      .filter(action => delegate.selected.has(action.id))
                      .map(action => ({ Permission: { PermissionValue: action.key } }))
               : [];

          const accountAddress = wallet.address || wallet.classicAddress;
          if (!accountAddress) throw new Error('A wallet account address is required');

          const tx: xrpl.DelegateSet = {
               TransactionType: 'DelegateSet',
               Account: accountAddress,
               Authorize: delegate.destination,
               Permissions: selectedPermissions,
          };
          return tx;
     }
}
