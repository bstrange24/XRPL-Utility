import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
     providedIn: 'root', // Makes it a singleton available app-wide
})
export class NetworkService {
     private networkChangedSource = new Subject<string>();
     networkChanged$ = this.networkChangedSource.asObservable();

     announceNetworkChange(network: string) {
          this.networkChangedSource.next(network);
     }
}
