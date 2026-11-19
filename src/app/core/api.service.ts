import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiStatus {
  status: string;
  app: string;
  version: string;
  endpoints: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBase;

  /** Pregunta al API si está vivo (GET http://localhost:3000/) */
  health(): Observable<ApiStatus> {
    return this.http.get<ApiStatus>(`${this.baseUrl}/`);
  }
}
