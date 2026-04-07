import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectSearchDropdownComponent } from './select-search-dropdown.component';

describe('SelectSearchDropdownComponent', () => {
  let component: SelectSearchDropdownComponent;
  let fixture: ComponentFixture<SelectSearchDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectSearchDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectSearchDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
