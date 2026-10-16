import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

import { DelegateAction, XRPLDelegate } from '../../constants/delegate.types';

@Component({
     selector: 'app-delegate-clear',
     standalone: true,
     imports: [CommonModule, LucideAngularModule],
     templateUrl: './delegate-clear.component.html',
     styleUrl: './delegate-clear.component.css',
})
export class DelegateClearComponent {
     delegations = input.required<XRPLDelegate[]>();
     selectedDestination = input('');
     actions = input<DelegateAction[]>([]);
     selectedActions = input<Set<number>>(new Set<number>());
     destinationChange = output<string>();
     actionToggle = output<number>();

     isDelegationSelected(delegation: XRPLDelegate): boolean {
          return !!this.selectedDestination() && this.selectedDestination() === delegation.Authorize;
     }

     toggleDelegation(delegation: XRPLDelegate): void {
          this.destinationChange.emit(this.isDelegationSelected(delegation) ? '' : delegation.Authorize || '');
     }

     actionIdFor(permissionValue: string): number | null {
          return this.actions().find(action => action.key === permissionValue)?.id ?? null;
     }

     isPermissionSelected(permissionValue: string): boolean {
          const id = this.actionIdFor(permissionValue);
          return id !== null && this.selectedActions().has(id);
     }
}
