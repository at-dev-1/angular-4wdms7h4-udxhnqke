import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { Order } from "src/app/model";
import { DataLoadParams, PagedResult } from "src/app/models/models";

@Injectable({
    providedIn: 'root'
  })
  export class OrdersDataService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/api/orders';
  
    getOrders(params: DataLoadParams): Observable<PagedResult<Order>> {
      const queryParams = new HttpParams()
        .set('page', params.page.toString())
        .set('pageSize', params.pageSize.toString())
        .set('filters', params.filters ? JSON.stringify(params.filters) : '')
        .set('sorts', params.sorts ? JSON.stringify(params.sorts) : '');
  
      return this.http.get<PagedResult<Order>>(this.baseUrl, { params: queryParams });
    }
  
    exportOrders(params: DataLoadParams): Observable<Blob> {
      const queryParams = new HttpParams()
        .set('page', params.page.toString())
        .set('pageSize', params.pageSize.toString())
        .set('filters', params.filters ? JSON.stringify(params.filters) : '');
  
      return this.http.get(`${this.baseUrl}/export`, {
        params: queryParams,
        responseType: 'blob'
      });
    }
  }