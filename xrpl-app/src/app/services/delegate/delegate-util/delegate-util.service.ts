import { inject, Injectable } from '@angular/core';
import * as xrpl from 'xrpl';
import { DelegateStoreService } from '../delegate-store/delegate-store.service';
import { LogServiceService } from '../../shared/log-service/log-service.service';

@Injectable({
     providedIn: 'root',
})
export class DelegateUtilService {
     public readonly delegateStore = inject(DelegateStoreService);
     public readonly logService = inject(LogServiceService);

     getExistingDelegations(accountObjects: any, accountAddress: string) {
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Delegate' && obj.Account === accountAddress)
               .map((obj: any) => ({
                    LedgerEntryType: obj.LedgerEntryType,
                    Account: obj.Account,
                    index: obj.index,
                    Authorize: obj.Authorize,
                    Permissions: obj.Permissions,
                    Flags: obj.Flags,
               }));

          // This triggers infoData() to recompute automatically
          this.delegateStore.setField('existingDelegations', mapped);
          this.logService.logObjects('existingDelegations', mapped);
     }

     getSelectedActionIds(accountAddress: string, delegateAddress: string): Set<number> {
          const existingDelegation = this.delegateStore.existingDelegations().find(delegation => delegation.Account === accountAddress && delegation.Authorize === delegateAddress);
          const existingPermissionValues = new Set(existingDelegation?.Permissions.map(permission => permission.Permission.PermissionValue) ?? []);
          return new Set(this.delegateStore.actions().filter(action => existingPermissionValues.has(action.key)).map(action => action.id));
     }
}
