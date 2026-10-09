import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';

import { DelegateTxType } from '../../../components/delegate/constants/delegate.types';
import { DelegateState } from '../delegate-store/delegate-store.service';

@Injectable({
     providedIn: 'root',
})
export class DelegateTransactionBuilderService {
     buildDelegateTx(wallet: { address?: string; classicAddress?: string }, delegate: DelegateState, type: DelegateTxType): xrpl.DelegateSet {
          const accountAddress = wallet.address || wallet.classicAddress;
          if (!accountAddress) throw new Error('A wallet account address is required');

          const selectedKeys = new Set(delegate.actions.filter(action => delegate.selected.has(action.id)).map(action => action.key));
          const selectedPermissions =
               type === 'delegateCreate'
                    ? [...selectedKeys].map(key => ({ Permission: { PermissionValue: key } }))
                    : // DelegateSet replaces the whole list: keep what was not selected, an empty list deletes the delegation
                      (delegate.existingDelegations.find(delegation => delegation.Authorize === delegate.destination)?.Permissions ?? []).filter(permission => !selectedKeys.has(permission.Permission.PermissionValue));

          const tx: xrpl.DelegateSet = {
               TransactionType: 'DelegateSet',
               Account: accountAddress,
               Authorize: delegate.destination,
               Permissions: selectedPermissions,
          };
          return tx;
     }
}
