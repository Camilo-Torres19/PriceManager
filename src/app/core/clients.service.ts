import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Client {
  id: number;
  name: string;
  contact_name: string | null;
  nit: string | null;
  address: string | null;
  phone: string | null;
  zone: string | null;
  notes: string | null;
  preventista_id: number | null;
  preventista_name: string | null;
  is_active: number;
  created_by: string | null;
  created_at: string;
}

/** Se envían todos los campos (null si están vacíos) */
export interface ClientInput {
  name: string;
  contact_name: string | null;
  nit: string | null;
  address: string | null;
  phone: string | null;
  zone: string | null;
  notes: string | null;
  /** Solo lo usa el admin; para el preventista el API lo ignora */
  preventista_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/clients`;

  /** Preventista: sus clientes activos. Admin: todos (filtros opcionales) */
  list(filters: { preventista_id?: number; include_inactive?: boolean } = {}): Observable<Client[]> {
    let params = new HttpParams();
    if (filters.preventista_id) params = params.set('preventista_id', filters.preventista_id);
    if (filters.include_inactive) params = params.set('include_inactive', '1');
    return this.http.get<Client[]>(this.api, { params });
  }

  get(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.api}/${id}`);
  }

  create(body: ClientInput): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.api, body);
  }

  update(id: number, body: ClientInput): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/${id}`, body);
  }

  toggle(id: number): Observable<{ message: string; is_active: number }> {
    return this.http.patch<{ message: string; is_active: number }>(`${this.api}/${id}/toggle`, {});
  }
}
