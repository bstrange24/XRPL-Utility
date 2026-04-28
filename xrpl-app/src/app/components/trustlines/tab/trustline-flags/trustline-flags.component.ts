import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { LucideAngularModule } from 'lucide-angular';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-trustline-flags',
     standalone: true,
     imports: [CommonModule, LucideAngularModule],
     templateUrl: './trustline-flags.component.html',
     styleUrl: './trustline-flags.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlineFlagsComponent {
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineViewModelService = inject(TrustlineViewModelService);
}
