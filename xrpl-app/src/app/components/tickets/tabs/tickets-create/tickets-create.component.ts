import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-tickets-create',
     standalone: true,
     imports: [FormsModule, NgIcon],
     templateUrl: './tickets-create.component.html',
     styleUrl: './tickets-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsCreateComponent {
     public xrplTxOptionsStore = inject(XrplTxOptionsStore);
}
