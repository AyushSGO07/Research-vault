"""
Corpus Seeder for ResearchVault.
Idempotently indexes canonical machine learning and information retrieval research papers
into the database, vector store (ChromaDB), and BM25 token index for instant demonstration
and benchmark evaluation.
"""

import os
import sys
import hashlib
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.security import get_password_hash
from app.database.session import SessionLocal, init_db
from app.models.user import User
from app.models.document import Document
from app.services.ingestion import process_document_background
from app.services.eval_service import EvaluationService

# Demo credentials
DEMO_EMAIL = "demo@researchvault.edu"
DEMO_PASSWORD = "DemoPassword123!"
DEMO_NAME = "Dr. Alan Turing"

CANONICAL_PAPERS = [
    {
        "filename": "Attention_Is_All_You_Need.pdf",
        "title": "Attention Is All You Need",
        "authors": "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin",
        "publication_year": 2017,
        "domain": "Computer Science",
        "document_type": "Conference Paper",
        "doi": "10.48550/arXiv.1706.03762",
        "journal": "Advances in Neural Information Processing Systems (NeurIPS 2017)",
        "abstract": (
            "The dominant sequence transduction models are based on complex recurrent or convolutional "
            "neural networks in an encoder-decoder configuration. We propose the Transformer, a novel "
            "network architecture based solely on attention mechanisms, dispensing with recurrence and "
            "convolutions entirely. Experiments on two machine translation tasks show these models to be "
            "superior in quality while being more parallelizable and requiring significantly less time to train."
        ),
        "pages": [
            (
                "Attention Is All You Need\n\n"
                "Abstract: The dominant sequence transduction models are based on complex recurrent or convolutional "
                "neural networks that include an encoder and a decoder. The best performing models also connect the encoder "
                "and decoder through an attention mechanism. We propose the Transformer, a model architecture eschewing recurrence "
                "and instead relying entirely on an attention mechanism to draw global dependencies between input and output. "
                "The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality "
                "after being trained for as little as twelve hours on eight P100 GPUs.\n\n"
                "1. Introduction\n"
                "Recurrent neural networks, long short-term memory (LSTM) and gated recurrent neural networks have been firmly established "
                "as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. "
                "Numerous efforts have since continued to push the boundaries of recurrent language models and encoder-decoder architectures. "
                "Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions "
                "to steps in computation time, they generate a sequence of hidden states h_t, as a function of the previous hidden state h_{t-1} "
                "and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes "
                "critical at longer sequence lengths, as memory constraints limit batching across examples."
            ),
            (
                "3. Model Architecture\n\n"
                "Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence "
                "of symbol representations (x_1, ..., x_n) to a sequence of continuous representations z = (z_1, ..., z_n). Given z, the decoder "
                "then generates an output sequence (y_1, ..., y_m) of symbols one element at a time. At each step the model is auto-regressive, "
                "consuming the previously generated symbols as additional input when generating the next.\n\n"
                "The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the "
                "encoder and decoder.\n\n"
                "3.2 Attention\n"
                "An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, "
                "and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed "
                "by a compatibility function of the query with the corresponding key.\n\n"
                "3.2.1 Scaled Dot-Product Attention\n"
                "We compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are also packed "
                "into matrices K and V. We compute the matrix of outputs as:\n"
                "Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V\n\n"
                "The two most commonly used attention functions are additive attention and dot-product (multiplicative) attention. Scaled dot-product attention "
                "is identical to our algorithm, except for the scaling factor of 1 / sqrt(d_k)."
            ),
            (
                "3.2.2 Multi-Head Attention\n\n"
                "Instead of performing a single attention function with d_model-dimensional queries, keys and values, we found it beneficial to linearly "
                "project the queries, keys and values h times with different, learned linear projections to d_k, d_k and d_v dimensions, respectively. "
                "Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. "
                "With a single attention head, averaging inhibits this.\n\n"
                "MultiHead(Q, K, V) = Concat(head_1, ..., head_h) W^O\n"
                "where head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)\n\n"
                "3.5 Positional Encoding\n"
                "Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must "
                "inject some information about the relative or absolute position of the tokens in the sequence. To this end, we add positional encodings "
                "to the input embeddings at the bottoms of the encoder and decoder stacks. The positional encodings have the same dimension d_model as the "
                "embeddings, so that the two can be summed. We use sine and cosine functions of different frequencies:\n"
                "PE(pos, 2i) = sin(pos / 10000^{2i / d_model})\n"
                "PE(pos, 2i+1) = cos(pos / 10000^{2i / d_model})"
            ),
        ],
    },
    {
        "filename": "Deep_Residual_Learning_for_Image_Recognition.pdf",
        "title": "Deep Residual Learning for Image Recognition",
        "authors": "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
        "publication_year": 2016,
        "domain": "Computer Science",
        "document_type": "Conference Paper",
        "doi": "10.1109/CVPR.2016.90",
        "journal": "IEEE Conference on Computer Vision and Pattern Recognition (CVPR 2016)",
        "abstract": (
            "Deeper neural networks are more difficult to train. We present a residual learning framework "
            "to ease the training of networks that are substantially deeper than those used previously. "
            "We explicitly reformulate the layers as learning residual functions with reference to the layer "
            "inputs, instead of learning unreferenced functions. We provide comprehensive empirical evidence "
            "showing that these residual networks are easier to optimize, and can gain accuracy from considerably "
            "increased depth. On the ImageNet dataset we evaluate residual nets with a depth of up to 152 layers."
        ),
        "pages": [
            (
                "Deep Residual Learning for Image Recognition\n\n"
                "Abstract: Deeper neural networks are more difficult to train. We present a residual learning framework to ease "
                "the training of networks that are substantially deeper than those used previously. We explicitly reformulate the "
                "layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions. "
                "We provide comprehensive empirical evidence showing that these residual networks are easier to optimize, and can gain "
                "accuracy from considerably increased depth. On the ImageNet dataset we evaluate residual nets with a depth of up to 152 layers—8x "
                "deeper than VGG nets but still having lower complexity. An ensemble of these residual nets achieves 3.57% error on the ImageNet "
                "test set. This result won the 1st place on the ILSVRC 2015 classification task.\n\n"
                "1. Introduction\n"
                "Deep convolutional neural networks have led to a series of breakthroughs for image classification. Deep networks naturally "
                "integrate low/mid/high-level features and classifiers in an end-to-end multi-layer fashion, and the 'levels' of features can "
                "be enriched by the number of stacked layers (depth).\n\n"
                "Driven by the significance of depth, a question arises: Is learning better networks as easy as stacking more layers? An obstacle "
                "to answering this question was the notorious problem of vanishing/exploding gradients, which hamper convergence from the beginning. "
                "When deeper networks are able to start converging, a degradation problem has been exposed: with the network depth increasing, "
                "accuracy becomes saturated and then degrades rapidly. Unexpectedly, such degradation is not caused by overfitting, and adding more "
                "layers to a suitably deep model leads to higher training error."
            ),
            (
                "3. Deep Residual Learning\n\n"
                "3.1. Residual Learning\n"
                "Let us consider H(x) as an underlying mapping to be fit by a few stacked layers (not necessarily the entire net), with x denoting "
                "the inputs to the first of these layers. If one hypothesizes that multiple nonlinear layers can asymptotically approximate "
                "complicated functions, it is equivalent to hypothesize that they can asymptotically approximate the residual functions, "
                "i.e., F(x) := H(x) - x (assuming the input and output are of the same dimensions). So rather than expect stacked layers to approximate "
                "H(x), we explicitly let these layers approximate a residual function F(x). The original mapping is recast into F(x) + x.\n\n"
                "Although both forms should be able to asymptotically approximate the desired functions, the ease of learning may be different. "
                "This formulation is motivated by the counterintuitive phenomena about the degradation problem. If the added layers can be constructed "
                "as identity mappings, a deeper model should have no greater training error than its shallower counterpart.\n\n"
                "3.2. Identity Mapping by Shortcuts\n"
                "We adopt residual learning to every few stacked layers. A building block is defined as:\n"
                "y = F(x, {W_i}) + x\n"
                "Here x and y are the input and output vectors of the layers considered. The function F(x, {W_i}) represents the residual mapping "
                "to be learned. For the example of two layers, F = W_2 * sigma(W_1 * x) in which sigma denotes ReLU and the biases are omitted for simplifying notations."
            ),
        ],
    },
    {
        "filename": "BERT_Pretraining_of_Deep_Bidirectional_Transformers.pdf",
        "title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
        "authors": "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova",
        "publication_year": 2019,
        "domain": "Computer Science",
        "document_type": "Conference Paper",
        "doi": "10.18653/v1/N19-1423",
        "journal": "North American Chapter of the Association for Computational Linguistics (NAACL-HLT 2019)",
        "abstract": (
            "We introduce a new language representation model called BERT, which stands for Bidirectional "
            "Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed "
            "to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left "
            "and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one "
            "additional output layer to create state-of-the-art models for a wide range of tasks, such as question "
            "answering and language inference, without substantial task-specific architecture modifications."
        ),
        "pages": [
            (
                "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding\n\n"
                "Abstract: We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations "
                "from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations "
                "from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model "
                "can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question "
                "answering and language inference, without substantial task-specific architecture modifications.\n\n"
                "BERT is conceptually simple and empirically powerful. It obtains new state-of-the-art results on eleven natural language processing "
                "tasks, including pushing the GLUE score to 80.5% (7.7% point absolute improvement), MultiNLI accuracy to 86.7% (4.6% absolute improvement), "
                "SQuAD v1.1 question answering Test F1 to 93.2 (1.5 point absolute improvement) and SQuAD v2.0 Test F1 to 83.1 (5.1 point absolute improvement).\n\n"
                "1. Introduction\n"
                "Language model pre-training has been shown to be effective for improving many natural language processing tasks. There are two existing "
                "strategies for applying pre-trained language representations to downstream tasks: feature-based and fine-tuning. We argue that current "
                "techniques restrict the power of the pre-trained representations, especially for the fine-tuning approaches. The major limitation is "
                "that standard language models are unidirectional, and this limits the choice of architectures that can be used during pre-training."
            ),
            (
                "3. BERT\n\n"
                "We introduce BERT and its detailed implementation in this section. There are two steps in our framework: pre-training and fine-tuning. "
                "During pre-training, the model is trained on unlabeled data over different pre-training tasks. For fine-tuning, the BERT model is first "
                "initialized with the pre-trained parameters, and all of the parameters are fine-tuned using labeled data from the downstream tasks.\n\n"
                "Task #1: Masked LM (Masked Language Model)\n"
                "Intuitively, it is reasonable to believe that a deep bidirectional model is strictly more powerful than either a left-to-right model "
                "or the shallow concatenation of a left-to-right and a right-to-left model. Unfortunately, standard conditional language models can "
                "only be trained left-to-right or right-to-left, since bidirectional conditioning would allow each word to indirectly 'see itself' "
                "in a multi-layered context.\n\n"
                "In order to train a deep bidirectional representation, we simply mask some percentage of the input tokens at random, and then predict "
                "those masked tokens. We refer to this procedure as a 'masked LM' (MLM). In our experiments, we mask 15% of all WordPiece tokens in "
                "each sequence at random.\n\n"
                "Task #2: Next Sentence Prediction (NSP)\n"
                "Many important downstream tasks such as Question Answering (QA) and Natural Language Inference (NLI) are based on understanding the "
                "relationship between two sentences, which is not directly captured by language modeling. In order to train a model that understands sentence "
                "relationships, we pre-train for a binarized next sentence prediction task that can be trivially generated from any monolingual corpus."
            ),
        ],
    },
]


def create_pdf_file(filepath: Path, pages: list) -> None:
    """Generate authentic multi-page PDF using PyMuPDF."""
    try:
        import pymupdf
        doc = pymupdf.open()
        for page_text in pages:
            page = doc.new_page(width=595, height=842)  # Standard A4
            # Insert text inside reasonable margins
            rect = pymupdf.Rect(50, 50, 545, 792)
            page.insert_textbox(rect, page_text, fontsize=10, fontname="helv")
        doc.save(str(filepath))
        doc.close()
    except Exception as e:
        # Fallback to plain text if pymupdf write encounters any environment issue
        filepath.write_text("\n\n--- PAGE BREAK ---\n\n".join(pages), encoding="utf-8")


def seed_corpus():
    """Idempotently seed the ResearchVault demonstration corpus and benchmark suite."""
    print("=" * 70)
    print("ResearchVault — Production Corpus Seeder")
    print("=" * 70)

    init_db()
    db = SessionLocal()
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Ensure Demo User Exists
        demo_user = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if not demo_user:
            demo_user = User(
                name=DEMO_NAME,
                email=DEMO_EMAIL,
                hashed_password=get_password_hash(DEMO_PASSWORD),
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            print(f"[+] Created demo user: {DEMO_EMAIL} (Password: {DEMO_PASSWORD})")
        else:
            print(f"[*] Demo user already exists: {DEMO_EMAIL} (ID: {demo_user.id})")

        # 2. Seed Canonical Research Papers
        seeded_count = 0
        for paper in CANONICAL_PAPERS:
            filename = paper["filename"]
            target_path = upload_dir / filename

            # Generate authentic physical PDF
            if not target_path.exists():
                create_pdf_file(target_path, paper["pages"])
                print(f"[+] Generated PDF file: {target_path.name}")

            # Compute SHA-256
            hasher = hashlib.sha256()
            with open(target_path, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            file_hash = hasher.hexdigest()
            file_size = target_path.stat().st_size

            # Check if document already indexed for demo user
            existing_doc = (
                db.query(Document)
                .filter(Document.user_id == demo_user.id, Document.sha256_hash == file_hash)
                .first()
            )

            if existing_doc and existing_doc.status == "indexed":
                print(f"[*] Paper already indexed: '{paper['title']}' (ID: {existing_doc.id})")
                continue

            if not existing_doc:
                doc = Document(
                    user_id=demo_user.id,
                    filename=filename,
                    file_path=str(target_path),
                    file_size=file_size,
                    mime_type="application/pdf",
                    sha256_hash=file_hash,
                    status="uploaded",
                    title=paper["title"],
                    authors=paper["authors"],
                    publication_year=paper["publication_year"],
                    abstract=paper["abstract"],
                    doi=paper["doi"],
                    journal=paper["journal"],
                    domain=paper["domain"],
                    document_type=paper["document_type"],
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
            else:
                doc = existing_doc

            print(f"[>] Ingesting & embedding: '{doc.title}' (ID: {doc.id})...")
            # Execute synchronous background pipeline
            process_document_background(doc.id, session_factory=SessionLocal)
            seeded_count += 1

        print(f"[+] Processed {seeded_count} newly seeded papers.")

        # 3. Initialize & Link Default Academic Benchmark Suite
        print("[>] Linking default academic benchmark suite...")
        suite = EvaluationService.ensure_default_suite(db, demo_user.id)
        db.refresh(suite)
        query_count = len(suite.queries)
        print(f"[+] Academic Benchmark Suite ready: '{suite.name}' ({query_count} queries).")

        print("=" * 70)
        print("Corpus Seeding Completed Successfully!")
        print(f"Demo Account:  {DEMO_EMAIL}")
        print(f"Demo Password: {DEMO_PASSWORD}")
        print("Ready for instant search, passage navigation, and IR benchmarking.")
        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    seed_corpus()
