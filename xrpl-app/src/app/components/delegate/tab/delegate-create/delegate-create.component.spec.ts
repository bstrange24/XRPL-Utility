import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelegateCreateComponent } from './delegate-create.component';

describe('DelegateCreateComponent', () => {
  let component: DelegateCreateComponent;
  let fixture: ComponentFixture<DelegateCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelegateCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DelegateCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
