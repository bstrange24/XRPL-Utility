import { ComponentFixture, TestBed } from '@angular/core/testing';
import { icons,LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

import { DelegateCreateComponent } from './delegate-create.component';

describe('DelegateCreateComponent', () => {
  let component: DelegateCreateComponent;
  let fixture: ComponentFixture<DelegateCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelegateCreateComponent],
      providers: [{ provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DelegateCreateComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('destinationItems', []);
    fixture.componentRef.setInput('actions', []);
    fixture.componentRef.setInput('selectedActions', new Set<number>());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
