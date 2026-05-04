import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class XrplWrapperService {
     convertStringToHex(str: string): string {
          return xrpl.convertStringToHex(str);
     }

     decodeMPTokenMetadata(metadata: any): any {
          return xrpl.decodeMPTokenMetadata(metadata);
     }

     isValidAddress(address: string): boolean {
          return xrpl.isValidAddress(address);
     }

     isValidSecret(secret: string): boolean {
          return xrpl.isValidSecret(secret);
     }

     dropsToXrp(drops: string | number | bigint): number {
          return xrpl.dropsToXrp(drops);
     }

     xrpToDrops(xrp: string | number | BigNumber): string {
          return xrpl.xrpToDrops(xrp);
     }
}
