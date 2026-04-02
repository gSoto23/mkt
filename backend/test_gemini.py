import os
from typing import Optional
from pydantic import BaseModel
from app.db.database import SessionLocal
from app.api.ai import _generate_gemini_image

class MockBrand:
    brand_voice_prompt = "Normal"
    visual_identity = {}

print("Generating...")
try:
    img_b64 = _generate_gemini_image(MockBrand(), "A simple red apple")
    print("MIME TYPE EXTRACTED:", img_b64.split(';')[0][:40])
    header, encoded = img_b64.split(",", 1)
    print("Header bytes length:", len(header))
    print("Base64 length:", len(encoded))
except Exception as e:
    print("Error:", e)
