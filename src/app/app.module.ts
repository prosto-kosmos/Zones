import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { GojsAngularModule } from 'gojs-angular';
import { AppComponent } from './app.component';

import { InspectorComponent } from './components/inspector/inspector.component';
import { InspectorRowComponent } from './components/inspector/inspector-row.component';
import { AppDiagramComponent } from './components/diagram/diagram.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material';

@NgModule({
  declarations: [
    AppComponent,
    InspectorComponent,
    InspectorRowComponent,
    AppDiagramComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    GojsAngularModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
