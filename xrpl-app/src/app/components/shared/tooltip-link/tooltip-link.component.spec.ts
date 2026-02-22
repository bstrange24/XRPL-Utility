import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TooltipLinkComponent } from './tooltip-link.component';

describe('TooltipLinkComponent', () => {
  let component: TooltipLinkComponent;
  let fixture: ComponentFixture<TooltipLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipLinkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TooltipLinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
