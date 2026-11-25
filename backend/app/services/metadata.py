import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import pymupdf


class AcademicMetadataExtractor:
    @staticmethod
    def extract_pdf_metadata(
        doc: pymupdf.Document,
        pages_data: List[Dict[str, Any]],
        fallback_filename: str
    ) -> Dict[str, Any]:
        """
        Extract academic paper metadata (Title, Authors, Year, Abstract, DOI)
        using layout heuristics and regex patterns without synthetic fallback data.
        """
        if not pages_data:
            return {
                "title": fallback_filename.replace("_", " ").title(),
                "authors": None,
                "publication_year": None,
                "abstract": None,
                "doi": None,
                "journal": None,
                "domain": "Computer Science",
                "document_type": "Preprint",
            }

        p1_text = pages_data[0]["text"] if len(pages_data) > 0 else ""
        p2_text = pages_data[1]["text"] if len(pages_data) > 1 else ""
        header_text = p1_text + "\n" + p2_text

        # 1. Title heuristic: largest font span in top 45% of page 1
        title = AcademicMetadataExtractor._extract_title(doc, p1_text)

        # 2. DOI
        doi_match = re.search(r'\b10\.\d{4,9}/[-._;()/:A-Za-z0-9]+[A-Za-z0-9]', header_text)
        doi = doi_match.group(0) if doi_match else None

        # 3. Publication Year (1900 - 2099)
        year = None
        for y_match in re.finditer(r'\b(19\d{2}|20\d{2})\b', header_text):
            val = int(y_match.group(1))
            if 1900 <= val <= 2099:
                year = val
                break

        # 4. Abstract
        abs_match = re.search(
            r'(?i)\babstract\b[\s\:\-\—\–\n]*(.*?)(?=\n\s*(?:(?:1\.?\s+)?introduction|keywords|index terms|\Z))',
            header_text,
            re.DOTALL,
        )
        abstract = abs_match.group(1).strip() if abs_match else None
        if abstract:
            # Clean excessive internal newlines
            abstract = re.sub(r'\s+', ' ', abstract).strip()

        # 5. Authors
        authors = AcademicMetadataExtractor._extract_authors(p1_text, title, abstract)

        # Fallback title if font heuristic yielded nothing
        cleaned_title = title if title else fallback_filename.replace("_", " ").title()

        # Domain and Document Type Heuristics
        domain = AcademicMetadataExtractor.extract_domain(cleaned_title, abstract, header_text)
        document_type = AcademicMetadataExtractor.extract_document_type(header_text, "application/pdf")

        return {
            "title": cleaned_title,
            "authors": authors,
            "publication_year": year,
            "abstract": abstract,
            "doi": doi,
            "journal": None,
            "domain": domain,
            "document_type": document_type,
        }

    @staticmethod
    def _extract_title(doc: pymupdf.Document, p1_text: str) -> Optional[str]:
        if len(doc) == 0:
            return None
        p1 = doc[0]
        dict_data = p1.get_text("dict")
        max_size = 0.0
        best_title = None

        page_height = p1.rect.height
        for block in dict_data.get("blocks", []):
            if "lines" in block and block.get("bbox", [0, 0, 0, 0])[1] < page_height * 0.45:
                for line in block["lines"]:
                    for span in line.get("spans", []):
                        txt = span.get("text", "").strip()
                        size = span.get("size", 0.0)
                        if (
                            size > max_size
                            and len(txt) > 5
                            and not re.match(r'(?i)^(arxiv:|ieee|acm|draft|preprint|proceedings)', txt)
                        ):
                            max_size = size
                            best_title = txt

        if best_title:
            best_title = re.sub(r'\s+', ' ', best_title).strip()
        return best_title

    @staticmethod
    def _extract_authors(
        p1_text: str,
        title: Optional[str],
        abstract: Optional[str]
    ) -> Optional[str]:
        lines = [line.strip() for line in p1_text.splitlines() if line.strip()]
        candidate_lines = []
        capture = False if title else True

        for line in lines:
            if title and title in line:
                capture = True
                continue
            if capture:
                if abstract and abstract[:30] in line:
                    break
                if re.search(r'(?i)\b(abstract|introduction|keywords|index terms)\b', line):
                    break
                # Exclude emails, web addresses, or affiliations
                if "@" in line or "http" in line.lower() or "www." in line.lower():
                    continue
                if re.search(r'(?i)\b(university|department|laboratory|institute|school|faculty|corporation|technologies|google|meta|microsoft|research)\b', line):
                    continue
                # Exclude footnote/number markers
                cleaned = re.sub(r'[\d\*\†\‡\§\^]', '', line).strip()
                if cleaned and len(cleaned) > 2:
                    candidate_lines.append(cleaned)

        if candidate_lines:
            # Take top 2 candidate author lines and join
            return ", ".join(candidate_lines[:2])
        return None

    @staticmethod
    def extract_document_type(header_text: str, fallback_mime: str = "application/pdf") -> str:
        if not header_text:
            return "Preprint" if "pdf" in fallback_mime else "Report"

        # Check for arXiv / preprint
        if re.search(r'(?i)\b(arxiv:\s*\d|biorxiv|medrxiv|ssrn|chemrxiv|techrxiv|preprint)\b', header_text):
            return "Preprint"

        # Check for Conference proceedings
        if re.search(r'(?i)\b(proceedings|conference|symposium|workshop|acm\s|ieee\s+conf|annual\s+meeting)\b', header_text):
            return "Conference"

        # Check for Journal
        if re.search(r'(?i)\b(journal\s+of|transactions\s+on|annals\s+of|letters\s+in|volume\s+\d+|issue\s+\d+|nature|science|cell)\b', header_text):
            return "Journal"

        # Check for Book / Chapter
        if re.search(r'(?i)\b(springer\s+nature|cambridge\s+university\s+press|oxford\s+university\s+press|chapter\s+\d+|monograph)\b', header_text):
            return "Book"

        return "Preprint" if "pdf" in fallback_mime else "Report"

    @staticmethod
    def extract_domain(
        title: Optional[str] = None,
        abstract: Optional[str] = None,
        header_text: Optional[str] = None
    ) -> str:
        combined = f"{title or ''} {abstract or ''} {header_text or ''}".lower()
        if not combined.strip():
            return "Computer Science"

        # Domain classification patterns
        domain_patterns = [
            ("Computer Science", r'\b(neural|deep learning|machine learning|transformer|algorithm|artificial intelligence|computational|software|database|nlp|vision|graph network|concurrency|compiler|cybersecurity|reinforcement learning|language model|dataset)\b'),
            ("Physics", r'\b(quantum|relativity|thermodynamic|optics|hadron|astrophysics|particle physics|electromagnet|superconductivity|gravitational|cosmology|plasma)\b'),
            ("Biology", r'\b(genom|protein|cell |cellular|dna|rna|molecular biology|organism|crispr|biological|enzyme|membrane|mutation|phylogen)\b'),
            ("Chemistry", r'\b(chemical|synthesis|catalyst|molecule|organic chemistry|spectroscopy|polymers|crystallography|inorganic|electrochemistry|ligand)\b'),
            ("Medicine", r'\b(clinical|patient|oncology|pathology|therapeutic|cardio|hospital|treatment|pharmacology|disease|trial|biomarker|surgery)\b'),
            ("Mathematics", r'\b(theorem|algebra|topology|manifold|differential equation|combinatorics|probability theory|geometry|stochastic|matrix theory|calculus)\b'),
            ("Engineering", r'\b(mechanical|aerospace|civil engineering|control systems|sensor|semiconductor|actuator|power grid|microfluidic|fluid mechanics)\b'),
            ("Economics", r'\b(macroeconomic|microeconomic|monetary|market dynamics|econometric|financial market|inflation|monopoly|equilibrium|asset pricing)\b'),
        ]

        for domain_name, pattern in domain_patterns:
            if re.search(pattern, combined):
                return domain_name

        return "Computer Science"
