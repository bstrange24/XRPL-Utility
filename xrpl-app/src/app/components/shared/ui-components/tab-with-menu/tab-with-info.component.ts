import { ChangeDetectionStrategy, Component, input, output, computed, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { toSignal } from '@angular/core/rxjs-interop';
import { TabConfig, TabMetaInfo } from '../../../../core/app.constants';
import { ThemeService } from '../../../../services/utils/theme/theme.service';

@Component({
     selector: 'app-tab-menu-with-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './tab-with-info.component.html',
     styleUrl: './tab-with-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabMenuWithInfoComponent {
     private themeService = inject(ThemeService);

     // Required inputs
     tabs = input.required<TabConfig[]>();
     active = input<string>(); // current tab key
     metaMap = input<Record<string, TabMetaInfo>>({}); // key → meta

     // Output — parent handles tab change
     activeChange = output<string>();

     // Convert observable to signal
     isDark = toSignal(this.themeService.darkMode$, { initialValue: false });

     // Reactive derived value
     currentMeta = computed(() => {
          const key = this.active();
          return key === undefined ? undefined : this.metaMap()[key];
     });

     // Get icon color based on theme
     getIconColor(): string {
          const meta = this.currentMeta();
          if (!meta) return '';

          // If meta has color, use it (light mode only, will be adjusted for dark)
          if (meta.color) {
               return meta.color;
          }

          // Default colors for different variants
          return this.isDark() ? '#60a5fa' : '#2563eb';
     }
}
