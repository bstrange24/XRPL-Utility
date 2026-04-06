import { Component, inject, input, output } from '@angular/core';
import { ConnectionGuardService } from '../../../../services/connection-guard/connection-guard.service';

@Component({
     selector: 'app-did-delete',
     standalone: true,
     imports: [],
     templateUrl: './did-delete.component.html',
     styleUrl: './did-delete.component.css',
})
export class DidDeleteComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     view = input.required<any>();
     canSubmit = input<boolean>(false);

     performAction = output<void>();
     clearFields = output<void>();
}
