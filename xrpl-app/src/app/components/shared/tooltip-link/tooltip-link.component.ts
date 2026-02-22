import { Component, Input, ElementRef, Renderer2, HostListener, ViewEncapsulation, OnDestroy } from '@angular/core';

@Component({
     selector: 'app-tooltip-link',
     standalone: true,
     templateUrl: './tooltip-link.component.html',
     styleUrl: './tooltip-link.component.css',
     encapsulation: ViewEncapsulation.None,
})
export class TooltipLinkComponent implements OnDestroy {
     @Input() href = '';
     @Input() tooltipText = 'Open in Explorer';

     private tooltipEl!: HTMLElement | null;
     private showTimeout: ReturnType<typeof setTimeout> | undefined;
     private hideTimeout: ReturnType<typeof setTimeout> | undefined;

     constructor(
          private readonly host: ElementRef<HTMLElement>,
          private readonly renderer: Renderer2
     ) {}

     @HostListener('mouseenter')
     onMouseEnter() {
          this.showTooltipWithDelay();
     }

     @HostListener('mouseleave')
     onMouseLeave() {
          this.hideTooltipWithDelay();
     }

     // Handle keyboard focus
     onFocus() {
          this.showTooltipWithDelay();
     }

     // Handle keyboard blur
     onBlur() {
          this.hideTooltipWithDelay();
     }

     // NEW: Handle Enter and Space keys
     onKeyDown(event: KeyboardEvent) {
          // Only handle Enter and Space keys
          if (event.key === 'Enter' || event.key === ' ') {
               this.showTooltipWithDelay();

               // Prevent default for Space (page scroll)
               if (event.key === ' ') {
                    event.preventDefault();
               }
               // For Enter, let the link open naturally - don't call preventDefault()
          }
     }

     handleSpacePreventDefault(event: KeyboardEvent) {
          event.preventDefault();
     }

     // Helper methods to consolidate logic
     private showTooltipWithDelay() {
          globalThis.clearTimeout(this.hideTimeout);
          this.showTimeout = globalThis.setTimeout(() => {
               this.showTooltip();
          }, 120);
     }

     private hideTooltipWithDelay() {
          globalThis.clearTimeout(this.showTimeout);
          this.hideTimeout = globalThis.setTimeout(() => {
               this.hideTooltip();
          }, 60);
     }

     private createTooltip() {
          if (this.tooltipEl) return;

          this.tooltipEl = this.renderer.createElement('div');
          this.renderer.addClass(this.tooltipEl, 'app-tooltip');

          this.tooltipEl!.innerText = this.tooltipText;

          this.renderer.appendChild(document.body, this.tooltipEl);
     }

     private showTooltip() {
          if (!this.tooltipText) return;
          this.createTooltip();
          if (!this.tooltipEl) return;

          this.tooltipEl.innerText = this.tooltipText;

          const hostRect = this.host.nativeElement.getBoundingClientRect();
          const tooltipRect = this.tooltipEl.getBoundingClientRect();

          const offset = 8; // spacing between trigger and tooltip
          let top = 0;
          let left = 0;

          // Determine vertical placement
          const spaceAbove = hostRect.top;
          const placeAbove = spaceAbove > tooltipRect.height + offset;

          if (placeAbove) {
               top = hostRect.top - tooltipRect.height - offset;
          } else {
               top = hostRect.bottom + offset;
          }

          if (left + tooltipRect.width > window.innerWidth - 6) {
               left = window.innerWidth - tooltipRect.width - 6;
          } else if (left < 6) {
               left = 6;
          }

          // Center horizontally by default
          left = hostRect.left + hostRect.width / 2 - tooltipRect.width / 2;

          // Clamp horizontally so tooltip never goes off screen
          left = Math.max(6, Math.min(left, window.innerWidth - tooltipRect.width - 6));

          // Vertical clamp (if tooltip is taller than viewport)
          top = Math.max(6, Math.min(top, window.innerHeight - tooltipRect.height - 6));

          this.renderer.setStyle(this.tooltipEl, 'top', `${top}px`);
          this.renderer.setStyle(this.tooltipEl, 'left', `${left}px`);
          this.renderer.setStyle(this.tooltipEl, 'opacity', '1');
          this.renderer.setStyle(this.tooltipEl, 'transform', 'translateY(0) scale(1)');
     }

     private hideTooltip() {
          if (!this.tooltipEl) return;

          this.renderer.removeClass(this.tooltipEl, 'show');

          setTimeout(() => {
               if (this.tooltipEl) {
                    try {
                         this.renderer.removeChild(document.body, this.tooltipEl);
                    } catch {}
                    this.tooltipEl = null;
               }
          }, 150);
     }

     ngOnDestroy() {
          if (this.tooltipEl) {
               try {
                    this.renderer.removeChild(document.body, this.tooltipEl);
               } catch {}
               this.tooltipEl = null;
          }
     }
}
