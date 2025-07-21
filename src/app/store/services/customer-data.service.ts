import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { Customer } from "src/app/model";
import { DataLoadParams, PagedResult } from "src/app/models/models";

@Injectable({
    providedIn: 'root'
  })
  export class CustomersDataService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/api/customers';
  
    getCustomers(params: DataLoadParams): Observable<PagedResult<Customer>> {
      const queryParams = new HttpParams()
        .set('page', params.page.toString())
        .set('pageSize', params.pageSize.toString());
      return this.http.get<PagedResult<Customer>>(this.baseUrl, { params: queryParams });
    }
  }