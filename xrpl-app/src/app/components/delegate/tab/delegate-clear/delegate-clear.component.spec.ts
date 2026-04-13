import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelegateClearComponent } from './delegate-clear.component';

describe('DelegateClearComponent', () => {
  let component: DelegateClearComponent;
  let fixture: ComponentFixture<DelegateClearComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelegateClearComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DelegateClearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
