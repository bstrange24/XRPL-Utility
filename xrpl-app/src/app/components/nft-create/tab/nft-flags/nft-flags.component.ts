import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LucideAngularModule } from 'lucide-angular';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';

@Component({
     selector: 'app-nft-flags',
     standalone: true,
     imports: [CommonModule, FormsModule, MatSlideToggleModule, LucideAngularModule],
     templateUrl: './nft-flags.component.html',
     styleUrl: './nft-flags.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftFlagsComponent {
     public readonly nftUtilService = inject(NftUtilService);

     toggleFlag(key: 'burnableNft' | 'onlyXrpNft' | 'transferableNft' | 'mutableNft' | 'trustLine') {
          this.nftUtilService.nftFlags.update(current => ({
               ...current,
               [key]: !current[key],
          }));
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          const flags = this.nftUtilService.nftFlags();
          let sum = 0;
          if (flags.burnableNft) sum |= this.nftUtilService.nftFlagValues.burnableNft;
          if (flags.onlyXrpNft) sum |= this.nftUtilService.nftFlagValues.onlyXrpNft;
          if (flags.transferableNft) sum |= this.nftUtilService.nftFlagValues.transferableNft;
          if (flags.mutableNft) sum |= this.nftUtilService.nftFlagValues.mutableNft;
          if (flags.trustLine) sum |= this.nftUtilService.nftFlagValues.trustLine;

          this.nftUtilService.totalFlagsValue.set(sum);
          this.nftUtilService.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }
}
