from google import genai
from google.genai import types
import inspect

print("GenerateImagesConfig fields:")
for name, prop in inspect.getmembers(types.GenerateImagesConfig):
    if not name.startswith('_'):
        print(f"- {name}")
