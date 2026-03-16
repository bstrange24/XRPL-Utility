import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DidSetComponent } from './did-set.component';

describe('DidSetComponent', () => {
  let component: DidSetComponent;
  let fixture: ComponentFixture<DidSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DidSetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DidSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
