import { TestBed } from '@angular/core/testing';
import { PerformanceBaseComponent } from './performance-base.component';
import { XrplService } from '../../../services/xrpl-services/xrpl.service';

/**
 * Test wrapper because methods are protected
 */
class TestPerformanceBaseComponent extends PerformanceBaseComponent {
     public runWithPerf<T>(name: string, fn: () => Promise<T>) {
          return this.withPerf(name, fn);
     }

     public runMeasure<T>(label: string, clear: boolean, fn: () => Promise<T>) {
          return this.measure(label, clear, fn);
     }

     public getEnv() {
          return this.environment();
     }
}

describe('PerformanceBaseComponent', () => {
     let component: TestPerformanceBaseComponent;

     let xrplServiceMock: jasmine.SpyObj<XrplService>;

     beforeEach(() => {
          xrplServiceMock = jasmine.createSpyObj<XrplService>('XrplService', ['getNet']);

          TestBed.configureTestingModule({
               providers: [{ provide: XrplService, useValue: xrplServiceMock }, TestPerformanceBaseComponent],
          });

          component = TestBed.inject(TestPerformanceBaseComponent);
     });

     beforeEach(() => {
          // Mock environment default
          xrplServiceMock.getNet.and.returnValue({
               environment: 'devnet',
          } as any);

          // Mock performance API for stability - check if already spied
          if (!jasmine.isSpy(performance.mark)) {
               spyOn(performance, 'mark');
          }
          if (!jasmine.isSpy(performance.measure)) {
               spyOn(performance, 'measure');
          }
          if (!jasmine.isSpy(performance.clearMarks)) {
               spyOn(performance, 'clearMarks');
          }
          if (!jasmine.isSpy(performance.clearMeasures)) {
               spyOn(performance, 'clearMeasures');
          }
          if (!jasmine.isSpy(performance.getEntriesByName)) {
               spyOn(performance, 'getEntriesByName').and.returnValue([{ duration: 123.45 } as PerformanceEntry]);
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should return environment from xrplService', () => {
          xrplServiceMock.getNet.and.returnValue({ environment: 'testnet' } as any);

          expect(component.getEnv()).toBe('testnet');
     });

     it('should run withPerf and set execution time', async () => {
          await component.runWithPerf('test', async () => {
               return 'ok';
          });

          expect(component['executionTime']()).toContain('Execution time');
     });

     it('should run measure and clear performance marks', async () => {
          await component.runMeasure('label', true, async () => {
               return 123;
          });

          expect(performance.mark).toHaveBeenCalled();
          expect(performance.measure).toHaveBeenCalled();
          expect(performance.clearMarks).toHaveBeenCalled();
          expect(performance.clearMeasures).toHaveBeenCalled();
     });
});
