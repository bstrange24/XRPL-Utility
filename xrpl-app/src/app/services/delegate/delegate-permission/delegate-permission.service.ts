import { Injectable } from '@angular/core';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class DelegatePermissionService {
     /**
      * Checks on the validated ledger that `delegator` granted `delegate` every permission in `required`.
      * Returns an error message, or null when the delegation is sufficient.
      */
     async validate(client: xrpl.Client, delegator: string, delegate: string, required: string[]): Promise<string | null> {
          const response: any = await client.request({ command: 'account_objects', account: delegator, type: 'delegate', ledger_index: 'validated' });
          const delegation = (response.result.account_objects ?? []).find((obj: any) => obj.Authorize === delegate);
          if (!delegation) return `${delegator} has not delegated any permissions to ${delegate}.`;

          const granted = new Set<string>((delegation.Permissions ?? []).map((p: any) => p.Permission.PermissionValue));
          const missing = required.filter(permission => !granted.has(permission));
          return missing.length ? `${delegate} is missing delegated permission(s): ${missing.join(', ')}.` : null;
     }
}
