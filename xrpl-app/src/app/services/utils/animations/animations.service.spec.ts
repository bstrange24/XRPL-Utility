import { animation } from '@angular/animations';
import { toastAnimation } from './animations.service';

describe('Animations', () => {
     describe('tabTransition', () => {
          it('should be defined', () => {
               expect(animation).toBeDefined();
          });

          // it('should have name "tabTransition"', () => {
          //      expect(animation.name).toBe('tabTransition');
          // });
     });

     describe('toastAnimation', () => {
          it('should be defined', () => {
               expect(toastAnimation).toBeDefined();
          });

          it('should have name "toastAnimation"', () => {
               expect(toastAnimation.name).toBe('toastAnimation');
          });
     });
});
