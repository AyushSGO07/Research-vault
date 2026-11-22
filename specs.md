# ResearchVault
## AI Research Paper Search Engine
### Product Requirements & Technical Specification

**Project Name:** ResearchVault  
**Product Type:** Semantic Research Paper Discovery Platform  
**Primary Goal:** Build a modern search engine that helps users discover relevant research papers and academic information using natural language rather than relying exclusively on exact keyword matches.

---

# 1. Product Vision

ResearchVault is a research discovery platform designed for students, researchers, academics, and developers.

Traditional search engines primarily rely on keywords. ResearchVault should understand the meaning and context behind a user's query and retrieve research papers that are conceptually relevant.

Users should be able to:
- Search for research papers using natural language.
- Upload their own research papers and documents.
- Discover relevant passages across multiple documents.
- Find related research even when different terminology is used.
- Filter results using academic metadata.
- Explore document contents without opening every PDF.
- Save useful papers to a personal library.

The application must feel like a professional academic research tool, not a generic AI chatbot.

**Core principle:** Search and discovery come first. AI-assisted features should support the research workflow rather than dominate the interface.

# 2. Design Philosophy & UI/UX

## 2.1 Overall Visual Direction

Create a clean, premium, light-themed academic SaaS interface.

The UI should take inspiration from modern editorial websites, academic platforms, and premium productivity applications.

Avoid:
- Dark mode as the default theme.
- Excessive gradients.
- Glowing borders and neon effects.
- Glassmorphism everywhere.
- Oversized rounded cards.
- Excessive animations.
- Robot illustrations and AI-generated-looking graphics.
- Generic marketing copy such as "Unlock the power of AI" or "Revolutionize your research."

Prefer:
- White and off-white backgrounds.
- Subtle borders.
- Carefully balanced whitespace.
- Clear typography.
- Restrained blue accents.
- Well-organized information.
- Small, meaningful interactions.
- Real document previews and academic metadata.

The result should look like a product that could genuinely be used by a university research department.

## 2.2 Color System

Use the following design tokens:

| Element | Color |
|---|---|
| Main background | #FFFFFF |
| Secondary background | #F7F8FA |
| Sidebar background | #FAFBFC |
| Primary text | #202733 |
| Secondary text | #697586 |
| Muted text | #98A2B3 |
| Primary accent | #315EAB |
| Accent hover | #244B91 |
| Border | #E6E9EF |
| Success | #25845B |
| Warning | #C58A32 |
| Error | #C44747 |

Use blue sparingly for important actions, selected states, links, and interactive elements.

Do not introduce additional accent colors without a design reason.

## 2.3 Typography

Use three font families based on their intended roles.

**Poppins (Regular 400)**
- Primary interface headings.
- Navigation labels.
- Section headings.
- Search page headings.
- Buttons and prominent UI labels.

**Verdana**
- Long-form descriptions.
- Research paper summaries.
- Explanatory paragraphs.
- Dense content where readability is important.

**Roboto**
- Metadata.
- Dates and timestamps.
- Document statistics.
- Small labels.
- Technical information.
- Numerical values.

Font implementation:
- Load Poppins using Google Fonts, with the regular 400 weight as the primary weight.
- Use Verdana with sans-serif fallback.
- Use Roboto with sans-serif fallback.
- Avoid unnecessarily heavy typography.
- Maintain a consistent typographic hierarchy.

Suggested hierarchy:
- Main heading: 32–40px.
- Section heading: 21–25px.
- Card heading: 16–18px.
- Body: 14–15px.
- Metadata: 12–13px.

## 2.4 Layout

Use a responsive layout with:

- Fixed-width sidebar on desktop.
- Flexible central content area.
- Optional contextual panel where required.
- Collapsible sidebar on smaller screens.
- Full-width search interface on mobile.

Use an 8px spacing system.

Cards should have:
- 8–12px border radius.
- Thin neutral borders.
- Minimal shadows.
- Consistent internal spacing.

Avoid excessive rounded pill-shaped components.

# 3. Application Architecture

Build the application using a modular architecture.

## Frontend
- Next.js with TypeScript.
- React.
- Tailwind CSS.
- Lucide icons.
- Reusable component architecture.

## Backend
- Python.
- FastAPI.
- REST API architecture.
- Pydantic for request and response validation.

## Semantic Search
- Sentence Transformers for embeddings.
- ChromaDB or Qdrant for vector storage.
- Cosine similarity for vector retrieval.
- BM25 for keyword-based retrieval.
- Cross-Encoder for reranking.

## Document Processing
- PyMuPDF for PDF extraction.
- python-docx for DOCX extraction.
- Text chunking with LangChain or a custom splitter.

## Database
- PostgreSQL for users, documents, metadata, collections, and saved papers.
- Vector database for document embeddings.

## Deployment
- Frontend: Vercel.
- Backend: Render or another suitable Python hosting service.
- PostgreSQL: Supabase or equivalent.
- Vector database: persistent ChromaDB or Qdrant deployment.

Use environment variables for all credentials and service configurations.

Never hardcode API keys, passwords, or database credentials.

# 4. Application Navigation

Create the following sidebar:

1. Discover
2. Search Papers
3. My Library
4. Collections
5. Upload Documents
6. Search History
7. Settings

At the bottom:
- User profile.
- Account settings.
- Sign out.

The sidebar should remain visually subtle and should not overpower the main workspace.

# 5. Core Pages & Functional Requirements

## 5.1 Discover Page

The Discover page is the application's homepage.

It should contain:

### Header
- Greeting: "Good afternoon."
- Supporting text: "Find research that moves your work forward."
- Profile menu.

### Main Search Section
A prominent search bar with placeholder:

"Search a research topic, concept, or question..."

Include:
- Search button.
- Search icon.
- Clear button.
- Keyboard shortcut hint.
- Optional search suggestions.

Example queries:
- "How does reinforcement learning improve robotic navigation?"
- "Recent developments in solid-state batteries."
- "Applications of machine learning in drug discovery."

These should be illustrative search suggestions, not hardcoded search results.

### Research Categories
Provide a small collection of topic shortcuts:
- Computer Science
- Chemistry
- Physics
- Biology
- Engineering
- Mathematics
- Medicine

Clicking a category should trigger an actual search or category-filtering operation.

### Recent Searches
Display the user's actual recent searches from the database.

### Recently Added Papers
Display documents available in the indexed research collection.

Do not populate this section with fabricated papers or fake statistics.

If no documents exist, display a helpful empty state with an upload action.

## 5.2 Search Papers Page

This is the most important page in ResearchVault.

Build a powerful search interface.

### Search Bar

Support:
- Natural-language queries.
- Multi-word queries.
- Question-based searches.
- Search suggestions.
- Search history.

### Search Filters

Provide:
- Publication year.
- Author.
- Research domain.
- Document type.
- Source.
- Relevance score threshold.

Filters must actually affect the backend query.

### Search Modes

Provide three modes:

**1. Semantic Search**

Convert the query into an embedding and retrieve documents based on vector similarity.

**2. Keyword Search**

Use BM25 to retrieve documents based on lexical relevance.

**3. Hybrid Search**

Combine semantic and keyword retrieval using a configurable fusion strategy such as Reciprocal Rank Fusion (RRF).

Hybrid Search should be the default mode.

### Search Result Cards

Each result should display:

- Research paper title.
- Authors.
- Publication year.
- Journal or conference, when available.
- Short relevant excerpt.
- Document source.
- Relevance score.
- Match type.
- Open document action.
- Save to library action.

Highlight the passages responsible for retrieval when possible.

Do not fabricate relevance scores or paper metadata.

If a field is unavailable, omit it or display "Not available."

### Sorting

Support:
- Most relevant.
- Newest first.
- Oldest first.

### Pagination

Implement server-side pagination or cursor-based retrieval.

Do not load the entire document collection into the browser.

## 5.3 Document Detail Page

When a user opens a paper, display:

### Document Information
- Full title.
- Authors.
- Abstract.
- Publication year.
- Journal or conference.
- DOI, when available.
- Source file.
- Upload date, if user-uploaded.

### Document Viewer

Provide an integrated PDF viewer.

Features:
- Page navigation.
- Zoom controls.
- Download option, subject to document permissions.
- Text selection.
- Page references.

### Relevant Passages

Show the chunks retrieved for the search query.

Each passage should include:
- Extracted text.
- Page number.
- Document title.
- Match score, where available.

Clicking a passage should navigate to the corresponding PDF page when possible.

## 5.4 My Library

Create a personal document library.

Features:
- Uploaded documents.
- Saved research papers.
- Search within personal documents.
- Document status.
- Upload date.
- Delete action.
- Document preview.

Use a clean table/list view with an optional grid view.

Document processing states:
- Uploaded.
- Processing.
- Indexed.
- Failed.

These statuses must come from actual backend processing states.

## 5.5 Collections

Allow users to organize research papers into collections.

Examples:
- Final Year Project.
- Machine Learning Research.
- Polymer Chemistry.
- Literature Review.

Features:
- Create collection.
- Rename collection.
- Delete collection.
- Add or remove papers.
- Search within a collection.

Store collection information in PostgreSQL.

## 5.6 Upload Documents

Create a dedicated upload interface.

Supported formats:
- PDF.
- DOCX.
- TXT.

Features:
- Drag and drop.
- File browser.
- Multiple document uploads.
- File size validation.
- Upload progress.
- Processing status.
- Error reporting.

### Document Ingestion Pipeline

1. Receive uploaded file.
2. Validate extension and MIME type.
3. Validate file size.
4. Generate a unique document ID.
5. Extract text.
6. Extract document metadata.
7. Preserve page references.
8. Clean extracted text.
9. Split text into meaningful chunks.
10. Generate embeddings.
11. Store vectors and metadata.
12. Save document information in PostgreSQL.
13. Mark the document as indexed.

The process must support failures and retries.

Avoid duplicate indexing when the same document is uploaded repeatedly. Use a file hash or another suitable deduplication mechanism.

# 6. Semantic Search Engine

The semantic search engine is the core technical component.

Implement it as a modular, independently testable service.

## 6.1 Text Extraction

Use PyMuPDF for PDF extraction.

Requirements:
- Extract text page by page.
- Preserve page numbers.
- Handle multi-page documents.
- Detect empty or image-only PDFs.
- Handle extraction failures.
- Provide clear processing errors.

For scanned documents, support an optional OCR pipeline using an appropriate OCR library.

## 6.2 Text Chunking

Implement chunking that preserves semantic context.

Initial configuration:
- Chunk size: approximately 800 tokens.
- Chunk overlap: approximately 120 tokens.

These should be configurable.

Store the following metadata with every chunk:
- Chunk ID.
- Document ID.
- Document title.
- Page number or page range.
- Chunk text.
- Author.
- Publication year.
- Source.
- Content hash.

Avoid splitting sentences or sections unnecessarily.

Where practical, preserve headings and paragraph boundaries.

## 6.3 Embedding Generation

Use a Sentence Transformers embedding model.

Recommended initial model:
- sentence-transformers/all-MiniLM-L6-v2.

Requirements:
- Generate embeddings for every indexed chunk.
- Normalize embeddings where appropriate.
- Generate embeddings for user queries.
- Keep the embedding model configurable.
- Use the same embedding model for indexing and querying.
- Batch embedding generation for performance.

Do not generate embeddings repeatedly for unchanged documents.

## 6.4 Vector Database

Use ChromaDB for the initial implementation or Qdrant if persistent deployment and advanced filtering requirements make it a better fit.

Requirements:
- Store document chunk embeddings.
- Store chunk metadata.
- Retrieve top-K similar chunks.
- Support metadata filtering.
- Support document-level deletion.
- Support collection-level isolation.
- Support persistent storage.
- Avoid duplicate vector entries.

Use a clean repository abstraction so the vector database can be changed without rewriting the search engine.

## 6.5 Similarity Search

Implement cosine similarity.

For normalized vectors:

similarity = query_embedding · document_embedding

Return:
- Chunk ID.
- Document ID.
- Similarity score.
- Text.
- Metadata.
- Page reference.

Ensure scores are interpreted correctly. Do not automatically present every similarity score as a calibrated probability.

## 6.6 BM25 Keyword Search

Implement BM25 retrieval independently of vector retrieval.

It should:
- Tokenize queries.
- Index document chunks.
- Retrieve keyword-relevant chunks.
- Return ranked results.
- Support metadata filtering.

## 6.7 Hybrid Retrieval

Implement Reciprocal Rank Fusion.

RRF formula:

RRF(d) = Σ 1 / (k + rank_i(d))

Where:
- d = retrieved document or chunk.
- k = configurable constant, initially 60.
- rank_i = rank from an individual retrieval system.

Combine:
- Vector search results.
- BM25 results.

Deduplicate results and aggregate relevant chunks at the document level.

Make the retrieval strategy configurable.

## 6.8 Reranking

Use a Cross-Encoder model to rerank retrieved candidates.

Recommended initial model:
- cross-encoder/ms-marco-MiniLM-L-6-v2.

Pipeline:
1. Retrieve candidate chunks through hybrid search.
2. Select a configurable candidate pool.
3. Pass query and candidate text pairs to the reranker.
4. Calculate reranking scores.
5. Sort results.
6. Return the top results.

Make reranking optional so its impact can be evaluated.

# 7. Search Evaluation & Analytics

This section is essential.

ResearchVault must provide a way to measure whether its retrieval system actually works.

Implement a benchmark evaluation module.

### Metrics

**Precision@K**

Measures the proportion of retrieved results that are relevant.

**Recall@K**

Measures how many relevant results were successfully retrieved.

**Mean Reciprocal Rank (MRR)**

Measures how highly the first relevant result appears.

**Normalized Discounted Cumulative Gain (NDCG)**

Measures ranking quality while accounting for graded relevance.

### Evaluation Requirements

- Create a benchmark query dataset.
- Include queries with known relevant documents.
- Support human relevance judgments.
- Compare semantic search against keyword search.
- Compare hybrid search against individual retrieval methods.
- Evaluate the impact of reranking.
- Generate evaluation reports.

Do not fabricate benchmark scores.

Clearly distinguish between real evaluation results and example configurations.

# 8. Search Experience & Interaction Details

Implement the following interactions:

- Enter submits a search.
- Escape clears or closes the search suggestion panel.
- Loading indicators during search.
- Search result skeletons.
- Empty states for zero results.
- Clear filters action.
- Search history persistence.
- Save and unsave papers.
- Toast notifications for successful actions.
- Confirmation before deleting documents.

Every interactive control must have a working function.

Avoid decorative buttons that do nothing.

# 9. Backend API Design

Create a clean FastAPI backend.

Suggested endpoints:

### Search

POST /api/search

Request:
- query
- search_mode
- filters
- page
- page_size
- collection_id

Response:
- results
- total_results
- query_time_ms
- search_mode
- pagination
- applied_filters

### Documents

POST /api/documents/upload

GET /api/documents

GET /api/documents/{document_id}

DELETE /api/documents/{document_id}

GET /api/documents/{document_id}/status

### Collections

POST /api/collections

GET /api/collections

PATCH /api/collections/{collection_id}

DELETE /api/collections/{collection_id}

### Saved Papers

POST /api/saved-papers

GET /api/saved-papers

DELETE /api/saved-papers/{paper_id}

### Search History

GET /api/search-history

DELETE /api/search-history

### Evaluation

POST /api/evaluation/run

GET /api/evaluation/results

Use proper HTTP status codes, validation, structured error responses, and API documentation.

# 10. Database Design

Use PostgreSQL for structured application data.

Suggested tables:

### users
- id
- name
- email
- password_hash
- created_at

### documents
- id
- owner_id
- title
- filename
- file_hash
- file_path
- authors
- publication_year
- abstract
- doi
- processing_status
- created_at

### document_chunks
- id
- document_id
- chunk_index
- page_number
- content
- content_hash

### collections
- id
- owner_id
- name
- description
- created_at

### collection_documents
- collection_id
- document_id

### saved_papers
- id
- owner_id
- document_id
- created_at

### search_history
- id
- owner_id
- query
- search_mode
- created_at

Define appropriate foreign keys, indexes, uniqueness constraints, and cascading deletion rules.

Store vectors in the vector database, not as an unstructured substitute for PostgreSQL.

# 11. UI Components

Create reusable components:

- AppSidebar
- TopNavigation
- SearchBar
- SearchSuggestions
- SearchFilters
- SearchResultCard
- SearchResultList
- RelevanceIndicator
- DocumentMetadata
- DocumentViewer
- RelevantPassage
- UploadDropzone
- ProcessingStatus
- CollectionCard
- EmptyState
- LoadingSkeleton
- ToastNotification
- ConfirmationDialog
- UserProfileMenu

Use consistent styling across all pages.

# 12. Security & Reliability

Implement:
- Authentication.
- Secure password hashing.
- Authorization for user-owned documents.
- File type validation.
- File size restrictions.
- Upload rate limiting.
- Input validation.
- Secure file storage.
- Protected API routes.
- Environment variable management.
- Error logging.
- Database transactions where necessary.

Users must not be able to access another user's private documents or collections.

Never expose raw internal file paths or credentials to the frontend.

# 13. Performance Requirements

- Use asynchronous processing for document ingestion.
- Avoid blocking API requests during large embedding operations.
- Batch embedding generation.
- Cache repeated query embeddings where appropriate.
- Use pagination.
- Add appropriate database indexes.
- Avoid unnecessary frontend rerenders.
- Optimize PDF rendering.
- Provide meaningful loading states.

Make chunk size, overlap, top-K, candidate pool size, and reranking settings configurable.

# 14. Project Structure

Use a modular project structure similar to:

researchvault/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   └── public/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── ingestion/
│   │   │   ├── extraction/
│   │   │   ├── chunking/
│   │   │   ├── embeddings/
│   │   │   ├── retrieval/
│   │   │   ├── reranking/
│   │   │   └── evaluation/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
│
├── storage/
├── evaluation/
├── docs/
├── .env.example
├── .gitignore
└── README.md

Adjust the structure if needed, but preserve separation between UI, API, business logic, and retrieval services.

# 15. Implementation Phases

Build the project in the following order.

## Phase 1 — Foundation
- Initialize frontend and backend.
- Configure database.
- Set up API communication.
- Establish design system.
- Build sidebar and navigation.
- Create responsive page layouts.

## Phase 2 — Document Ingestion
- Implement file uploads.
- Extract text.
- Extract metadata.
- Implement chunking.
- Store document records.
- Add processing status.

## Phase 3 — Semantic Search
- Integrate embedding model.
- Configure vector database.
- Generate and store embeddings.
- Implement cosine similarity retrieval.
- Build search API.
- Connect frontend search interface.

## Phase 4 — Advanced Retrieval
- Implement BM25.
- Implement hybrid retrieval.
- Integrate Reciprocal Rank Fusion.
- Implement Cross-Encoder reranking.
- Add metadata filters.
- Add result aggregation.

## Phase 5 — Research Workspace
- Build document detail page.
- Add PDF viewer.
- Implement personal library.
- Add collections.
- Implement saved papers.
- Add search history.

## Phase 6 — Evaluation & Optimization
- Create benchmark dataset.
- Implement retrieval metrics.
- Compare retrieval strategies.
- Optimize query performance.
- Add automated tests.
- Fix edge cases.

## Phase 7 — Deployment
- Configure production environment.
- Deploy frontend.
- Deploy backend.
- Configure PostgreSQL.
- Configure persistent vector storage.
- Test document uploads in production.
- Test actual search functionality.
- Write deployment documentation.

# 16. Critical Antigravity Development Instructions

Follow these instructions throughout development.

1. First inspect the existing repository before modifying or generating files.
2. Read this specification completely.
3. Create a technical implementation plan.
4. Establish the architecture before writing application code.
5. Build actual functionality rather than static visual mockups.
6. Do not use hardcoded JSON to simulate search results.
7. Do not generate fake research papers, fake authors, fake search metrics, or fabricated relevance scores.
8. Connect every frontend action to a working backend operation.
9. Implement proper loading, error, empty, and success states.
10. Keep frontend and backend independently maintainable.
11. Write reusable components and avoid unnecessary duplication.
12. Validate each implementation phase before moving to the next.
13. Add unit and integration tests for the retrieval pipeline.
14. Do not silently replace failed functionality with dummy responses.
15. Document all configuration requirements and environment variables.

If an external service is unavailable, provide a clear setup instruction rather than pretending the integration works.

Use freely accessible research datasets or genuine user-uploaded documents for testing. Keep test fixtures clearly separated from production data.

# 17. Definition of Done

The project is considered complete when:

- A user can upload genuine research PDFs.
- Text is extracted correctly.
- Chunks retain document and page references.
- Embeddings are generated and persisted.
- Semantic search returns relevant results.
- Keyword search works independently.
- Hybrid search combines both retrieval strategies.
- Reranking changes result ordering when justified.
- Metadata filters work.
- Search results show real source information.
- Users can open and navigate documents.
- Users can save papers and create collections.
- Search evaluation produces actual metrics.
- The interface is responsive and visually consistent.
- Errors and empty states are handled correctly.
- The application can be deployed and used without relying on mock data.

---

# Final Product Direction

ResearchVault should feel like a well-designed academic research workspace.

It should prioritize three things:

1. **Discoverability:** Find relevant research without knowing the exact keywords.
2. **Accuracy:** Retrieve meaningful passages and rank them intelligently.
3. **Usability:** Make reading, organizing, and exploring research papers effortless.

Build a dependable search engine first. Add intelligence where it provides measurable value.

The final product should demonstrate a genuine understanding of information retrieval, vector databases, embeddings, hybrid search, reranking, and search evaluation.