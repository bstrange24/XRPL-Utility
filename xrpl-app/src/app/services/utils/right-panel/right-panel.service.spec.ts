import { TestBed } from '@angular/core/testing';
import { RightPanelService } from './right-panel.service';

// Mock component for testing
class MockComponent {
     prop1 = 'value1';
     prop2 = 123;
}

describe('RightPanelService', () => {
     let service: RightPanelService;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [RightPanelService],
          });

          service = TestBed.inject(RightPanelService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('initial state', () => {
          it('should have component as null', () => {
               expect(service.component()).toBeNull();
          });

          it('should have inputs as empty object', () => {
               expect(service.inputs()).toEqual({});
          });
     });

     describe('setPanel', () => {
          it('should set component and inputs', () => {
               const inputs = { prop1: 'test', prop2: 456 };

               service.setPanel(MockComponent, inputs);

               expect(service.component()).toBe(MockComponent);
               expect(service.inputs()).toEqual(inputs);
          });

          it('should accept empty inputs', () => {
               service.setPanel(MockComponent);

               expect(service.component()).toBe(MockComponent);
               expect(service.inputs()).toEqual({});
          });

          it('should override previous panel', () => {
               class AnotherComponent {}

               service.setPanel(MockComponent, { prop1: 'first' });
               service.setPanel(AnotherComponent, { prop2: 'second' });

               expect(service.component()).toBe(AnotherComponent);
               expect(service.inputs()).toEqual({ prop2: 'second' });
          });

          it('should handle inputs with matching property names', () => {
               const inputs = {
                    prop1: 'hello',
                    prop2: 42,
               };

               service.setPanel(MockComponent, inputs);

               expect(service.inputs()).toEqual(inputs);
          });

          it('should handle undefined inputs gracefully', () => {
               service.setPanel(MockComponent, undefined);

               expect(service.component()).toBe(MockComponent);
               expect(service.inputs()).toEqual({});
          });
     });

     describe('clearPanel', () => {
          it('should clear component and inputs', () => {
               service.setPanel(MockComponent, { prop1: 'test' });

               service.clearPanel();

               expect(service.component()).toBeNull();
               expect(service.inputs()).toEqual({});
          });

          it('should handle clear when panel is already empty', () => {
               service.clearPanel();

               expect(service.component()).toBeNull();
               expect(service.inputs()).toEqual({});
          });

          it('should allow setting new panel after clear', () => {
               service.setPanel(MockComponent, { prop1: 'first' });
               service.clearPanel();
               service.setPanel(MockComponent, { prop1: 'second' });

               expect(service.component()).toBe(MockComponent);
               expect(service.inputs()).toEqual({ prop1: 'second' });
          });
     });

     describe('reactivity', () => {
          it('should update stored inputs when setPanel is called', () => {
               const inputs1 = { prop1: 'first' };
               const inputs2 = { prop2: 'second' };

               service.setPanel(MockComponent, inputs1);
               expect(service.inputs()).toEqual(inputs1);

               service.setPanel(MockComponent, inputs2);
               expect(service.inputs()).toEqual(inputs2);
          });

          it('should allow reading inputs reactively', () => {
               const inputs = { prop1: 'value', prop2: 999 };
               service.setPanel(MockComponent, inputs);

               const currentInputs = service.inputs();
               expect(currentInputs).toEqual(inputs);
          });
     });
});
