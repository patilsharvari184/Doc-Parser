from fastapi import FastAPI
from routes import doc_routes
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ChatDOC Clone")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify ["http://127.0.0.1:5500"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(doc_routes.router, prefix="/document", tags=["Document"])
@app.get("/")
async def root():
    return {"message": "Welcome to the ChatDOC API!"}