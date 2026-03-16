import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DidDeleteComponent } from './did-delete.component';

describe('DidDeleteComponent', () => {
  let component: DidDeleteComponent;
  let fixture: ComponentFixture<DidDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DidDeleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DidDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
