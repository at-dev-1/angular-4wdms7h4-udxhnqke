import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { GridState } from "@progress/kendo-angular-grid";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { GridStateResponse } from "src/app/corgan-grid-state.directive";
import { SaveGridStateRequest } from "src/app/models/models";

@Injectable({
    providedIn: 'root'
  })
  export class GridStateApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/api/v1/gridstate';
  
    getGridState(gridKey: string, userId: string): Observable<GridState | null> {
      return this.http.get<GridStateResponse>(`${this.baseUrl}/${gridKey}/user/${userId}`).pipe(
        map(response => response.state),
        catchError(error => {
          if (error.status === 404) {
            return of(null);
          }
          throw error;
        })
      );
    }
  
    saveGridState(request: SaveGridStateRequest): Observable<GridStateResponse> {
      return this.http.put<GridStateResponse>(this.baseUrl, request);
    }
  
    getUserGridStates(userId: string, applicationId?: number): Observable<GridStateResponse[]> {
      let params = new HttpParams();
      if (applicationId) {
        params = params.set('applicationId', applicationId.toString());
      }
      return this.http.get<GridStateResponse[]>(`${this.baseUrl}/user/${userId}`, { params });
    }
  
    deleteGridState(gridKey: string, userId: string): Observable<void> {
      return this.http.delete<void>(`${this.baseUrl}/${gridKey}/user/${userId}`);
    }
  }
  