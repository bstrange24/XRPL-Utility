import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { XRPLDelegate } from '../../constants/delegate.types';

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
  destinationChange = output<string>();
}
