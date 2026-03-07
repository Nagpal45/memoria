from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="Memoria Vector Engine")

print("Loading ML Model (this takes a few seconds the first time)...")
model = SentenceTransformer('Snowflake/snowflake-arctic-embed-s')
print("Model loaded successfully!")

class TextPayload(BaseModel):
    text: str

@app.post("/embed")
def generate_embedding(payload: TextPayload):
    vector = model.encode(payload.text).tolist()
    
    return {
        "dimensions": len(vector),
        "embedding": vector
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)