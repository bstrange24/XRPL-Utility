import { trigger, style, animate, transition } from '@angular/animations';

export const dropDownAnimation = trigger('fadeSlideDown', [
     transition(':enter', [
          style({ opacity: 0, transform: 'translateY(-8px)' }),
          animate(
               '200ms ease-out',
               style({
                    opacity: 1,
                    transform: 'translateY(0)',
               })
          ),
     ]),
]);

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
               transform: 'translateY(30px) scale(0.95)',
          }),
          animate(
               '280ms cubic-bezier(0.34, 1.56, 0.64, 1)', // nice bouncy pop-in
               style({
                    opacity: 1,
                    transform: 'translateY(0) scale(1)',
               })
          ),
     ]),

     transition(':leave', [
          animate(
               '220ms cubic-bezier(0.4, 0, 1, 1)',
               style({
                    opacity: 0,
                    transform: 'translateY(15px) scale(0.95)',
               })
          ),
     ]),
]);

export const expandCollapse = trigger('expandCollapse', [
     transition(':enter', [
          style({
               height: 0,
               opacity: 0,
               overflow: 'hidden',
          }),
          animate(
               '320ms cubic-bezier(0.4, 0.0, 0.2, 1)',
               style({
                    height: '*',
                    opacity: 1,
               })
          ),
     ]),

     transition(':leave', [
          style({
               overflow: 'hidden',
          }),
          animate(
               '280ms cubic-bezier(0.4, 0.0, 0.2, 1)',
               style({
                    height: 0,
                    opacity: 0,
               })
          ),
     ]),
]);

// export const expandCollapse = trigger('expandCollapse', [
//      transition(':enter', [
//           style({
//                height: 0,
//                maxHeight: 0,
//                opacity: 0,
//                paddingTop: 0,
//                paddingBottom: 0,
//           }),
//           animate(
//                '320ms cubic-bezier(0.4, 0, 0.2, 1)',
//                style({
//                     height: '*',
//                     maxHeight: '9999px',
//                     opacity: 1,
//                     paddingTop: '*',
//                     paddingBottom: '*',
//                })
//           ),
//      ]),

//      transition(':leave', [
//           animate(
//                '280ms cubic-bezier(0.4, 0, 0.2, 1)',
//                style({
//                     height: 0,
//                     maxHeight: 0,
//                     opacity: 0,
//                     paddingTop: 0,
//                     paddingBottom: 0,
//                })
//           ),
//      ]),
// ]);
