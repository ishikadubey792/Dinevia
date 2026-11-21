import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LegalDocumentService } from './legal-document.service';
import { LegalDocument } from '../models/legal-document.model';
import { ApiResponse } from '../models/cuisine.model';
import { environment } from '../../../environments/environment';

describe('LegalDocumentService', () => {
  let service: LegalDocumentService;
  let httpTesting: HttpTestingController;

  const mockTermsDoc: LegalDocument = {
    id: 1,
    title: 'Dinevia Terms and Conditions',
    content: '<h2>Account Registration</h2><p>Welcome to Dinevia terms...</p>',
    version: '1.0',
    effectiveDate: '2026-11-21'
  };

  const mockTermsEnvelope: ApiResponse<LegalDocument> = {
    statusCode: 200,
    message: 'Active terms fetched successfully.',
    data: mockTermsDoc
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LegalDocumentService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(LegalDocumentService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should initialize with default empty state', () => {
    expect(service.activeDocument()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('should fetch and unwrap Terms from an ApiResponse envelope', () => {
    let result: LegalDocument | undefined;

    service.loadActiveTerms().subscribe({
      next: (doc) => (result = doc)
    });

    expect(service.loading()).toBe(true);

    const req = httpTesting.expectOne(`${environment.apiUrl}/legal-documents/terms`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTermsEnvelope);

    expect(result).toEqual(mockTermsDoc);
    expect(service.activeDocument()).toEqual(mockTermsDoc);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('should fetch and unwrap Terms when backend returns raw LegalDocument object directly', () => {
    let result: LegalDocument | undefined;

    service.loadActiveTerms().subscribe({
      next: (doc) => (result = doc)
    });

    const req = httpTesting.expectOne(`${environment.apiUrl}/legal-documents/terms`);
    req.flush(mockTermsDoc);

    expect(result).toEqual(mockTermsDoc);
    expect(service.activeDocument()).toEqual(mockTermsDoc);
    expect(service.loading()).toBe(false);
  });

  it('should cache successfully loaded Terms and avoid duplicate HTTP calls', () => {
    // First load
    service.loadActiveTerms().subscribe();
    const req1 = httpTesting.expectOne(`${environment.apiUrl}/legal-documents/terms`);
    req1.flush(mockTermsEnvelope);

    expect(service.activeDocument()).toEqual(mockTermsDoc);

    // Second call should return cached value without another HTTP request
    let secondResult: LegalDocument | undefined;
    service.loadActiveTerms().subscribe({
      next: (doc) => (secondResult = doc)
    });

    httpTesting.expectNone(`${environment.apiUrl}/legal-documents/terms`);
    expect(secondResult).toEqual(mockTermsDoc);
  });

  it('should deduplicate simultaneous in-flight requests', () => {
    let res1: LegalDocument | undefined;
    let res2: LegalDocument | undefined;

    service.loadActiveTerms().subscribe((d) => (res1 = d));
    service.loadActiveTerms().subscribe((d) => (res2 = d));

    // Only one HTTP request should be triggered
    const req = httpTesting.expectOne(`${environment.apiUrl}/legal-documents/terms`);
    req.flush(mockTermsEnvelope);

    expect(res1).toEqual(mockTermsDoc);
    expect(res2).toEqual(mockTermsDoc);
  });

  it('should bypass cache and perform a new network request when reloadActiveTerms() is called', () => {
    // Initial fetch
    service.loadActiveTerms().subscribe();
    const req1 = httpTesting.expectOne(`${environment.apiUrl}/legal-documents/terms`);
    req1.flush(mockTermsEnvelope);

    const updatedTerms: LegalDocument = {
      ...mockTermsDoc,
      version: '2.0',
      title: 'Dinevia Terms and Conditions v2.0'
    };

    // Force reload
    let reloadedDoc: LegalDocument | undefined;
    service.reloadActiveTerms().subscribe({
      next: (doc) => (reloadedDoc = doc)
    });

    const req2 = httpTesting.expectOne(`${environment.apiUrl}/legal-documents/terms`);
    req2.flush({ statusCode: 200, message: 'Updated', data: updatedTerms });

    expect(reloadedDoc?.version).toBe('2.0');
    expect(service.activeDocument()?.version).toBe('2.0');
  });

  it('should handle API failure cleanly, set error signal, and not retain stale cached document', () => {
    // First load succeeds
    service.loadActiveTerms().subscribe();
    const req1 = httpTesting.expectOne(`${environment.apiUrl}/legal-documents/terms`);
    req1.flush(mockTermsEnvelope);
    expect(service.activeDocument()).toEqual(mockTermsDoc);

    // Forced reload fails
    let errorReceived: any;
    service.reloadActiveTerms().subscribe({
      error: (err) => (errorReceived = err)
    });

    const req2 = httpTesting.expectOne(`${environment.apiUrl}/legal-documents/terms`);
    req2.flush({ message: 'Terms document unavailable' }, { status: 500, statusText: 'Server Error' });

    expect(errorReceived).toBeDefined();
    expect(service.activeDocument()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.error()).toContain('Terms document unavailable');
  });
});
