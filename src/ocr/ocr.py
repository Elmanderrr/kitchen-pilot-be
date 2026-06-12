from pathlib import Path
import cv2
import numpy as np
from paddleocr import PaddleOCR

#https://huggingface.co/PaddlePaddle/models?search=cyrill
MIN_SCORE = 0.3  # drop anything below 30% confidence (equivalent to old drop_score=0.3)


def preprocess(img_path: str) -> str:
    img = cv2.imread(img_path)

    # 1. Upscale 2x — OCR accuracy improves significantly on larger images
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # 2. Denoise
    img = cv2.fastNlMeansDenoisingColored(img, None, h=10, hColor=10, templateWindowSize=7, searchWindowSize=21)

    # 3. Convert to LAB and apply CLAHE to L channel (contrast enhancement)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # Save preprocessed image to temp file for PaddleOCR
    tmp_path = Path(img_path).parent / "_preprocessed_tmp.png"
    cv2.imwrite(str(tmp_path), img)
    return str(tmp_path)


def main():
    img_path = Path(__file__).resolve().parents[2] / "assets" / "atb-receipt_1.png"

    ocr = PaddleOCR(
        text_detection_model_name="PP-OCRv4_mobile_det",
        text_recognition_model_name="cyrillic_PP-OCRv3_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    # Print which models are being used
    try:
        pipeline = ocr.paddlex_pipeline
        print(f"Pipeline type: {type(pipeline).__name__}")
        print(f"Pipeline attrs: {[a for a in dir(pipeline) if not a.startswith('__')]}")
    except Exception as e:
        print(f"Pipeline error: {e}")

    preprocessed_path = preprocess(str(img_path))

    result = ocr.predict(preprocessed_path)

    page = result[0]

    items = list(zip(
        page["rec_texts"],
        page["rec_scores"],
        page["dt_polys"]
    ))

    # sort top-to-bottom, left-to-right
    items.sort(key=lambda x: (min(p[1] for p in x[2]), min(p[0] for p in x[2])))

    print("=== RECEIPT TEXT ===")
    for text, score, _ in items:
        text = text.strip()
        if text and score >= MIN_SCORE:
            print(f"[{score:.2f}] {text}")
    print("=== RECEIPT TEXT END ===")

    # Cleanup temp file
    Path(preprocessed_path).unlink(missing_ok=True)


if __name__ == "__main__":
    main()