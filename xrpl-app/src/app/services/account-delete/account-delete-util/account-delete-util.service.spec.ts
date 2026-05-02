import { TestBed } from '@angular/core/testing';
import { AccountDeleteUtilService } from './account-delete-util.service';

describe('AccountDeleteUtilService', () => {
     let service: AccountDeleteUtilService;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [AccountDeleteUtilService],
          });

          service = TestBed.inject(AccountDeleteUtilService);
     });

     it('should create service', () => {
          expect(service).toBeTruthy();
     });

     it('should strip simple HTML tags', () => {
          const input = '<div>Hello</div>';
          const result = service.stripHtml(input);

          expect(result).toBe('Hello');
     });

     it('should strip nested HTML tags', () => {
          const input = '<div><p>Hello <b>World</b></p></div>';
          const result = service.stripHtml(input);

          expect(result).toBe('Hello World');
     });

     it('should strip self-closing and malformed tags', () => {
          const input = '<br/>Hello<img src="x"/>';
          const result = service.stripHtml(input);

          expect(result).toBe('Hello');
     });

     it('should handle text without HTML safely', () => {
          const input = 'Plain text only';
          const result = service.stripHtml(input);

          expect(result).toBe('Plain text only');
     });

     it('should handle empty string', () => {
          const result = service.stripHtml('');

          expect(result).toBe('');
     });

     it('should remove angle-bracket-like HTML fragments', () => {
          const input = 'Hello <invalid> world </invalid>';
          const result = service.stripHtml(input);

          expect(result).toBe('Hello  world ');
     });

     it('should preserve whitespace after stripping', () => {
          const input = '<p>Hello</p>   <span>World</span>';
          const result = service.stripHtml(input);

          expect(result).toBe('Hello   World');
     });
});
