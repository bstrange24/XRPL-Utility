// tab-menu-with-info.component.ts
import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { TabConfig, TabMetaInfo } from '../../../../core/app.constants';
import { JsonPipe } from '@angular/common';

@Component({
     selector: 'app-tab-menu-with-info',
     standalone: true,
     imports: [NgIcon, LucideAngularModule],
     templateUrl: './tab-with-info.component.html',
     styleUrl: './tab-with-info.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabMenuWithInfoComponent {
     // Required inputs
     // Inputs — each page provides these
     tabs = input.required<TabConfig[]>();
     active = input<string>(); // current tab key
     metaMap = input<Record<string, TabMetaInfo>>({}); // key → meta

     // Output — parent handles tab change
     activeChange = output<string>();

     // Reactive derived value
     currentMeta = computed(() => {
          const key = this.active();
          return key === undefined ? undefined : this.metaMap()[key];
     });
}
