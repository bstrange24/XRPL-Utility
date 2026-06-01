import { Injectable, signal } from '@angular/core';

@Injectable({
     providedIn: 'root',
})
export class NetworkModalService {
     private readonly isOpenSignal = signal<boolean>(false);
     readonly isOpen = this.isOpenSignal.asReadonly();

     openModal(): void {
          this.isOpenSignal.set(true);
     }

     closeModal(): void {
          this.isOpenSignal.set(false);
     }

     toggleModal(): void {
          this.isOpenSignal.update(state => !state);
     }
}
