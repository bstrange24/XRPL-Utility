import { Injectable, Type, signal, computed } from '@angular/core';

export interface RightPanelConfig {
     mainComponent?: Type<any> | null;
     mainInputs?: Record<string, any>;

     summaryComponent?: Type<any> | null;
     summaryInputs?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class RightPanelService {
     private readonly config = signal<RightPanelConfig>({});
     readonly component = computed(() => this.config().mainComponent ?? null);
     readonly inputs = computed(() => this.config().mainInputs ?? {});
     readonly summaryComponent = computed(() => this.config().summaryComponent ?? null);
     readonly summaryInputs = computed(() => this.config().summaryInputs ?? {});
     // Trigger to reset searches/filters when wallet changes
     private readonly _resetTrigger = signal(0);
     readonly resetTrigger = this._resetTrigger.asReadonly();

     setPanel(config: RightPanelConfig) {
          this.config.set({
               mainComponent: config.mainComponent ?? null,
               mainInputs: config.mainInputs ?? {},
               summaryComponent: config.summaryComponent ?? null,
               summaryInputs: config.summaryInputs ?? {},
          });
     }

     setMainPanel<T>(component: Type<T>, inputs: Record<string, any> = {}) {
          this.setPanel({
               mainComponent: component,
               mainInputs: inputs,
          });
     }

     resetFilters() {
          this._resetTrigger.update(v => v + 1);
     }

     clearPanel() {
          this.config.set({});
          this._resetTrigger.set(0);
     }

     clearSummary() {
          this.setPanel({
               mainComponent: this.component(),
               mainInputs: this.inputs(),
          });
     }
}
