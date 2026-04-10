import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class LogServiceService {
     logLedgerObjects(fee: string, currentLedger: number, serverInfo: xrpl.ServerInfoResponse) {
          console.debug(`fee:`, fee);
          console.debug(`currentLedger:`, currentLedger);
          console.debug(`serverInfo:`, serverInfo);
     }

     logAccountInfoObjects(accountInfo: any, accountObject: any) {
          if (accountInfo) {
               console.debug(`accountInfo:`, accountInfo.result);
          }

          if (accountObject) {
               console.debug(`accountObject:`, accountObject.result);
          }
     }

     logAssets(asset: any, asset2: any) {
          if (asset) {
               console.debug(`asset:`, asset);
          }

          if (asset2) {
               console.debug(`asset2:`, asset2);
          }
     }

     logObjects(type: string, object: any) {
          if (object.result) {
               console.debug(`${type}`, object.result);
          } else {
               console.debug(`${type}`, object);
          }
     }

     logEscrowObjects(escrowObjects: xrpl.AccountObjectsResponse, escrow: any) {
          if (escrowObjects) {
               console.debug(`escrowObjects:`, escrowObjects?.result);
          }

          if (escrow) {
               console.debug(`escrow:`, escrow);
          }
     }
}
