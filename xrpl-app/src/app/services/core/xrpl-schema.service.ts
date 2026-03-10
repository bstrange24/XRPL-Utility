import { Injectable } from '@angular/core';
import { XRPL_TX_REGISTRY } from '../../core/xrpl-tx-registry';
import { XrplTxSchema } from '../../core/xrpl-tx-schema.model';

@Injectable({ providedIn: 'root' })
export class XrplSchemaService {
     getSchema(txType: string): XrplTxSchema | null {
          return XRPL_TX_REGISTRY[txType] ?? null;
     }
}
