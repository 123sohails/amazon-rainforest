from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from PIL import Image
import numpy as np
import os
from twilio.rest import Client

app = Flask(__name__)
CORS(app)

# -----------------------------
# Configuration
# -----------------------------

MODEL_PATH = "amazon_efficientnetb0.keras"
THRESHOLD = 0.20

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
ALERT_PHONE_NUMBER = os.getenv("ALERT_PHONE_NUMBER")

twilio_client = Client(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN
)

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

def send_alert(predictions):
    risk_classes = {
        "artisinal_mine",
        "conventional_mine",
        "slash_burn",
        "selective_logging"
    }

    detected_risks = [
        p for p in predictions
        if p["label"] in risk_classes
    ]

    if not detected_risks:
        return

    risk_text = "\n".join(
        f'{p["label"]}: {p["confidence"]}%'
        for p in detected_risks
    )

    message = (
        "🚨 Amazon Rainforest Risk Alert\n\n"
        "Potential environmental-risk pattern detected:\n"
        f"{risk_text}\n\n"
        "Further human verification is recommended."
    )

    twilio_client.messages.create(
        body=message,
        from_=TWILIO_PHONE_NUMBER,
        to=ALERT_PHONE_NUMBER
    )

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

        # Automatically send SMS if a risk class is detected
        send_alert(predictions)

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