import { RouterOutlet } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { ToastService } from './services/toast/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';

@Component({
     selector: 'app-root',
     standalone: true,
     imports: [RouterOutlet, CommonModule],
     animations: [trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(100%)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(50%)' }))])])],
     templateUrl: './app.component.html',
     styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
     constructor(private titleService: Title, private router: Router, private activatedRoute: ActivatedRoute, public toastService: ToastService) {}

     ngOnInit() {
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
