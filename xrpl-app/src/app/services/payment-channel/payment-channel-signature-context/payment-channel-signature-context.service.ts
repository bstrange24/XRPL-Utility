import { Injectable } from '@angular/core';

@Injectable({
     providedIn: 'root',
})
export class PaymentChannelSignatureContextService {
     private signatureContexts = new Map<string, any>();

     constructor() {
          this.loadContextsFromStorage();
          this.clearOldContexts(); // Optional: Clean up old contexts on init
     }

     saveSignatureContext(signature: string, context: any) {
          const fullContext = {
               ...context,
               savedAt: Date.now(),
          };

          // Save to memory
          this.signatureContexts.set(signature, fullContext);

          // Save to localStorage
          const allContexts = this.getAllContextsFromStorage();
          allContexts[signature] = fullContext;
          localStorage.setItem('signature_contexts', JSON.stringify(allContexts));
     }

     getSignatureContext(signature: string): any {
          if (!signature) return null;

          // Check memory first
          if (this.signatureContexts.has(signature)) {
               return this.signatureContexts.get(signature);
          }

          // Check localStorage
          const allContexts = this.getAllContextsFromStorage();
          const context = allContexts[signature];

          // Cache in memory for future use
          if (context) {
               this.signatureContexts.set(signature, context);
          }

          return context;
     }

     hasSignatureContext(signature: string): boolean {
          return !!this.getSignatureContext(signature);
     }

     getSignatureFlags(signature: string): any {
          const context = this.getSignatureContext(signature);
          return context?.flags || null;
     }

     private getAllContextsFromStorage(): any {
          const stored = localStorage.getItem('signature_contexts');
          return stored ? JSON.parse(stored) : {};
     }

     private loadContextsFromStorage() {
          const allContexts = this.getAllContextsFromStorage();
          Object.keys(allContexts).forEach(key => {
               this.signatureContexts.set(key, allContexts[key]);
          });
     }

     clearOldContexts(maxAge: number = 24 * 60 * 60 * 1000) {
          // 24 hours default
          const allContexts = this.getAllContextsFromStorage();
          const now = Date.now();
          let changed = false;

          Object.keys(allContexts).forEach(key => {
               if (now - allContexts[key].savedAt > maxAge) {
                    delete allContexts[key];
                    this.signatureContexts.delete(key);
                    changed = true;
               }
          });

          if (changed) {
               localStorage.setItem('signature_contexts', JSON.stringify(allContexts));
          }
     }

     clearSignatureContext(signature: string) {
          this.signatureContexts.delete(signature);
          const allContexts = this.getAllContextsFromStorage();
          delete allContexts[signature];
          localStorage.setItem('signature_contexts', JSON.stringify(allContexts));
     }
}
