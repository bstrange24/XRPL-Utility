// services/right-panel/right-panel.service.ts
import { Injectable, Type, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RightPanelService {
     readonly component = signal<Type<any> | null>(null);

     // Store raw values or signals
     private readonly _inputs = signal<Record<string, any>>({});

     readonly inputs = computed(() => this._inputs());

     setPanel<T>(component: Type<T>, inputs: Partial<Record<keyof T, any>> = {}) {
          this.component.set(component);
          this._inputs.set(inputs);
     }

     clearPanel() {
          this.component.set(null);
          this._inputs.set({});
     }
}
