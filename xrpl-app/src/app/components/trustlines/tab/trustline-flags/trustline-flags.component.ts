import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TrustlineCurrencyService } from '../../../../services/trustline-currency/trustline-util/trustline-currency.service';
import { LucideAngularModule } from 'lucide-angular';
import { TrustlineViewModelService } from '../../../../services/trustlines/trustline-view-model/trustline-view-model.service';
import { AppConstants } from '../../../../core/app.constants';

@Component({
     selector: 'app-trustline-flags',
     standalone: true,
     imports: [LucideAngularModule],
     templateUrl: './trustline-flags.component.html',
     styleUrl: './trustline-flags.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustlineFlagsComponent {
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly trustlineViewModelService = inject(TrustlineViewModelService);
}
