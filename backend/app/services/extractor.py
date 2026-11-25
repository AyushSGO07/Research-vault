import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import pymupdf
import docx
from app.services.metadata import AcademicMetadataExtractor


class DocumentExtractor:
    @staticmethod
    def extract(file_path: str, mime_type: Optional[str] = None) -> Dict[str, Any]:
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext == ".pdf":
            return DocumentExtractor._extract_pdf(file_path)
        elif ext == ".docx":
            return DocumentExtractor._extract_docx(file_path)
        elif ext == ".txt":
            return DocumentExtractor._extract_txt(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")

    @staticmethod
    def _extract_pdf(file_path: str) -> Dict[str, Any]:
        doc = pymupdf.open(file_path)
        pages_data: List[Dict[str, Any]] = []
        total_text_chars = 0
        has_images = False

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            # Clean stray hyphenation across line breaks
            text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
            total_text_chars += len(text.strip())
            if len(page.get_images()) > 0:
                has_images = True
            pages_data.append({"page_number": page_num + 1, "text": text})

        # Scanned PDF detection
        if total_text_chars < 50 and len(doc) > 0 and has_images:
            raise ValueError(
                "This PDF appears to be a scanned image with no selectable text. "
                "Optical Character Recognition (OCR) will be supported in v2."
            )

        metadata = AcademicMetadataExtractor.extract_pdf_metadata(
            doc, pages_data, Path(file_path).stem
        )

        return {
            "pages": pages_data,
            "total_pages": len(doc),
            "metadata": metadata,
        }

    @staticmethod
    def _extract_docx(file_path: str) -> Dict[str, Any]:
        doc = docx.Document(file_path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_str = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                if row_str:
                    paragraphs.append(row_str)

        full_text = "\n\n".join(paragraphs)
        page_size = 3000
        pages_data: List[Dict[str, Any]] = []
        if full_text:
            for i, start in enumerate(range(0, len(full_text), page_size)):
                pages_data.append({
                    "page_number": i + 1,
                    "text": full_text[start:start + page_size]
                })
        else:
            pages_data = [{"page_number": 1, "text": ""}]

        title = paragraphs[0][:200] if paragraphs else Path(file_path).stem.replace("_", " ").title()

        return {
            "pages": pages_data,
            "total_pages": len(pages_data),
            "metadata": {
                "title": title,
                "authors": None,
                "publication_year": None,
                "abstract": None,
                "doi": None,
                "journal": None,
                "domain": AcademicMetadataExtractor.extract_domain(title, None, full_text[:1000]),
                "document_type": "Report",
            },
        }

    @staticmethod
    def _extract_txt(file_path: str) -> Dict[str, Any]:
        raw_bytes = Path(file_path).read_bytes()
        try:
            full_text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            full_text = raw_bytes.decode("latin-1", errors="replace")

        page_size = 3000
        pages_data: List[Dict[str, Any]] = []
        if full_text:
            for i, start in enumerate(range(0, len(full_text), page_size)):
                pages_data.append({
                    "page_number": i + 1,
                    "text": full_text[start:start + page_size]
                })
        else:
            pages_data = [{"page_number": 1, "text": ""}]

        return {
            "pages": pages_data,
            "total_pages": len(pages_data),
            "metadata": {
                "title": Path(file_path).stem.replace("_", " ").title(),
                "authors": None,
                "publication_year": None,
                "abstract": None,
                "doi": None,
                "journal": None,
                "domain": AcademicMetadataExtractor.extract_domain(Path(file_path).stem, None, full_text[:1000]),
                "document_type": "Report",
            },
        }
