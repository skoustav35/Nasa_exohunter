import urllib.request
import json
import time

url = "http://127.0.0.1:3000/api/light-curve/261136679"
print(f"Querying {url} with 30s timeout...")
start = time.time()
try:
    import ssl
    ctx = ssl._create_unverified_context()
    with urllib.request.urlopen(url, context=ctx, timeout=30) as response:
        status = response.status
        data = json.loads(response.read().decode('utf-8'))
        print(f"Success! Status: {status}, Time taken: {time.time() - start:.2f}s")
        print(f"Metadata source: {data.get('metadata', {}).get('source')}")
        print(f"Data points count: {len(data.get('lightCurve', {}).get('time', []))}")
except Exception as e:
    print(f"Failed: {e}, Time taken: {time.time() - start:.2f}s")
