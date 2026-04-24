import { Injectable } from '@angular/core';

export interface SummaryTextConfig {
     itemName: string;
     itemNamePlural: string;
     actionMap: Record<string, string>;
     defaultAction?: string;
}

@Injectable({
     providedIn: 'root',
})
export class SummaryTextConfigService {
     buildSummaryText(walletName: string, count: number, tab: string, config: SummaryTextConfig): string {
          if (count === 0) {
               return ` has no ${config.itemNamePlural}.`;
          }

          const action = config.actionMap[tab] || config.defaultAction || '';
          const itemWord = count === 1 ? config.itemName : config.itemNamePlural;

          return ` has <strong>${count}</strong> ${itemWord} ${action}`;
     }
}
