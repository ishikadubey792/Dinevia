import { ApiResponse } from './cuisine.model';

/**
 * Backend-driven Legal Document contract
 * Endpoint: GET /api/legal-documents/terms
 */
export interface LegalDocument {
  id: number;
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
}

export type LegalDocumentApiResponse = ApiResponse<LegalDocument>;
