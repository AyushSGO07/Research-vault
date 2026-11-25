const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface DocumentUploadResponse {
  id: number;
  filename: string;
  status: "uploaded" | "processing" | "indexed" | "failed";
  sha256_hash: string;
  is_duplicate: boolean;
  message: string;
}

export interface DocumentStatusResponse {
  id: number;
  filename: string;
  status: "uploaded" | "processing" | "indexed" | "failed";
  error_message?: string | null;
  title?: string | null;
  authors?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  total_pages: number;
  total_chunks: number;
}

export interface DocumentResponse {
  id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  status: "uploaded" | "processing" | "indexed" | "failed";
  error_message?: string | null;
  title?: string | null;
  authors?: string | null;
  publication_year?: number | null;
  abstract?: string | null;
  doi?: string | null;
  journal?: string | null;
  domain?: string | null;
  document_type?: string | null;
  total_pages: number;
  total_chunks: number;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = "An error occurred";
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = "An error occurred";
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.request<UserResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiClient.request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => apiClient.request<UserResponse>("/auth/me"),

  healthCheck: () => apiClient.request<{ status: string }>("/health"),
};

export const documentsApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.uploadFile<DocumentUploadResponse>("/documents/upload", formData);
  },

  getStatus: (id: number) =>
    apiClient.request<DocumentStatusResponse>(`/documents/${id}/status`),

  getById: (id: number) =>
    apiClient.request<DocumentResponse>(`/documents/${id}`),

  list: () =>
    apiClient.request<DocumentResponse[]>("/documents/"),

  getChunks: (id: number) =>
    apiClient.request<DocumentChunkResponse[]>(`/documents/${id}/chunks`),

  getFileUrl: (id: number): string => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    return `${API_BASE_URL}/documents/${id}/file${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  },

  delete: (id: number) =>
    apiClient.request<{ message: string }>(`/documents/${id}`, {
      method: "DELETE",
    }),
};

export interface DocumentChunkResponse {
  id: number;
  document_id: number;
  chunk_index: number;
  page_number: number;
  text: string;
  token_count: number;
  content_hash?: string | null;
  created_at: string;
}

export interface MatchedPassage {
  chunk_id: number;
  chunk_index: number;
  page_number: number;
  text: string;
  score: number;
  token_count: number;
  is_reranked?: boolean;
}

export interface DocumentSearchResult {
  document_id: number;
  title: string;
  filename: string;
  authors?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  domain?: string | null;
  document_type?: string | null;
  total_pages: number;
  total_chunks: number;
  score: number;
  is_reranked?: boolean;
  primary_passage: MatchedPassage;
  additional_passages: MatchedPassage[];
}

export interface SearchResponse {
  query: string;
  mode: "hybrid" | "semantic" | "keyword";
  total_documents: number;
  page: number;
  page_size: number;
  total_pages: number;
  latency_ms: number;
  is_reranked?: boolean;
  sort_by?: "relevance" | "newest" | "oldest";
  results: DocumentSearchResult[];
}

export interface SearchQueryParams {
  query: string;
  mode?: "hybrid" | "semantic" | "keyword";
  page?: number;
  page_size?: number;
  enable_reranking?: boolean;
  year_start?: number;
  year_end?: number;
  author?: string;
  domain?: string;
  document_type?: string;
  sort_by?: "relevance" | "newest" | "oldest";
}

export interface FacetCount {
  name: string;
  count: number;
}

export interface SearchFiltersResponse {
  min_year: number | null;
  max_year: number | null;
  domains: FacetCount[];
  document_types: FacetCount[];
  authors: string[];
}

export const searchApi = {
  query: (params: SearchQueryParams) =>
    apiClient.request<SearchResponse>("/search/", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  getFilters: () =>
    apiClient.request<SearchFiltersResponse>("/search/filters", {
      method: "GET",
    }),
};

export interface CollectionResponse {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionDetailResponse {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  documents: DocumentResponse[];
  created_at: string;
  updated_at: string;
}

export interface CollectionCreate {
  name: string;
  description?: string;
  color?: string;
}

export interface CollectionUpdate {
  name?: string;
  description?: string;
  color?: string;
}

export const collectionsApi = {
  list: () => apiClient.request<CollectionResponse[]>("/collections/"),
  create: (data: CollectionCreate) =>
    apiClient.request<CollectionResponse>("/collections/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (id: number) => apiClient.request<CollectionDetailResponse>(`/collections/${id}`),
  update: (id: number, data: CollectionUpdate) =>
    apiClient.request<CollectionResponse>(`/collections/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiClient.request<{ message: string }>(`/collections/${id}`, {
      method: "DELETE",
    }),
  addDocument: (collId: number, docId: number) =>
    apiClient.request<{ message: string }>(`/collections/${collId}/documents/${docId}`, {
      method: "POST",
    }),
  removeDocument: (collId: number, docId: number) =>
    apiClient.request<{ message: string }>(`/collections/${collId}/documents/${docId}`, {
      method: "DELETE",
    }),
  getCollectionsForDocument: (docId: number) =>
    apiClient.request<number[]>(`/collections/document/${docId}`),
};

export const savedApi = {
  list: () => apiClient.request<DocumentResponse[]>("/saved/"),
  getIds: () => apiClient.request<number[]>("/saved/ids"),
  save: (docId: number) =>
    apiClient.request<{ message: string; saved: boolean }>(`/saved/${docId}`, {
      method: "POST",
    }),
  unsave: (docId: number) =>
    apiClient.request<{ message: string; saved: boolean }>(`/saved/${docId}`, {
      method: "DELETE",
    }),
};

export interface SearchHistoryResponse {
  id: number;
  query: string;
  mode: string;
  result_count: number;
  filters_json?: string | null;
  created_at: string;
}

export const historyApi = {
  list: () => apiClient.request<SearchHistoryResponse[]>("/history/"),
  clear: () =>
    apiClient.request<{ message: string }>("/history/", {
      method: "DELETE",
    }),
  delete: (id: number) =>
    apiClient.request<{ message: string }>(`/history/${id}`, {
      method: "DELETE",
    }),
};

export interface BenchmarkJudgmentResponse {
  id: number;
  query_id: number;
  document_id: number;
  document_title?: string | null;
  relevance_grade: number;
  rationale?: string | null;
  created_at: string;
}

export interface BenchmarkQueryResponse {
  id: number;
  suite_id: number;
  query_text: string;
  category: string;
  difficulty: string;
  judgments: BenchmarkJudgmentResponse[];
  created_at: string;
}

export interface BenchmarkSuiteResponse {
  id: number;
  user_id?: number | null;
  name: string;
  description?: string | null;
  is_default: boolean;
  query_count: number;
  created_at: string;
  updated_at: string;
}

export interface BenchmarkSuiteDetail extends BenchmarkSuiteResponse {
  queries: BenchmarkQueryResponse[];
}

export interface ModeMetrics {
  ndcg_10: number;
  mrr: number;
  precision_1: number;
  precision_5: number;
  precision_10: number;
  recall_5: number;
  recall_10: number;
  map_10: number;
  mean_latency_ms: number;
}

export interface PerModeQueryResult {
  rank: number | null;
  score: number;
  is_hit_top1: boolean;
  is_hit_top5: boolean;
  is_hit_top10: boolean;
}

export interface QueryEvaluationResult {
  query_id: number;
  query_text: string;
  category: string;
  ground_truth_doc_ids: number[];
  ground_truth_titles: string[];
  mode_results: Record<string, PerModeQueryResult>;
  qualitative_insight: string;
}

export interface ComparativeEvaluationReport {
  run_id: number;
  suite_id: number;
  suite_name: string;
  total_queries: number;
  total_documents_judged: number;
  duration_ms: number;
  winner_mode: string;
  mode_metrics: Record<string, ModeMetrics>;
  percentage_gains_over_bm25: Record<string, Record<string, number>>;
  query_breakdowns: QueryEvaluationResult[];
  created_at: string;
}

export interface BenchmarkRunSummary {
  id: number;
  suite_id: number;
  suite_name: string;
  duration_ms: number;
  winner_mode: string;
  aggregate_metrics: Record<string, ModeMetrics>;
  created_at: string;
}

export const evaluationApi = {
  getSuites: () => apiClient.request<BenchmarkSuiteResponse[]>("/evaluation/suites"),
  getSuite: (id: number) => apiClient.request<BenchmarkSuiteDetail>(`/evaluation/suites/${id}`),
  createSuite: (data: { name: string; description?: string }) =>
    apiClient.request<BenchmarkSuiteResponse>("/evaluation/suites", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addQuery: (
    suiteId: number,
    data: {
      query_text: string;
      category?: string;
      difficulty?: string;
      judgments?: Array<{ document_id: number; relevance_grade?: number; rationale?: string }>;
    }
  ) =>
    apiClient.request<BenchmarkQueryResponse>(`/evaluation/suites/${suiteId}/queries`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteSuite: (id: number) =>
    apiClient.request<{ message: string }>(`/evaluation/suites/${id}`, {
      method: "DELETE",
    }),
  runBenchmark: (data?: { suite_id?: number; modes?: string[] }) =>
    apiClient.request<ComparativeEvaluationReport>("/evaluation/run", {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),
  getRuns: () => apiClient.request<BenchmarkRunSummary[]>("/evaluation/runs"),
  getRun: (id: number) => apiClient.request<ComparativeEvaluationReport>(`/evaluation/runs/${id}`),
  exportReport: async (id: number, format: "markdown" | "json" = "markdown"): Promise<string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const res = await fetch(`${API_BASE_URL}/evaluation/export/${id}?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Failed to export report (${res.status}: ${res.statusText})`);
    }
    return res.text();
  },
};

export interface ExternalPaperResult {
  source: "arxiv" | "openalex";
  external_id: string;
  title: string;
  authors: string;
  publication_year?: number | null;
  abstract?: string | null;
  pdf_url?: string | null;
  doi?: string | null;
  journal?: string | null;
  domain?: string | null;
  document_type?: string | null;
  cited_by_count: number;
  already_in_library: boolean;
  library_document_id?: number | null;
}

export interface ExternalSearchResponse {
  results: ExternalPaperResult[];
  total: number;
  page: number;
  page_size: number;
  source: string;
}

export interface ImportPaperRequest {
  source: string;
  external_id: string;
  pdf_url?: string | null;
  title: string;
  authors?: string | null;
  publication_year?: number | null;
  abstract?: string | null;
  doi?: string | null;
  journal?: string | null;
  domain?: string | null;
  document_type?: string | null;
}

export interface ImportPaperResponse {
  document_id: number;
  filename: string;
  status: string;
  is_duplicate: boolean;
  message: string;
}

export const externalApi = {
  search: (
    query: string,
    source: string = "all",
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = "relevance"
  ) => {
    const params = new URLSearchParams({
      query,
      source,
      page: page.toString(),
      page_size: pageSize.toString(),
      sort_by: sortBy,
    });
    return apiClient.request<ExternalSearchResponse>(`/external/search?${params.toString()}`);
  },
  importPaper: (data: ImportPaperRequest) =>
    apiClient.request<ImportPaperResponse>("/external/import", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

