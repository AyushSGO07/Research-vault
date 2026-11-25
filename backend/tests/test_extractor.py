import os
import tempfile
from pathlib import Path
import pytest
import pymupdf
import docx
from app.services.extractor import DocumentExtractor


@pytest.fixture
def sample_academic_pdf(tmp_path):
    pdf_path = tmp_path / "attention.pdf"
    doc = pymupdf.open()
    
    # Page 1: Academic header with title, authors, DOI, year, abstract
    p1 = doc.new_page(width=612, height=792)
    p1.insert_text(pymupdf.Point(72, 100), "Attention Is All You Need", fontsize=22)
    p1.insert_text(pymupdf.Point(72, 140), "Ashish Vaswani, Noam Shazeer", fontsize=11)
    p1.insert_text(pymupdf.Point(72, 170), "arXiv:1706.03762v5 [cs.CL] 12 Jun 2017", fontsize=9)
    p1.insert_text(pymupdf.Point(72, 190), "doi: 10.48550/arXiv.1706.03762", fontsize=9)
    p1.insert_text(
        pymupdf.Point(72, 230),
        "Abstract: The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer.\n1 Introduction",
        fontsize=10
    )

    # Page 2: Body text
    p2 = doc.new_page(width=612, height=792)
    p2.insert_text(
        pymupdf.Point(72, 100),
        "Recurrent models typically factor computation along the symbol positions of the input and output sequences.",
        fontsize=11
    )

    doc.save(str(pdf_path))
    doc.close()
    return str(pdf_path)


@pytest.fixture
def scanned_image_pdf(tmp_path):
    pdf_path = tmp_path / "scanned.pdf"
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)

    # Create a small dummy image pixmap and insert into page
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 100, 100), 0)
    pix.clear_with(255)
    page.insert_image(pymupdf.Rect(72, 72, 272, 272), pixmap=pix)

    doc.save(str(pdf_path))
    doc.close()
    return str(pdf_path)


@pytest.fixture
def sample_docx(tmp_path):
    docx_path = tmp_path / "sample_paper.docx"
    doc = docx.Document()
    doc.add_heading("Deep Residual Learning for Image Recognition", level=0)
    doc.add_paragraph("Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun")
    doc.add_paragraph("Deeper neural networks are more difficult to train. We present a residual learning framework.")
    
    # Add a table
    table = doc.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Model"
    table.cell(0, 1).text = "Top-5 Error"
    table.cell(1, 0).text = "ResNet-152"
    table.cell(1, 1).text = "3.57%"
    
    doc.save(str(docx_path))
    return str(docx_path)


@pytest.fixture
def sample_txt(tmp_path):
    txt_path = tmp_path / "research_notes.txt"
    # Create ~7000 characters to verify logical page splitting
    content = "Academic research passage.\n\n" * 250
    txt_path.write_text(content, encoding="utf-8")
    return str(txt_path)


def test_pdf_extraction_success(sample_academic_pdf):
    result = DocumentExtractor.extract(sample_academic_pdf)

    assert result["total_pages"] == 2
    assert len(result["pages"]) == 2
    assert result["pages"][0]["page_number"] == 1
    assert result["pages"][1]["page_number"] == 2

    metadata = result["metadata"]
    assert metadata["title"] == "Attention Is All You Need"
    assert "10.48550/arXiv.1706.03762" in metadata["doi"]
    assert metadata["publication_year"] == 2017
    assert metadata["abstract"] is not None
    assert "dominant sequence transduction models" in metadata["abstract"]
    assert metadata["authors"] is not None
    assert "Ashish Vaswani" in metadata["authors"]


def test_scanned_pdf_detection(scanned_image_pdf):
    with pytest.raises(ValueError) as excinfo:
        DocumentExtractor.extract(scanned_image_pdf)
    assert "scanned image" in str(excinfo.value).lower()
    assert "ocr" in str(excinfo.value).lower()


def test_docx_extraction(sample_docx):
    result = DocumentExtractor.extract(sample_docx)

    assert result["total_pages"] >= 1
    assert len(result["pages"]) >= 1
    assert result["pages"][0]["page_number"] == 1
    assert "Deep Residual Learning" in result["pages"][0]["text"]
    assert "ResNet-152" in result["pages"][0]["text"]
    assert result["metadata"]["title"] == "Deep Residual Learning for Image Recognition"
    # Ensure zero synthetic metadata
    assert result["metadata"]["abstract"] is None
    assert result["metadata"]["doi"] is None


def test_txt_extraction(sample_txt):
    result = DocumentExtractor.extract(sample_txt)

    assert result["total_pages"] >= 2
    assert len(result["pages"]) >= 2
    for idx, page in enumerate(result["pages"]):
        assert page["page_number"] == idx + 1
        assert len(page["text"]) > 0
    assert result["metadata"]["title"] == "Research Notes"
    assert result["metadata"]["doi"] is None
