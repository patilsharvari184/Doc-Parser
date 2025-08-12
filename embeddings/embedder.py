import google.generativeai as genai
import os
from dotenv import load_dotenv
from retrieval.mysql_search import insert_chunk_with_token

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_embedding(text):
    # Generate embedding using Gemini API
    embedding_vector = genai.embed_content(
        model="models/embedding-001",
        content=text,
        task_type="retrieval_document"
    )["embedding"]
    return embedding_vector

def embed_and_store_chunks(chunks):
    for chunk in chunks:
        embedding = get_embedding(chunk["content"])
        insert_chunk_with_token(
            text=chunk["content"],
            embedding=embedding,
            metadata={
                "file_name": chunk.get("file_name", "external.pdf"),
                "page": chunk.get("page"),
                "source": chunk.get("source"),
                "document_id": chunk.get("document_id")
            }
        )