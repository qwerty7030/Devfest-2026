# Fit Check — Frontend / Backend API Contract

This document defines the interface between the **Fit Check Frontend** and the **AI Backend Service** (Gemini Vision + Secondary LLM Comment Generator).

---

## 1. Live Fit Check Stream (WebSocket)

- **Endpoint**: `ws://localhost:8000/api/fitcheck/stream`
- **Protocol**: WebSocket

### Client -> Server Messages

#### Send Frame (Periodic snapshot during 10-15s recording)
Sent every ~1.5–2.0 seconds:
```json
{
  "type": "FRAME",
  "sessionId": "fit_chk_91823a",
  "imageBase64": "data:image/jpeg;base64,...",
  "elapsedSeconds": 4.5,
  "stage": "TURNING" // "FRONT_POSE" | "TURNING" | "FOOTWEAR" | "FINAL_POSE"
}
```

#### End Recording
Sent when the 10–15s timer finishes:
```json
{
  "type": "COMPLETE",
  "sessionId": "fit_chk_91823a"
}
```

### Server -> Client Messages

#### Audience Comment
Sent in real-time as the secondary LLM responds to Gemini's observations:
```json
{
  "type": "COMMENT",
  "id": "cmt_991823",
  "username": "hypebeast_zoe",
  "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  "comment": "The silhouette on those pants is insane 🔥",
  "timestamp": 1731617200000,
  "tag": "Outerwear"
}
```

#### Audience Reaction
Simulated crowd reaction burst:
```json
{
  "type": "REACTION",
  "emoji": "🔥",
  "count": 5
}
```

---

## 2. Fit Analysis Summary (REST API)

- **Endpoint**: `POST /api/fitcheck/analyze`
- **Content-Type**: `application/json`

### Request Payload
```json
{
  "sessionId": "fit_chk_91823a",
  "snapshotBase64": "data:image/jpeg;base64,...",
  "durationSeconds": 15
}
```

### Response Payload
```json
{
  "status": "success",
  "data": {
    "overallScore": 94,
    "archetype": "Neo-Streetwear Minimalist",
    "summary": "Immaculate proportion balancing with muted earth tones and clean statement sneakers. Strong silhouette control on the turn.",
    "garments": [
      {
        "category": "Outerwear",
        "description": "Boxy Cropped Canvas Work Jacket",
        "color": "Washed Olive",
        "confidence": 0.98
      },
      {
        "category": "Tops",
        "description": "Heavyweight Drop-Shoulder Tee",
        "color": "Off-White / Cream",
        "confidence": 0.94
      },
      {
        "category": "Bottoms",
        "description": "Wide-Leg Pleated Trousers",
        "color": "Charcoal Black",
        "confidence": 0.97
      },
      {
        "category": "Footwear",
        "description": "Retro Low-Profile Leather Trainers",
        "color": "Chalk / Gum Sole",
        "confidence": 0.92
      },
      {
        "category": "Accessories",
        "description": "Silver Cuban Link Chain & Structured Crossbody",
        "color": "Silver / Matte Black",
        "confidence": 0.89
      }
    ],
    "topComments": [
      {
        "username": "drip_curator",
        "comment": "The jacket cropped fit goes crazy with wide leg pants 🤌"
      },
      {
        "username": "sneakerhead99",
        "comment": "Clean shoe choice, ties the whole palette together!"
      },
      {
        "username": "vintage_plug",
        "comment": "9.5/10 easily, immaculate proportions 🔥"
      }
    ]
  }
}
```
