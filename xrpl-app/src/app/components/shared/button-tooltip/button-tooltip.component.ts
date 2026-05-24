import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';

@Component({
     selector: 'app-button-tooltip',
     standalone: true,
     imports: [],
     templateUrl: './button-tooltip.component.html',
     styleUrl: './button-tooltip.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonTooltipComponent implements OnDestroy {
     @Input() tooltipText = '';
     @Input() showOnlyWhenDisabled = true;
     @Input() showDelay = 500;
     @Input() hideDelay = 60;

     private tooltipEl: HTMLElement | null = null;
     private showTimeout: ReturnType<typeof setTimeout> | undefined;
     private hideTimeout: ReturnType<typeof setTimeout> | undefined;
     private isMouseOverTrigger = false;
     private isTooltipVisible = false;

     constructor(
          private readonly host: ElementRef<HTMLElement>,
          private readonly renderer: Renderer2
     ) {}

     @HostListener('mouseenter')
     onMouseEnter() {
          this.isMouseOverTrigger = true;
          if (this.shouldShowTooltip()) {
               this.showTooltipWithDelay();
          }
     }

     @HostListener('mouseleave')
     onMouseLeave() {
          this.isMouseOverTrigger = false;
          this.hideTooltipWithDelay();
     }

     onFocus() {
          if (this.shouldShowTooltip()) {
               this.showTooltipWithDelay();
          }
     }

     onBlur() {
          this.hideTooltipWithDelay();
     }

     private shouldShowTooltip(): boolean {
          if (!this.tooltipText || this.tooltipText.trim() === '') {
               return false;
          }

          if (this.showOnlyWhenDisabled) {
               const button = this.host.nativeElement.querySelector('button');
               if (button && button.classList.contains('opacity-50')) {
                    return true;
               }
               return false;
          }

          return true;
     }

     private showTooltipWithDelay() {
          // Clear any existing hide timeout
          if (this.hideTimeout) {
               globalThis.clearTimeout(this.hideTimeout);
               this.hideTimeout = undefined;
          }

          // If tooltip is already visible, don't show again
          if (this.isTooltipVisible) {
               return;
          }

          // Clear any existing show timeout
          if (this.showTimeout) {
               globalThis.clearTimeout(this.showTimeout);
          }

          // Set new timeout
          this.showTimeout = globalThis.setTimeout(() => {
               if (this.isMouseOverTrigger && this.shouldShowTooltip()) {
                    this.showTooltip();
               }
               this.showTimeout = undefined;
          }, this.showDelay);
     }

     private hideTooltipWithDelay() {
          // Clear any existing show timeout
          if (this.showTimeout) {
               globalThis.clearTimeout(this.showTimeout);
               this.showTimeout = undefined;
          }

          // Clear any existing hide timeout
          if (this.hideTimeout) {
               globalThis.clearTimeout(this.hideTimeout);
          }

          // Set new hide timeout
          this.hideTimeout = globalThis.setTimeout(() => {
               this.hideTooltip();
               this.hideTimeout = undefined;
          }, this.hideDelay);
     }

     private createTooltip() {
          if (this.tooltipEl) return;

          this.tooltipEl = this.renderer.createElement('div');
          this.renderer.addClass(this.tooltipEl, 'app-button-tooltip');
          this.renderer.appendChild(document.body, this.tooltipEl);
     }

     private showTooltip() {
          if (!this.shouldShowTooltip()) return;
          if (this.isTooltipVisible) return;

          this.createTooltip();
          if (!this.tooltipEl) return;

          this.tooltipEl.innerText = this.tooltipText;

          const hostRect = this.host.nativeElement.getBoundingClientRect();
          const tooltipRect = this.tooltipEl.getBoundingClientRect();

          const offset = 8;
          let top = 0;
          let left = 0;

          const spaceAbove = hostRect.top;
          const placeAbove = spaceAbove > tooltipRect.height + offset;

          if (placeAbove) {
               top = hostRect.top - tooltipRect.height - offset;
               this.renderer.setAttribute(this.tooltipEl, 'data-placement', 'top');
          } else {
               top = hostRect.bottom + offset;
               this.renderer.setAttribute(this.tooltipEl, 'data-placement', 'bottom');
          }

          left = hostRect.left + hostRect.width / 2 - tooltipRect.width / 2;
          left = Math.max(6, Math.min(left, window.innerWidth - tooltipRect.width - 6));
          top = Math.max(6, Math.min(top, window.innerHeight - tooltipRect.height - 6));

          this.renderer.setStyle(this.tooltipEl, 'top', `${top}px`);
          this.renderer.setStyle(this.tooltipEl, 'left', `${left}px`);
          this.renderer.setStyle(this.tooltipEl, 'opacity', '1');
          this.renderer.setStyle(this.tooltipEl, 'transform', 'translateY(0) scale(1)');

          this.isTooltipVisible = true;
     }

     private hideTooltip() {
          if (!this.tooltipEl) return;

          this.renderer.setStyle(this.tooltipEl, 'opacity', '0');
          this.renderer.setStyle(this.tooltipEl, 'transform', 'translateY(4px) scale(0.95)');

          this.isTooltipVisible = false;

          // Remove from DOM after transition
          setTimeout(() => {
               if (this.tooltipEl && !this.isTooltipVisible) {
                    try {
                         this.renderer.removeChild(document.body, this.tooltipEl);
                    } catch {}
                    this.tooltipEl = null;
               }
          }, 150);
     }

     ngOnDestroy() {
          if (this.showTimeout) {
               globalThis.clearTimeout(this.showTimeout);
          }
          if (this.hideTimeout) {
               globalThis.clearTimeout(this.hideTimeout);
          }
          if (this.tooltipEl) {
               try {
                    this.renderer.removeChild(document.body, this.tooltipEl);
               } catch {}
               this.tooltipEl = null;
          }
     }
}
