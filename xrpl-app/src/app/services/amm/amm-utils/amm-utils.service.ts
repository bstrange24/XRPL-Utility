import { inject, Injectable } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../util-service/utils.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { AmmStoreService } from '../amm-store/amm-store.service';

@Injectable({
     providedIn: 'root',
})
export class AmmUtilsService {
     public readonly ammStoreService = inject(AmmStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly xrplService = inject(XrplService);
     public readonly utilsService = inject(UtilsService);
}
