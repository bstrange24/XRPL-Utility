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

     getExistingDelegations(accountObjects: any) {
          const mapped = (accountObjects.result.account_objects ?? [])
               .filter((obj: any) => obj.LedgerEntryType === 'Delegate')
               .map((obj: any) => ({
                    LedgerEntryType: obj.LedgerEntryType,
                    index: obj.index,
                    Authorize: obj.Authorize,
                    Permissions: obj.Permissions,
                    Flags: obj.Flags,
               }));

          // This triggers infoData() to recompute automatically
          this.delegateStore.setField('existingDelegations', mapped);
          this.logService.logObjects('existingDelegations', mapped);
     }
}
