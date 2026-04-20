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

     tabButtonClasses = computed(() => {
          const count = this.tabs().length;
          return {
               // Container classes
               containerWidth: count === 1 ? 'w-full' : 'w-fit',
               containerJustify: count === 1 ? 'justify-stretch' : 'justify-start',

               // Button classes
               buttonPadding: count === 1 ? 'px-6 py-3' : count > 3 ? 'px-3 py-2' : 'px-4 py-2',
               buttonTextSize: count === 1 ? 'text-base' : 'text-sm',
               buttonGap: count === 1 ? 'gap-2' : 'gap-1.5',
               iconSize: count === 1 ? '20' : '16',
          };
     });

     getButtonClasses(tabCount: number, isActive: boolean): string {
          const baseClasses = 'menu-btn rounded-[14px] font-medium transition-all flex items-center';
          const sizeClasses = tabCount === 1 ? 'px-6 py-3 text-base gap-2' : tabCount > 3 ? 'px-3 py-2 text-sm gap-1' : 'px-4 py-2 text-sm gap-1.5';
          const activeClass = isActive ? 'active' : '';
          return `${baseClasses} ${sizeClasses} ${activeClass}`.trim();
     }
}
