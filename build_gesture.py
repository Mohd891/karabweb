# Download pinned detection assets during the Render build.
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen
import hashlib, time

ASSETS = [('vision_bundle.mjs', 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs', '40f4123dfcd75cfa58add046919cc6f52fde66f009ff582997c09ba54c6ba27c'), ('wasm/vision_wasm_internal.js', 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_internal.js', '4a97e2520ba506c680ecd6ba6acfb146888afa0e2746d57f205352bc6ebb82eb'), ('wasm/vision_wasm_internal.wasm', 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_internal.wasm', 'f00ec4731faa23b3e714d00e88d4d10e2df5c0a427d3a2b4ae6e3526fdd14ef7'), ('wasm/vision_wasm_nosimd_internal.js', 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_nosimd_internal.js', '927def7b465c51b86e4b3060f93646aca4e27121f4b8fc0483786e407ea9cf1f'), ('wasm/vision_wasm_nosimd_internal.wasm', 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_nosimd_internal.wasm', '3821ea9b1f7fb8c549ef2a064ef5c85750bf375c545a49fd6eea0df44a95f1f4'), ('hand_landmarker.task', 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1'), ('face_detector.tflite', 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite', 'b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f')]

def download(item):
    name, url, expected = item
    target = Path("gesture/assets") / name
    target.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            with urlopen(url, timeout=90) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != expected:
                raise ValueError("Asset checksum mismatch: " + name)
            target.write_bytes(data)
            print("Ready:", name)
            return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)

if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(download, ASSETS))
