import { Component, inject } from '@angular/core';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-mpt-flags',
     imports: [LucideAngularModule],
     templateUrl: './mpt-flags.component.html',
     styleUrl: './mpt-flags.component.css',
})
export class MptFlagsComponent {
     readonly mptUtilService = inject(MptUtilService);

     toggleFlag(flag: string) {
          const validFlag = flag as 'canLock' | 'isRequireAuth' | 'canEscrow' | 'canTrade' | 'canTransfer' | 'canClawback';
          this.mptUtilService.toggleFlag(validFlag);
     }
}
