import { Component, EventEmitter, Output, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { ThemeService } from '../../services/theme/theme.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarStore } from '../../services/navbar/navbar-store/navbar-store.service';
import { ConnectionStatusComponent } from '../shared/connection-status/connection-status.component';

@Component({
     selector: 'app-navbar',
     standalone: true,
     imports: [CommonModule, RouterModule, NgIcon, ConnectionStatusComponent],
     templateUrl: './navbar.component.html',
})
export class NavbarComponent {
     store = inject(NavbarStore);
     themeService = inject(ThemeService);
     elRef = inject(ElementRef);

     isDark = toSignal(this.themeService.darkMode$, { initialValue: false });

     @Output() transactionResult = new EventEmitter<{
          result: string;
          isError: boolean;
          isSuccess: boolean;
     }>();

     async onSearch() {
          const result = await this.store.searchTransaction();

          if ('error' in result) {
               this.transactionResult.emit({
                    result: result.error,
                    isError: true,
                    isSuccess: false,
               });
          } else {
               this.transactionResult.emit({
                    result: 'Transaction retrieved successfully',
                    isError: false,
                    isSuccess: true,
               });
          }
     }

     // optional: close dropdown on outside click
     @HostListener('document:click', ['$event'])
     onClick(event: MouseEvent) {
          if (!this.elRef.nativeElement.contains(event.target)) {
               this.store.closeAllDropdowns();
          }
     }
}
