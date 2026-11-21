import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/cuisine.model';
import { LegalDocument } from '../models/legal-document.model';

@Injectable({
  providedIn: 'root'
})
export class LegalDocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Reactive state management using Angular Signals
  readonly activeDocument = signal<LegalDocument | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // In-flight request deduplication
  private inFlightRequest$: Observable<LegalDocument> | null = null;

  /**
   * Fetches active Terms and Conditions from the backend:
   * GET /api/legal-documents/terms
   *
   * - Caches successfully loaded document in-memory.
   * - Prevents duplicate simultaneous HTTP requests.
   * - Safely parses both ApiResponse<LegalDocument> envelope and raw LegalDocument objects.
   * - Sets reactive loading, error, and activeDocument signals.
   *
   * @param forceReload When true, bypasses the in-memory cache and initiates a fresh network request.
   */
  loadActiveTerms(forceReload = false): Observable<LegalDocument> {
    const cached = this.activeDocument();
    if (!forceReload && cached !== null) {
      return of(cached);
    }

    if (!forceReload && this.inFlightRequest$) {
      return this.inFlightRequest$;
    }

    // When explicitly refreshing, clear previous cached document so stale data is never used after an error
    if (forceReload) {
      this.activeDocument.set(null);
    }

    this.loading.set(true);
    this.error.set(null);

    const request$ = this.http
      .get<ApiResponse<LegalDocument> | LegalDocument>(`${this.apiUrl}/legal-documents/terms`)
      .pipe(
        map((res): LegalDocument => {
          let doc: LegalDocument | null = null;

          if (res && typeof res === 'object') {
            if ('data' in res && (res as ApiResponse<LegalDocument>).data) {
              doc = (res as ApiResponse<LegalDocument>).data;
            } else if ('id' in res && 'title' in res) {
              doc = res as LegalDocument;
            }
          }

          if (doc && typeof doc.id === 'number' && typeof doc.title === 'string' && typeof doc.content === 'string') {
            return doc;
          }

          throw new Error('Invalid Terms and Conditions document structure received from backend.');
        }),
        tap((doc) => {
          this.activeDocument.set(doc);
          this.error.set(null);
          this.loading.set(false);
          this.inFlightRequest$ = null;
        }),
        catchError((err) => {
          this.activeDocument.set(null);
          this.loading.set(false);
          this.inFlightRequest$ = null;

          let errorMsg = 'Unable to load Terms and Conditions. Please try again.';
          if (err?.error?.message) {
            errorMsg = err.error.message;
          } else if (err?.status === 0) {
            errorMsg = 'Unable to connect to the server to load Terms and Conditions. Please verify your connection.';
          } else if (err?.message) {
            errorMsg = err.message;
          }

          this.error.set(errorMsg);
          return throwError(() => err);
        }),
        shareReplay(1)
      );

    this.inFlightRequest$ = request$;
    return request$;
  }

  /**
   * Explicitly reloads the active Terms document from the server.
   */
  reloadActiveTerms(): Observable<LegalDocument> {
    return this.loadActiveTerms(true);
  }
}
