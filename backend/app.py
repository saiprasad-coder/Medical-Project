"""
app.py — DoseCare Flask Backend
================================
A REST API for the DoseCare Medical Reminder web app.

Endpoints:
  POST  /api/auth/register     → Create account, returns JWT
  POST  /api/auth/login        → Authenticate, returns JWT

  GET   /api/medicines         → Get all medicines (JWT required)
  POST  /api/medicines         → Add new reminder (JWT required)
  PUT   /api/medicines/<id>    → Update reminder (JWT required)
  DELETE /api/medicines/<id>   → Delete reminder (JWT required)
  PATCH /api/medicines/<id>/auto-order → Toggle auto-order (JWT required)

  GET   /api/health            → Server health check

Run:
  python app.py
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError


# ─── Load environment variables ───────────────────────────────────────────────
load_dotenv()

MONGO_URI  = os.getenv("MONGO_URI", "mongodb://localhost:27017/dosecare")
JWT_SECRET = os.getenv("JWT_SECRET", "dosecare_super_secret_key_2026")
PORT       = int(os.getenv("PORT", 5000))

# ─── Flask App Setup ──────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─── MongoDB Connection ───────────────────────────────────────────────────────
client = MongoClient(MONGO_URI)
db     = client["dosecare"]
users  = db["users"]
medicines = db["medicines"]

# Ensure email uniqueness index
users.create_index("email", unique=True)

print(f"✅ Connected to MongoDB: {MONGO_URI}")

# ─── Helpers ──────────────────────────────────────────────────────────────────

def serialize(doc):
    """Convert MongoDB document to JSON-safe dict (ObjectId → string)."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    if "userId" in doc:
        doc["userId"] = str(doc["userId"])
    return doc


def generate_token(user_id: str) -> str:
    """Generate a JWT token valid for 30 days."""
    payload = {
        "id":  user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def error(msg, status=400):
    return jsonify({"message": msg}), status


# ─── JWT Auth Decorator ───────────────────────────────────────────────────────

def require_auth(f):
    """Decorator that validates the Bearer JWT and injects current_user_id."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return error("Not authorized, no token.", 401)
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.current_user_id = payload["id"]
        except jwt.ExpiredSignatureError:
            return error("Token has expired.", 401)
        except jwt.InvalidTokenError:
            return error("Invalid token.", 401)
        return f(*args, **kwargs)
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return error("Please provide email and password.")

    if not name:
        name = email.split("@")[0].capitalize()

    try:
        result = users.insert_one({
            "name":         name,
            "email":        email,
            "passwordHash": hash_password(password),
            "createdAt":    datetime.now(timezone.utc)
        })
        user_id = str(result.inserted_id)
        token   = generate_token(user_id)
        return jsonify({"token": token, "user": {"id": user_id, "name": name, "email": email}}), 201

    except DuplicateKeyError:
        return error("An account with this email already exists.", 409)
    except Exception as e:
        print("Register error:", e)
        return error("Server error during registration.", 500)


@app.route("/api/auth/login", methods=["POST"])
def login():
    data     = request.get_json() or {}
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return error("Please provide email and password.")

    user = users.find_one({"email": email})
    if not user or not check_password(password, user["passwordHash"]):
        return error("Invalid email or password.", 401)

    user_id = str(user["_id"])
    token   = generate_token(user_id)
    return jsonify({"token": token, "user": {"id": user_id, "name": user["name"], "email": user["email"]}})


# ═══════════════════════════════════════════════════════════════════════════════
#  MEDICINE ROUTES  (all require JWT)
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/medicines", methods=["GET"])
@require_auth
def get_medicines():
    uid  = request.current_user_id
    docs = list(medicines.find({"userId": uid}).sort([("date", 1), ("createdAt", 1)]))
    return jsonify([serialize(d) for d in docs])


@app.route("/api/medicines", methods=["POST"])
@require_auth
def add_medicine():
    data = request.get_json() or {}
    name   = (data.get("name") or "").strip()
    dosage = (data.get("dosage") or "").strip()
    date   = (data.get("date") or "").strip()
    time   = (data.get("time") or "").strip()

    if not name or not dosage or not date or not time:
        return error("Name, dosage, date and time are required.")

    doc = {
        "userId":           request.current_user_id,
        "name":             name,
        "dosage":           dosage,
        "date":             date,
        "time":             time,
        "meal":             data.get("meal", "After Food"),
        "status":           "upcoming",
        "alarm":            data.get("alarm", True),
        "autoOrder":        data.get("autoOrder", False),
        "autoOrderEnabled": False,
        "createdAt":        datetime.now(timezone.utc)
    }
    result = medicines.insert_one(doc)
    doc["_id"] = result.inserted_id
    return jsonify(serialize(doc)), 201


@app.route("/api/medicines/<med_id>", methods=["PUT"])
@require_auth
def update_medicine(med_id):
    try:
        oid = ObjectId(med_id)
    except InvalidId:
        return error("Invalid medicine ID.", 400)

    data = request.get_json() or {}
    allowed = ["name", "dosage", "date", "time", "meal", "status", "alarm", "autoOrder"]
    updates = {k: data[k] for k in allowed if k in data}

    if not updates:
        return error("No valid fields provided.")

    result = medicines.find_one_and_update(
        {"_id": oid, "userId": request.current_user_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER
    )
    if result is None:
        return error("Medicine not found.", 404)

    return jsonify(serialize(result))


@app.route("/api/medicines/<med_id>", methods=["DELETE"])
@require_auth
def delete_medicine(med_id):
    try:
        oid = ObjectId(med_id)
    except InvalidId:
        return error("Invalid medicine ID.", 400)

    result = medicines.find_one_and_delete({"_id": oid, "userId": request.current_user_id})
    if result is None:
        return error("Medicine not found.", 404)

    return jsonify({"message": "Reminder deleted successfully.", "id": med_id})


@app.route("/api/medicines/<med_id>/auto-order", methods=["PATCH"])
@require_auth
def toggle_auto_order(med_id):
    try:
        oid = ObjectId(med_id)
    except InvalidId:
        return error("Invalid medicine ID.", 400)

    data    = request.get_json() or {}
    enabled = data.get("enabled")
    if enabled is None:
        return error("`enabled` field is required (true/false).")

    result = medicines.find_one_and_update(
        {"_id": oid, "userId": request.current_user_id},
        {"$set": {"autoOrderEnabled": bool(enabled)}},
        return_document=ReturnDocument.AFTER
    )
    if result is None:
        return error("Medicine not found.", 404)

    return jsonify(serialize(result))


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status":    "OK",
        "message":   "DoseCare Flask API is running 🚀",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


# ─── 404 Fallback ─────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"message": f"Route not found: {request.path}"}), 404


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n🚀 DoseCare Flask API starting on http://localhost:{PORT}")
    print(f"📋 Health check: http://localhost:{PORT}/api/health\n")
    app.run(host="0.0.0.0", port=PORT, debug=True)