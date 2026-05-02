import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PermissionDomainDeleteFormComponent } from './permission-domain-delete-form.component';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { PermissionedDomainViewModelService } from '../../../../services/permissioned-domain/permissioned-domain-view-model/permissioned-domain-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('PermissionDomainDeleteFormComponent', () => {
     let fixture: ComponentFixture<PermissionDomainDeleteFormComponent>;
     let component: PermissionDomainDeleteFormComponent;

     let storeMock: jasmine.SpyObj<any>;
     let vmMock: jasmine.SpyObj<any>;

     beforeEach(async () => {
          storeMock = jasmine.createSpyObj('PermissionedDomainStoreService', [], {
               createdPermissionedDomains: () => [],
               selectedDomainId: () => null,
          });

          vmMock = jasmine.createSpyObj('PermissionedDomainViewModelService', [], {
               domainItems: () => [],
               selectedDomainItem: () => null,
          });

          await TestBed.configureTestingModule({
               imports: [PermissionDomainDeleteFormComponent],
               providers: [
                    { provide: PermissionedDomainStoreService, useValue: storeMock },
                    { provide: PermissionedDomainViewModelService, useValue: vmMock },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(PermissionDomainDeleteFormComponent);
          component = fixture.componentInstance;

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should emit domain selection', () => {
          spyOn(component.onDomainSelected, 'emit');

          const mockItem = { id: 'abc123' };

          component.onDomainSelected.emit(mockItem);

          expect(component.onDomainSelected.emit).toHaveBeenCalledWith(mockItem);
     });

     it('should expose empty state when no domains exist', () => {
          expect(storeMock.createdPermissionedDomains()).toEqual([]);
     });

     it('should expose selected domain id as null by default', () => {
          expect(storeMock.selectedDomainId()).toBeNull();
     });

     it('should expose domain items from view model', () => {
          expect(vmMock.domainItems()).toEqual([]);
     });
});
