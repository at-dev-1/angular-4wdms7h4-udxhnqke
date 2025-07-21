import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal, computed } from "@angular/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { User } from "src/app/models/models";

@Injectable({
    providedIn: 'root'
  })
  export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly currentUserSignal = signal<User | null>(null);
  
    readonly currentUser = computed(() => this.currentUserSignal());
    readonly currentUserId = computed(() => this.currentUser()?.id || '');
    readonly isAuthenticated = computed(() => !!this.currentUser());
  
    getCurrentUser(): Observable<User> {
      return this.http.get<User>('/api/auth/me');
    }
  
    setCurrentUser(user: User): void {
      this.currentUserSignal.set(user);
    }
  
    logout(): Observable<void> {
      return this.http.post<void>('/api/auth/logout', {}).pipe(
        tap(() => this.currentUserSignal.set(null))
      );
    }
  }