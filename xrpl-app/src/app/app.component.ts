import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, ActivatedRoute, RouterOutlet } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { ToastService } from './services/utils/toast/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-root',
     standalone: true,
     imports: [RouterOutlet, CommonModule, NgIcon],
     animations: [trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(100%)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(50%)' }))])])],
     templateUrl: './app.component.html',
     styleUrls: ['./app.component.css'],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
     readonly isNavigating = signal(false);

     constructor(
          private readonly titleService: Title,
          private readonly router: Router,
          private readonly activatedRoute: ActivatedRoute,
          public toastService: ToastService
     ) {}

     ngOnInit() {
          this.router.events.subscribe(event => {
               if (event instanceof NavigationStart) {
                    this.isNavigating.set(true);
               } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
                    this.isNavigating.set(false);
               }
          });

          this.router.events
               .pipe(
                    filter(event => event instanceof NavigationEnd),
                    map(() => this.activatedRoute),
                    map(route => {
                         while (route.firstChild) route = route.firstChild;
                         return route;
                    }),
                    mergeMap(route => route.data)
               )
               .subscribe(data => {
                    if (data['title']) {
                         this.titleService.setTitle(data['title']);
                    } else {
                         this.titleService.setTitle('XRPL App'); // fallback
                    }
               });
     }
}
