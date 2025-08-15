from db import get_connection
import pymysql
from fastapi import APIRouter, UploadFile, File
import numpy as np
import json

def cosine_similarity(vec1, vec2):
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def insert_chunk_with_token(text, embedding, metadata):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO documents (file_name, chunk, embedding, page, source, document_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    metadata.get("file_name", "external.pdf"),
                    text,
                    json.dumps(embedding),
                    metadata.get("page"),
                    metadata.get("source"),
                    metadata.get("document_id")
                )
            )
            conn.commit()
    finally:
        conn.close()

def search_similar_chunks(query_embedding, document_ids, top_k=5):
    conn = get_connection()
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            format_strings = ','.join(['%s'] * len(document_ids))
            cur.execute(f"""
                SELECT chunk, embedding, page, source 
                FROM documents 
                WHERE document_id IN ({format_strings})
            """, tuple(document_ids))
            rows = cur.fetchall()
    finally:
        conn.close()

    similarities = []
    for row in rows:
        emb_json = row.get("embedding")
        if not emb_json:
            continue
        try:
            stored_embedding = json.loads(emb_json)
        except json.JSONDecodeError:
            continue

        sim = cosine_similarity(query_embedding, stored_embedding)
        similarities.append((sim, row["chunk"], row.get("page"), row.get("source")))

    similarities.sort(reverse=True)

    return [
        {
            "chunk": chunk,
            "similarity": sim,
            "page": page,
            "source": source
        }
        for sim, chunk, page, source in similarities[:top_k]
    ]
    
def store_chunk(document_id, filename, chunk, embedding):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Convert embedding to JSON string if necessary
            cursor.execute(
                "INSERT INTO documents (document_id, file_name, chunk, embedding) VALUES (%s, %s, %s, %s)",
                 (document_id, filename, chunk, json.dumps(embedding))
    )
            conn.commit()
    finally:
        conn.close()
        
def get_filename_by_document_id(document_id):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT file_name FROM documents WHERE document_id = %s LIMIT 1",
                (document_id,)
            )
            result = cursor.fetchone()
            if result:
                return result[0]
            return None
    finally:
        conn.close()