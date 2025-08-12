import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def ask_llm(query: str, context: str) -> str:
    prompt = f"""
You are a helpful assistant. Use the following content from multiple documents to answer the question.

Context:
{context}

Question:
{query}

Answer (mention source if relevant):
"""
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return response.text.strip()