import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TabMenuWithInfoComponent } from './tab-with-info.component';
import { ThemeService } from '../../../../services/utils/theme/theme.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { of } from 'rxjs';

describe('TabMenuWithInfoComponent', () => {
     let component: TabMenuWithInfoComponent;
     let fixture: ComponentFixture<TabMenuWithInfoComponent>;
     let themeService: any;
     let mptStoreService: any;

     // Mock tab configurations
     const mockTabs = [
          { key: 'createMpt', label: 'Create', icon: 'heroPlus', iconType: 'ng-icon', color: '#10b981', iconSize: '20' },
          { key: 'authorizeMpt', label: 'Authorize', icon: 'shield-check', iconType: 'ng-icon', color: '#fbbf24', iconSize: '20' },
          { key: 'lockMpt', label: 'Lock', icon: 'heroLockClosed', iconType: 'ng-icon', color: '#ef4444', iconSize: '20' },
     ];

     const mockMetaMap = {
          createMpt: {
               icon: 'heroPlus',
               colorClass: 'green-button-submenu',
               title: 'Create MPT',
               desc: 'Create a new Multi-Purpose Token.',
               color: '#10b981',
               iconType: 'ng-icon',
               iconSize: '25',
          },
          authorizeMpt: {
               icon: 'shield-check',
               colorClass: 'amber-button-submenu',
               title: 'Authorize MPT',
               desc: 'Authorize MPT token.',
               color: '#fbbf24',
               iconType: 'ng-icon',
               iconSize: '25',
          },
          lockMpt: {
               icon: 'heroLockClosed',
               colorClass: 'red-button-submenu',
               title: 'Lock MPT',
               desc: 'Lock MPT token.',
               color: '#ef4444',
               iconType: 'ng-icon',
               iconSize: '25',
          },
     };

     // Mock auth and lock actions signals
     let authActionSignal: WritableSignal<string>;
     let lockActionSignal: WritableSignal<string>;

     beforeEach(async () => {
          authActionSignal = signal('authorize');
          lockActionSignal = signal('unlock');

          themeService = {
               darkMode$: of(false),
          };

          mptStoreService = {
               authAction: authActionSignal.asReadonly(),
               lockAction: lockActionSignal.asReadonly(),
          };

          await TestBed.configureTestingModule({
               imports: [TabMenuWithInfoComponent],
               providers: [
                    { provide: ThemeService, useValue: themeService },
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(TabMenuWithInfoComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('tabs', mockTabs);
          fixture.componentRef.setInput('active', 'createMpt');
          fixture.componentRef.setInput('metaMap', mockMetaMap);

          fixture.detectChanges();
     });

     afterEach(() => {
          authActionSignal.set('authorize');
          lockActionSignal.set('unlock');
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          // it('should accept tabs input', () => {
          //      expect(component.tabs()).toEqual(mockTabs);
          // });

          it('should accept active input', () => {
               expect(component.active()).toBe('createMpt');
          });

          // it('should accept metaMap input', () => {
          //      expect(component.metaMap()).toEqual(mockMetaMap);
          // });

          it('should update active when changed', () => {
               fixture.componentRef.setInput('active', 'authorizeMpt');
               fixture.detectChanges();
               expect(component.active()).toBe('authorizeMpt');
          });
     });

     describe('Output signals', () => {
          it('should have activeChange output', () => {
               expect(component.activeChange).toBeDefined();
               expect(component.activeChange.emit).toBeDefined();
          });

          it('should emit activeChange when tab is clicked', () => {
               spyOn(component.activeChange, 'emit');
               const tabButtons = fixture.debugElement.queryAll(By.css('button'));
               tabButtons[1].triggerEventHandler('click', null);

               expect(component.activeChange.emit).toHaveBeenCalledWith('authorizeMpt');
          });
     });

     describe('Theme service', () => {
          it('should have isDark signal', () => {
               expect(component.isDark()).toBeFalse();
          });
     });

     describe('getIconColor', () => {
          it('should return meta color when available', () => {
               fixture.componentRef.setInput('active', 'createMpt');
               fixture.detectChanges();

               const color = component.getIconColor();
               expect(color).toBe('#10b981');
          });

          it('should return default light mode color when no color in meta', () => {
               const metaWithoutColor = { ...mockMetaMap.createMpt, color: undefined };
               fixture.componentRef.setInput('metaMap', { createMpt: metaWithoutColor });
               fixture.componentRef.setInput('active', 'createMpt');
               fixture.detectChanges();

               const color = component.getIconColor();
               expect(color).toBe('#2563eb');
          });
     });

     describe('tabButtonClasses', () => {
          it('should return correct classes for single tab', () => {
               fixture.componentRef.setInput('tabs', [mockTabs[0]]);
               fixture.detectChanges();

               const classes = component.tabButtonClasses();
               expect(classes.containerWidth).toBe('w-full');
               expect(classes.containerJustify).toBe('justify-stretch');
               expect(classes.buttonPadding).toBe('px-6 py-3');
               expect(classes.buttonTextSize).toBe('text-base');
               expect(classes.buttonGap).toBe('gap-2');
               expect(classes.iconSize).toBe('20');
          });

          it('should return correct classes for multiple tabs (2-3 tabs)', () => {
               fixture.componentRef.setInput('tabs', mockTabs.slice(0, 2));
               fixture.detectChanges();

               const classes = component.tabButtonClasses();
               expect(classes.containerWidth).toBe('w-fit');
               expect(classes.containerJustify).toBe('justify-start');
               expect(classes.buttonPadding).toBe('px-4 py-2');
               expect(classes.buttonTextSize).toBe('text-sm');
               expect(classes.buttonGap).toBe('gap-1.5');
               expect(classes.iconSize).toBe('16');
          });

          it('should return correct classes for more than 3 tabs', () => {
               fixture.componentRef.setInput('tabs', [...mockTabs, { key: 'send', label: 'Send', icon: 'send', iconType: 'ng-icon', color: '#000', iconSize: '20' }]);
               fixture.detectChanges();

               const classes = component.tabButtonClasses();
               expect(classes.buttonPadding).toBe('px-3 py-2');
               expect(classes.iconSize).toBe('16');
          });
     });

     describe('getButtonClasses', () => {
          it('should return active class when isActive is true', () => {
               const classes = component.getButtonClasses(3, true);
               expect(classes).toContain('active');
               expect(classes).toContain('menu-btn');
          });

          it('should not return active class when isActive is false', () => {
               const classes = component.getButtonClasses(3, false);
               expect(classes).not.toContain('active');
          });

          it('should return correct size classes for single tab', () => {
               const classes = component.getButtonClasses(1, false);
               expect(classes).toContain('px-6 py-3');
               expect(classes).toContain('text-base');
               expect(classes).toContain('gap-2');
          });

          it('should return correct size classes for 2-3 tabs', () => {
               const classes = component.getButtonClasses(2, false);
               expect(classes).toContain('px-4 py-2');
               expect(classes).toContain('text-sm');
               expect(classes).toContain('gap-1.5');
          });

          it('should return correct size classes for more than 3 tabs', () => {
               const classes = component.getButtonClasses(4, false);
               expect(classes).toContain('px-3 py-2');
               expect(classes).toContain('text-sm');
               expect(classes).toContain('gap-1');
          });
     });

     describe('currentMeta', () => {
          it('should return meta for active tab', () => {
               fixture.componentRef.setInput('active', 'createMpt');
               fixture.detectChanges();

               const meta = component.currentMeta();
               expect(meta?.title).toBe('Create MPT');
               expect(meta?.desc).toBe('Create a new Multi-Purpose Token.');
          });

          it('should return undefined for unknown tab', () => {
               fixture.componentRef.setInput('active', 'unknown');
               fixture.detectChanges();

               const meta = component.currentMeta();
               expect(meta).toBeUndefined();
          });

          // it('should update authorizeMpt meta based on authAction', () => {
          //      fixture.componentRef.setInput('active', 'authorizeMpt');
          //      fixture.detectChanges();

          //      let meta = component.currentMeta();
          //      expect(meta?.title).toBe('Authorize MPT');
          //      expect(meta?.icon).toBe('shield-check');
          //      expect(meta?.color).toBe('#fbbf24');

          //      authActionSignal.set('unauthorize');
          //      fixture.detectChanges();

          //      meta = component.currentMeta();
          //      expect(meta?.title).toBe('Revoke MPT Authorization');
          //      expect(meta?.icon).toBe('shield-off');
          //      expect(meta?.color).toBe('#ef4444');
          // });

          // it('should update lockMpt meta based on lockAction', () => {
          //      fixture.componentRef.setInput('active', 'lockMpt');
          //      fixture.detectChanges();

          //      let meta = component.currentMeta();
          //      expect(meta?.title).toBe('Lock MPT');
          //      expect(meta?.icon).toBe('heroLockClosed');
          //      expect(meta?.color).toBe('#ef4444');

          //      lockActionSignal.set('lock');
          //      fixture.detectChanges();

          //      meta = component.currentMeta();
          //      expect(meta?.title).toBe('Lock MPT');

          //      lockActionSignal.set('unlock');
          //      fixture.detectChanges();

          //      meta = component.currentMeta();
          //      expect(meta?.title).toBe('Unlock MPT');
          //      expect(meta?.icon).toBe('heroLockOpen');
          //      expect(meta?.color).toBe('#a855f7');
          // });
     });

     describe('Template rendering', () => {
          it('should render all tab buttons', () => {
               const buttons = fixture.debugElement.queryAll(By.css('button'));
               expect(buttons.length).toBe(3);
               expect(buttons[0].nativeElement.textContent).toContain('Create');
               expect(buttons[1].nativeElement.textContent).toContain('Authorize');
               expect(buttons[2].nativeElement.textContent).toContain('Lock');
          });

          it('should show active tab styling', () => {
               const activeButton = fixture.debugElement.query(By.css('button.active'));
               expect(activeButton).toBeTruthy();
               expect(activeButton.nativeElement.textContent).toContain('Create');
          });

          it('should display submenu info when currentMeta exists', () => {
               const submenuInfo = fixture.debugElement.query(By.css('.submenu-info-text'));
               expect(submenuInfo).toBeTruthy();
               expect(submenuInfo.nativeElement.textContent).toContain('Create MPT');
          });

          it('should display submenu info with dynamic content for authorizeMpt', () => {
               fixture.componentRef.setInput('active', 'authorizeMpt');
               fixture.detectChanges();

               const submenuInfo = fixture.debugElement.query(By.css('.submenu-info-text'));
               expect(submenuInfo.nativeElement.textContent).toContain('Authorize MPT');

               authActionSignal.set('unauthorize');
               fixture.detectChanges();

               expect(submenuInfo.nativeElement.textContent).toContain('Revoke MPT Authorization');
          });

          it('should not display submenu info when no active tab', () => {
               fixture.componentRef.setInput('active', '');
               fixture.detectChanges();

               const submenuInfo = fixture.debugElement.query(By.css('.submenu-info-text'));
               expect(submenuInfo).toBeFalsy();
          });
     });

     describe('Edge cases', () => {
          it('should handle empty tabs array', () => {
               fixture.componentRef.setInput('tabs', []);
               fixture.detectChanges();

               const buttons = fixture.debugElement.queryAll(By.css('button'));
               expect(buttons.length).toBe(0);
          });

          it('should handle single tab', () => {
               fixture.componentRef.setInput('tabs', [mockTabs[0]]);
               fixture.detectChanges();

               const button = fixture.debugElement.query(By.css('button'));
               expect(button).toBeTruthy();
               expect(button.classes['px-6']).toBeTrue();
          });

          it('should handle missing metaMap entry', () => {
               fixture.componentRef.setInput('active', 'nonexistent');
               fixture.detectChanges();

               const submenuInfo = fixture.debugElement.query(By.css('.submenu-info-text'));
               expect(submenuInfo).toBeFalsy();
          });
     });
});
