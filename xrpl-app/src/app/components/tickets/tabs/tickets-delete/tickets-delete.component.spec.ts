import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketsDeleteComponent } from './tickets-delete.component';

describe('TicketsDeleteComponent', () => {
  let component: TicketsDeleteComponent;
  let fixture: ComponentFixture<TicketsDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketsDeleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketsDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
