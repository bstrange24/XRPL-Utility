import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { DelegateAction, XRPLDelegate } from '../../constants/delegate.types';

@Component({
  selector: 'app-delegate-clear',
  standalone: true,
  imports: [CommonModule],
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

  actionIdFor(permissionValue: string): number | null {
    return this.actions().find(action => action.key === permissionValue)?.id ?? null;
  }

  isPermissionSelected(permissionValue: string): boolean {
    const id = this.actionIdFor(permissionValue);
    return id !== null && this.selectedActions().has(id);
  }
}
