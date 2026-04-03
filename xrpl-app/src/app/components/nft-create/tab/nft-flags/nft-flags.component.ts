import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { XrplExpirationInputComponent } from '../../../shared/xrpl-expiration-input/xrpl-expiration-input.component';
import { SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { LucideAngularModule } from 'lucide-angular';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';

@Component({
     selector: 'app-nft-flags',
     standalone: true,
     imports: [CommonModule, FormsModule, MatSlideToggleModule, LucideAngularModule],
     templateUrl: './nft-flags.component.html',
     styleUrl: './nft-flags.component.css',
})
export class NftFlagsComponent {
     public readonly nftUtilService = inject(NftUtilService);

     toggleFlag(key: 'burnableNft' | 'onlyXrpNft' | 'transferableNft' | 'mutableNft' | 'trustLine') {
          this.nftUtilService.nftFlags[key] = !this.nftUtilService.nftFlags[key];
          this.updateFlagTotal();
     }

     private updateFlagTotal() {
          let sum = 0;
          if (this.nftUtilService.nftFlags.burnableNft) sum |= this.nftUtilService.nftFlagValues.burnableNft;
          if (this.nftUtilService.nftFlags.onlyXrpNft) sum |= this.nftUtilService.nftFlagValues.onlyXrpNft;
          if (this.nftUtilService.nftFlags.transferableNft) sum |= this.nftUtilService.nftFlagValues.transferableNft;
          if (this.nftUtilService.nftFlags.mutableNft) sum |= this.nftUtilService.nftFlagValues.mutableNft;
          if (this.nftUtilService.nftFlags.trustLine) sum |= this.nftUtilService.nftFlagValues.trustLine;

          this.nftUtilService.totalFlagsValue.set(sum);
          this.nftUtilService.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }
}
