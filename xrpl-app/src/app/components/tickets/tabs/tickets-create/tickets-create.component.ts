import { Component, inject, Input } from '@angular/core';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tickets-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tickets-create.component.html',
  styleUrl: './tickets-create.component.css',
})
export class TicketsCreateComponent {
  public xrplTxOptionsStore = inject(XrplTxOptionsStore);
}
