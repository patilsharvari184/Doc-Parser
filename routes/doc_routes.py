from datetime import datetime
import os
from docx import Document
from fastapi import APIRouter, UploadFile, File , HTTPException
from pydot import List
from db import get_connection
from parsers.document_parser import extract_text_from_pdf
from embeddings.embedder import get_embedding
from retrieval.mysql_search import store_chunk, search_similar_chunks
import requests
from urllib.parse import urlparse
from parsers.document_parser import extract_chunks_with_metadata
from embeddings.embedder import embed_and_store_chunks
from utils.llm import ask_llm
from pydantic import BaseModel
import pymysql
from PyPDF2 import PdfReader

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
    connection = get_connection()
    cursor = connection.cursor()

    try:
        for file in files:
            # Save PDF
            file_location = os.path.join(UPLOAD_DIR, file.filename)
            with open(file_location, "wb") as f:
                f.write(await file.read())
            
            # ✅ Get real page count
            reader = PdfReader(file_location)
            page_count = len(reader.pages)
            print(f"Processing {file.filename} — {page_count} pages")  # debug print

            # Extract text
            text = extract_text_from_pdf(file_location)
            chunks = [text[i:i+500] for i in range(0, len(text), 500)]

            # Create dynamic ID
            document_id = str(uuid.uuid4())
            document_ids.append(document_id)

            # ✅ Store document info in DB
            cursor.execute("""
                INSERT INTO documents (document_id, file_name, upload_path, pages, status)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                document_id,
                file.filename,
                file_location,
                page_count,
                "processing"
            ))
            connection.commit()

            # Store chunks + embeddings
            for chunk in chunks:
                embedding = get_embedding(chunk)
                store_chunk(document_id, file.filename, chunk, embedding)

            # ✅ Update status to completed after processing
            cursor.execute("""
                UPDATE documents
                SET status = %s
                WHERE document_id = %s
            """, ("completed", document_id))
            connection.commit()

    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        connection.close()

    return {
        "message": "PDFs processed successfully.",
        "document_ids": document_ids
    }

class DocumentSchema(BaseModel):
    document_id: str
    file_name: str
    upload_path: str
    pages: int
    status: str
    upload_date: str

@router.get("/documents", response_model=List[DocumentSchema])
def get_documents():
    conn = get_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)  # ✅ Changed here
    cursor.execute("SELECT * FROM documents ORDER BY upload_date DESC")
    rows = cursor.fetchall()
    for row in rows:
        if isinstance(row["upload_date"], datetime):
            row["upload_date"] = row["upload_date"].strftime("%Y-%m-%d %H:%M:%S")
    cursor.close()
    conn.close()
    return rows


@router.get("/document/latest")
def get_latest_document():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM documents 
        ORDER BY upload_date DESC 
        LIMIT 1
    """)
    result = cursor.fetchone()
    return result
    
from fastapi.responses import FileResponse

@router.get("/document/get/{document_id}")
def get_document(document_id: str):
    conn = get_connection()
    cursor = conn.cursor(pymysql.cursors.DictCursor)  # ← change here
    cursor.execute("SELECT * FROM documents WHERE id = %s", (document_id,))
    doc = cursor.fetchone()
    cursor.close()
    conn.close()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return doc


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

