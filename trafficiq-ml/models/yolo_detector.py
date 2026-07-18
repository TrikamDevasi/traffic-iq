"""
YOLOv8 Object Detection Module
Loads the Ultralytics YOLOv8 model for vehicle detection.
"""

import io
import torch
from PIL import Image
from ultralytics import YOLO

class YoloDetector:
    def __init__(self, model_path: str = "yolov8n.pt"):
        # Auto-downloads yolov8n.pt if not present in the current directory
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = YOLO(model_path)
        self.model.to(self.device)
        # COCO classes for vehicles (car, motorcycle, bus, truck)
        self.vehicle_classes = [2, 3, 5, 7]

    def detect_vehicles(self, image_bytes: bytes) -> list:
        """
        Runs YOLOv8 detection on an image.
        Returns a list of dicts: {class_id, class_name, confidence, bbox}
        """
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Run inference (conf=0.25 to filter out low-confidence detections)
        results = self.model(image, conf=0.25, verbose=False)[0]
        
        detections = []
        for box in results.boxes:
            cls_id = int(box.cls[0].item())
            if cls_id in self.vehicle_classes:
                detections.append({
                    "class_id": cls_id,
                    "class_name": self.model.names[cls_id],
                    "confidence": float(box.conf[0].item()),
                    "bbox": box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                })
                
        return detections
