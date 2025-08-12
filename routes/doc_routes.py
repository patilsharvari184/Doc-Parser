import os
from fastapi import APIRouter, UploadFile, File , HTTPException
from parsers.document_parser import extract_text_from_pdf
from embeddings.embedder import get_embedding
from retrieval.mysql_search import store_chunk, search_similar_chunks
import requests
from urllib.parse import urlparse
from parsers.document_parser import extract_chunks_with_metadata
from embeddings.embedder import embed_and_store_chunks
from utils.llm import ask_llm
from pydantic import BaseModel

class QuestionRequest(BaseModel):
    question: str
    document_ids: list[str]
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
qa_model = genai.GenerativeModel("gemini-flash-1.5")


router = APIRouter()
UPLOAD_DIR = "uploaded_docs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

import uuid

@router.post("/process-multiple-pdfs/")
async def process_multiple_pdfs(files: list[UploadFile] = File(...)):
    document_ids = []

    for file in files:
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as f:
            f.write(await file.read())

        text = extract_text_from_pdf(file_location)
        chunks = [text[i:i+500] for i in range(0, len(text), 500)]

        document_id = str(uuid.uuid4())
        document_ids.append(document_id)

        for chunk in chunks:
            embedding = get_embedding(chunk)
            store_chunk(document_id, file.filename, chunk, embedding)

    return {
        "message": "PDFs processed successfully.",
        "document_ids": document_ids
    }
    
@router.post("/process-external-link/")
async def process_external_link(link: str):
    try:
        response = requests.get(link)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download link: {e}")

    # Save to a temporary PDF file
    parsed_url = urlparse(link)
    filename = os.path.basename(parsed_url.path)
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF links are supported.")

    temp_path = os.path.join(UPLOAD_DIR, filename)
    with open(temp_path, "wb") as f:
        f.write(response.content)

    document_id = str(uuid.uuid4())

    # Extract chunks with page/source metadata
    chunks = extract_chunks_with_metadata(temp_path)
    for chunk in chunks:
        chunk["document_id"] = document_id

    # Embed and store
    embed_and_store_chunks(chunks)

    return {
        "message": "External link processed successfully.",
        "document_id": document_id
    }

@router.post("/ask")
def ask_question(request: QuestionRequest):
    query = request.question
    document_ids = request.document_ids

    embedding = get_embedding(query)
    matched_chunks = search_similar_chunks(embedding, document_ids=document_ids)

    context_parts = []
    citations = []

    for c in matched_chunks:
        context_parts.append(f"[{c['source']} - Page {c['page']}]: {c['chunk']}")
        citations.append({
            "page": c["page"],
            "source": c["source"],
            "text": c["chunk"]
        })

    context = "\n".join(context_parts)
    llm_answer = ask_llm(query, context)

    return {
        "answer": llm_answer,
        "citations": citations
    }

