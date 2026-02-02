import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
     providedIn: 'root',
})
export class ThemeService {
     private darkMode = new BehaviorSubject<boolean>(this.getInitialTheme());
     darkMode$ = this.darkMode.asObservable();

     constructor() {
          this.applyTheme();
          this.darkMode.subscribe(() => this.applyTheme());

          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
               if (localStorage.getItem('darkMode') === null) {
                    this.darkMode.next(e.matches);
               }
          });
     }

     private getInitialTheme(): boolean {
          const saved = localStorage.getItem('darkMode');
          if (saved !== null) {
               return saved === 'true';
          }
          // System preference as fallback
          return window.matchMedia('(prefers-color-scheme: dark)').matches;
     }

     toggle(): void {
          this.darkMode.next(!this.darkMode.value);
          localStorage.setItem('darkMode', String(this.darkMode.value));
     }

     private applyTheme(): void {
          if (this.darkMode.value) {
               document.documentElement.classList.add('dark');
          } else {
               document.documentElement.classList.remove('dark');
          }
     }

     get isDark(): boolean {
          return this.darkMode.value;
     }
}
