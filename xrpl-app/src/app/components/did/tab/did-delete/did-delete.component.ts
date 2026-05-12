import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { DidStoreService } from '../../../../services/did/did-store/did-store.service';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-did-delete',
     standalone: true,
     imports: [NgIcon],
     templateUrl: './did-delete.component.html',
     styleUrl: './did-delete.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidDeleteComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly didStoreService = inject(DidStoreService);

     view = input.required<any>();
     canSubmit = input<boolean>(false);

     performAction = output<void>();
     clearFields = output<void>();

     hasNoExistingDid = computed(() => this.didStoreService.existingDid().length <= 0);
}
