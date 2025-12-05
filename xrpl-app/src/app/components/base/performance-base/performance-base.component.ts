import { Component, inject, signal } from '@angular/core';
import { XrplService } from '../../../services/xrpl-services/xrpl.service';

@Component({
     selector: 'app-performance-base',
     imports: [],
     templateUrl: './performance-base.component.html',
     styleUrl: './performance-base.component.css',
})
export class PerformanceBaseComponent {
     public readonly xrplService = inject(XrplService);
     // Shared signal for execution time — use in any child component
     protected executionTime = signal<string>('0');

     /**
      * Wrap any async operation with performance timing
      * Only logs on testnet/devnet, never on mainnet
      */
     protected async withPerf<T>(name: string, fn: () => Promise<T>): Promise<T> {
          if (this.environment() !== 'mainnet') {
               console.log(`Entering ${name}`);
          }

          const start = Date.now();

          try {
               return await fn();
          } finally {
               const elapsed = Date.now() - start;
               if (this.environment() !== 'mainnet') {
                    console.log(`Leaving ${name} in ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)`);
               }
               this.executionTime.set(`Execution time: ${elapsed} ms (${(elapsed / 1000).toFixed(2)} sec)`);
          }
     }

     // Override in child if you have different logic
     protected environment(): string {
          return this.xrplService.getNet().environment || 'devnet';
     }
}
