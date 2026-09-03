from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from PIL import Image
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# -----------------------------
# Configuration
# -----------------------------

MODEL_PATH = "amazon_efficientnetb0.keras"
THRESHOLD = 0.20

LABELS = [
    "agriculture",
    "artisinal_mine",
    "bare_ground",
    "blooming",
    "blow_down",
    "clear",
    "cloudy",
    "conventional_mine",
    "cultivation",
    "habitation",
    "haze",
    "partly_cloudy",
    "primary",
    "road",
    "selective_logging",
    "slash_burn",
    "water"
]

# -----------------------------
# Load model
# -----------------------------

print("Loading model...")

model = tf.keras.models.load_model(MODEL_PATH)

print("Model loaded successfully!")

# -----------------------------
# Prediction function
# -----------------------------

def predict_image(image):

    image = image.convert("RGB")
    image = image.resize((224, 224))

    image_array = np.array(
        image,
        dtype=np.float32
    )

    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    probabilities = model(
        tf.convert_to_tensor(image_array),
        training=False
    ).numpy()[0]

    predictions = []

    for label, probability in zip(
        LABELS,
        probabilities
    ):

        if probability >= THRESHOLD:

            predictions.append({
                "label": label,
                "confidence": float(probability)
            })

    # Sort highest confidence first
    predictions.sort(
        key=lambda x: x["confidence"],
        reverse=True
    )

    return predictions


# -----------------------------
# Health check
# -----------------------------

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "running",
        "model": "EfficientNetB0",
        "threshold": THRESHOLD,
        "classes": len(LABELS)
    })


# -----------------------------
# Prediction endpoint
# -----------------------------

@app.route("/predict", methods=["POST"])
def predict():

    if "image" not in request.files:

        return jsonify({
            "error": "No image uploaded"
        }), 400

    image_file = request.files["image"]

    try:

        image = Image.open(image_file)

        predictions = predict_image(image)

        return jsonify({
            "predictions": predictions
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# -----------------------------
# Run server
# -----------------------------

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )