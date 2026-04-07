import { trigger, style, animate, transition } from '@angular/animations';

export const animation = trigger('tabTransition', [
     transition('* => *', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          animate(
               '300ms cubic-bezier(0.4, 0, 0.2, 1)',
               style({
                    opacity: 1,
                    transform: 'translateY(0)',
               })
          ),
     ]),
]);

export const toastAnimation = trigger('toastAnimation', [
     transition(':enter', [
          style({
               opacity: 0,
               transform: 'translateY(-12px) scale(0.95)',
          }),
          animate(
               '180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
               style({
                    opacity: 1,
                    transform: 'translateY(0) scale(1)',
               })
          ),
     ]),

     transition(':leave', [
          animate(
               '160ms ease-in',
               style({
                    opacity: 0,
                    transform: 'translateY(-10px) scale(0.96)',
               })
          ),
     ]),
]);
