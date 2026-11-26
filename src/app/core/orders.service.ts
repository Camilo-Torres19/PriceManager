import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type OrderStatus = 'pendiente' | 'confirmado' | 'anulado';

export interface Order {
  id: number;
  preventista_id: number;
  client_id: number;
  status: OrderStatus;
  notes: string | null;
  subtotal: number;
  discount_total: number;
  total: number;
  confirmed_by: string | null;
  confirmed_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  client_name: string;
  preventista_name: string;
  items_count?: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  applied_price: number;
  promotion_id: number | null;
  promotion_title: string | null;
  subtotal: number;
}

export interface OrderDetail extends Order {
  client_address: string | null;
  client_phone: string | null;
  items: OrderItem[];
}

/** El API calcula los precios: solo se envían producto y cantidad */
export interface OrderInput {
  client_id: number;
  notes: string | null;
  items: { product_id: number; quantity: number }[];
}

/** Productos pedidos por encima del stock (no bloquea, solo avisa) */
export interface StockWarning {
  product_id: number;
  name: string;
  stock: number;
  quantity: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  preventista_id?: number;
  client_id?: number;
  from?: string; // AAAA-MM-DD
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/orders`;

  list(filters: OrderFilters = {}): Observable<Order[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Order[]>(this.api, { params });
  }

  get(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.api}/${id}`);
  }

  create(body: OrderInput): Observable<{ id: number; total: number; warnings: StockWarning[]; message: string }> {
    return this.http.post<{ id: number; total: number; warnings: StockWarning[]; message: string }>(this.api, body);
  }

  update(id: number, body: OrderInput): Observable<{ total: number; warnings: StockWarning[]; message: string }> {
    return this.http.put<{ total: number; warnings: StockWarning[]; message: string }>(`${this.api}/${id}`, body);
  }

  /** Solo admin. Si no hay stock responde 409 con `shortages` */
  confirm(id: number): Observable<{ message: string; status: OrderStatus }> {
    return this.http.patch<{ message: string; status: OrderStatus }>(`${this.api}/${id}/confirm`, {});
  }

  cancel(id: number, reason: string | null): Observable<{ message: string; status: OrderStatus }> {
    return this.http.patch<{ message: string; status: OrderStatus }>(`${this.api}/${id}/cancel`, { reason });
  }
}

export const STATUS_TEXT: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  anulado: 'Anulado',
};
