import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldHelperComponent } from './field-helper.component';

describe('FieldHelperComponent', () => {
  let component: FieldHelperComponent;
  let fixture: ComponentFixture<FieldHelperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldHelperComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FieldHelperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
