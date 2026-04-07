import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';

@Injectable({
     providedIn: 'root',
})
export class NetworkService {
     private readonly networkChangedSource = new Subject<string>();

     // Convert Subject to signal with initial value
     private readonly networkChangedSignal = toSignal(this.networkChangedSource.asObservable(), {
          initialValue: undefined,
     });

     // Expose as readonly signal - just return the signal directly
     readonly networkChanged = this.networkChangedSignal;

     announceNetworkChange(network: string) {
          this.networkChangedSource.next(network);
     }
}
