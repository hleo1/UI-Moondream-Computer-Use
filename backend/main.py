from compile import compile
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict
from pathlib import Path

app = FastAPI()

class ProcessRequest(BaseModel):
    data: Dict[str, Any]

class ProcessResponse(BaseModel):
    success: bool
    message: str
    result: Dict[str, Any] = {}

file_directory = Path(__file__).parent
folder = file_directory / "../do-it-once vanilla/screenshot_full"

@app.post("/process", response_model=ProcessResponse)
async def process(request: ProcessRequest):
    """
    Process endpoint that accepts any data and returns a response
    """
    try:
        # Add your processing logic here
        processed = compile(folder, "convert powerpoint slides of a bunch of images into a folder containing just the images from the powerpoint slide", 0)
        
        return ProcessResponse(
            success=True,
            message="Data processed successfully",
            result={
                "code": processed
            }
        )
    except Exception as e:
        return ProcessResponse(
            success=False,
            message=f"Processing failed: {str(e)}"
        )

@app.get("/")
async def root():
    """
    Health check endpoint
    """
    return {"message": "FastAPI server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)