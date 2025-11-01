// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { Buffer } from 'buffer';
import { provideHttpClient } from '@angular/common/http';
import process from 'process';
import { importProvidersFrom } from '@angular/core';

// Make Buffer and process available globally
(window as any).Buffer = Buffer;
(window as any).process = process;

bootstrapApplication(AppComponent, {
     providers: [provideRouter(routes), provideHttpClient(), importProvidersFrom(BrowserAnimationsModule)],
}).catch(err => console.error(err));
