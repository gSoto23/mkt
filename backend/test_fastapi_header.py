from fastapi import Response
res = Response(content=b"12345", media_type="image/jpeg")
print("Headers:", res.headers)
