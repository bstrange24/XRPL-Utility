import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
     let service: ThemeService;
     let localStorageMock: { [key: string]: string };
     let matchMediaMock: jasmine.Spy;
     let addEventListenerCallback: ((e: { matches: boolean }) => void) | null;
     let classListMock: { add: jasmine.Spy; remove: jasmine.Spy };
     let styleMock: { colorScheme: string };

     beforeEach(() => {
          // Mock localStorage
          localStorageMock = {};
          spyOn(localStorage, 'getItem').and.callFake((key: string) => localStorageMock[key] || null);
          spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
               localStorageMock[key] = value;
          });
          spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
               delete localStorageMock[key];
          });
          spyOn(localStorage, 'clear').and.callFake(() => {
               localStorageMock = {};
          });

          // Mock matchMedia
          addEventListenerCallback = null;
          matchMediaMock = jasmine.createSpy('matchMedia').and.callFake((query: string) => ({
               matches: false,
               addEventListener: (event: string, callback: (e: { matches: boolean }) => void) => {
                    addEventListenerCallback = callback;
               },
               removeEventListener: jasmine.createSpy(),
          }));
          spyOn(window, 'matchMedia').and.callFake(matchMediaMock);

          // Mock document.documentElement
          classListMock = {
               add: jasmine.createSpy('add'),
               remove: jasmine.createSpy('remove'),
          };
          styleMock = { colorScheme: '' };
          Object.defineProperty(document, 'documentElement', {
               value: {
                    classList: classListMock,
                    style: styleMock,
               },
               writable: true,
          });

          // Spy on console.log to suppress output during tests
          spyOn(console, 'log').and.callFake(() => {});
     });

     afterEach(() => {
          // Clean up
          delete (window as any).matchMedia;
     });

     describe('initialization', () => {
          it('should be created', () => {
               service = TestBed.inject(ThemeService);
               expect(service).toBeTruthy();
          });

          it('should use saved preference from localStorage', () => {
               localStorageMock['darkMode'] = 'true';

               service = TestBed.inject(ThemeService);

               expect(service.isDark).toBe(true);
          });

          it('should use system preference when no saved preference', () => {
               matchMediaMock.and.callFake(() => ({
                    matches: true,
                    addEventListener: jasmine.createSpy(),
               }));

               service = TestBed.inject(ThemeService);

               expect(service.isDark).toBe(true);
          });

          it('should default to light mode when no saved preference and system prefers light', () => {
               matchMediaMock.and.callFake(() => ({
                    matches: false,
                    addEventListener: jasmine.createSpy(),
               }));

               service = TestBed.inject(ThemeService);

               expect(service.isDark).toBe(false);
          });
     });

     describe('toggle', () => {
          beforeEach(() => {
               service = TestBed.inject(ThemeService);
          });

          it('should toggle dark mode from false to true', () => {
               expect(service.isDark).toBe(false);

               service.toggle();

               expect(service.isDark).toBe(true);
               expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', 'true');
          });

          // it('should toggle dark mode from true to false', () => {
          //      localStorageMock['darkMode'] = 'true';
          //      service = TestBed.inject(ThemeService);
          //      expect(service.isDark).toBe(true);

          //      service.toggle();

          //      expect(service.isDark).toBe(false);
          //      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', 'false');
          // });
     });

     describe('applyTheme', () => {
          beforeEach(() => {
               service = TestBed.inject(ThemeService);
          });

          it('should add dark class and set color scheme to dark when dark mode is enabled', () => {
               service.toggle();

               expect(classListMock.add).toHaveBeenCalledWith('dark');
               expect(styleMock.colorScheme).toBe('dark');
          });

          it('should remove dark class and set color scheme to light when dark mode is disabled', () => {
               service.toggle();
               service.toggle();

               expect(classListMock.remove).toHaveBeenCalledWith('dark');
               expect(styleMock.colorScheme).toBe('light');
          });
     });

     describe('darkMode$ observable', () => {
          it('should emit initial value', done => {
               service = TestBed.inject(ThemeService);

               service.darkMode$.subscribe(value => {
                    expect(value).toBe(false);
                    done();
               });
          });

          it('should emit new values when toggled', done => {
               service = TestBed.inject(ThemeService);
               const values: boolean[] = [];

               service.darkMode$.subscribe(value => {
                    values.push(value);
                    if (values.length === 2) {
                         expect(values).toEqual([false, true]);
                         done();
                    }
               });

               service.toggle();
          });
     });

     describe('isDark getter', () => {
          it('should return current dark mode value', () => {
               service = TestBed.inject(ThemeService);
               expect(service.isDark).toBe(false);

               service.toggle();
               expect(service.isDark).toBe(true);
          });
     });

     describe('system preference change listener', () => {
          beforeEach(() => {
               matchMediaMock.and.callFake(() => ({
                    matches: false,
                    addEventListener: (event: string, callback: (e: { matches: boolean }) => void) => {
                         addEventListenerCallback = callback;
                    },
               }));

               service = TestBed.inject(ThemeService);
          });

          it('should update dark mode when system preference changes and no saved preference', () => {
               expect(service.isDark).toBe(false);

               if (addEventListenerCallback) {
                    addEventListenerCallback({ matches: true });
               }

               expect(service.isDark).toBe(true);
          });

          it('should not update dark mode when system preference changes and saved preference exists', () => {
               localStorageMock['darkMode'] = 'false';
               service = TestBed.inject(ThemeService);

               if (addEventListenerCallback) {
                    addEventListenerCallback({ matches: true });
               }

               expect(service.isDark).toBe(false);
          });
     });
});
