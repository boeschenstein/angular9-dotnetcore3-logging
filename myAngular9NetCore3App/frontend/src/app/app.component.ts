import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'MyFrontend';

  constructor(http: HttpClient) {
    http.get<any[]>('https://localhost:5001/weatherforecast').subscribe(result => {
      console.warn("weatherforecast", result);
    }, error => console.error(error));
  }
  
}
