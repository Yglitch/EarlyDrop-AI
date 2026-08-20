# Pulse — Early Student Dropout Prediction System

Pulse is a machine learning-powered web application and REST API designed for educational institutions to flag students at risk of dropping out early. By analyzing key academic, engagement, and socio-economic signals, Pulse provides actionable risk levels (**Low**, **Medium**, or **High**) to help coordinators and mentors step in before students disengage permanently.

---

## Key Features

- **Machine Learning Early Warning**: Predicts student dropout risk using a trained classifier pipeline (`joblib` models with scaling and label encoding).
- **FastAPI REST API**: Scalable backend endpoints for creating, updating, retrieving, and predicting student risk profiles.
- **PostgreSQL / Database Integration**: Persistent storage powered by SQLAlchemy with connection pooling and schema management.
- **Interactive Web Interface**: Single-Page Application (SPA) frontend providing an intuitive form interface, summary metrics, and tailored intervention steps.
- **Institution-Level Access Control**: Admin authentication and student data isolation for institutional privacy.
- **Data Profiling & Exploratory Analysis**: Includes dataset statistics and exploratory data analysis artifacts (`EDA.html`).

---

## Directory & File Structure

```text
├── dataset/
│   └── dataset.csv             # Historical student dataset used for model training
├── dtos.py                     # Pydantic schemas / Data Transfer Objects (DTOs)
├── model.py                    # SQLAlchemy database models for Student entity
├── database.py                 # DB engine setup and session dependency management
├── main.py / router            # FastAPI application routing and prediction logic
├── train.ipynb                 # Jupyter notebook used for data preprocessing and model training
├── trained_model.joblib        # Saved trained Machine Learning model
├── scaler.joblib               # Saved MinMaxScaler instance for feature normalization
├── label_encoding.joblib       # Dictionary of fitted LabelEncoders for categorical columns
├── index.html                  # Frontend Single Page Application (SPA) layout
├── style.css                   # Modern CSS design system and layout styling
├── script.js                   # Frontend application controller and API client
├── EDA.html                    # Generated YData/Pandas profiling report for dataset analysis
├── .env                        # Environment variables file (database URL, DB echo, etc.)
└── requirements.txt            # Project Python dependencies
```

---

## Machine Learning Pipeline & Features

The prediction model processes **10 input features** matching the feature ordering used during model training:

| Feature Field | Type | Description / Range | Categorical Encoding |
| :--- | :--- | :--- | :--- |
| `age` | Numerical | Student age (10–100) | N/A |
| `gender` | Categorical | `Male` / `Female` | Label Encoded |
| `attendance` | Numerical | Attendance percentage (0–100%) | N/A |
| `scholarship` | Categorical | `Yes` / `No` | Label Encoded |
| `co_curricular_activities` | Categorical | `Yes` / `No` | Label Encoded |
| `marks` | Numerical | Academic score (0–100) | N/A |
| `assignment_submission` | Categorical | `Yes`, `Half`, `No` | Label Encoded |
| `debtor` | Categorical | `Yes` / `No` (Outstanding tuition fees) | Label Encoded |
| `displaced` | Categorical | `Yes` / `No` (Relocated from home region) | Label Encoded |
| `income` | Numerical | Household annual income | N/A |

### Preprocessing & Prediction Execution Workflow
1. Raw inputs are extracted and ordered strictly according to `FEATURE_COLUMNS`.
2. Categorical variables are transformed via fitted `LabelEncoder` instances stored in `label_encoding.joblib`.
3. Numerical features are normalized using `MinMaxScaler` stored in `scaler.joblib`.
4. The scaled vector is passed to `trained_model.joblib`.
5. The model outputs a prediction code which is inverse-transformed back to a human-readable string (`Low`, `Medium`, or `High`).

---

## API Documentation

### Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/students/` | Create student record & compute risk level if omitted |
| `GET` | `/students/` | Paginated list of students with optional `prediction` filter |
| `GET` | `/students/{student_id}` | Retrieve details for a specific student ID |
| `PATCH` | `/students/{student_id}` | Update existing student attributes |
| `DELETE` | `/students/{student_id}` | Remove a student record |
| `POST` | `/students/predict` | Calculate dropout risk directly without creating DB record |

### Prediction API Payload Example (`POST /students/predict`)

**Request Body:**
```json
{
  "name": "Rohan Sharma",
  "student_id": "S007",
  "age": 19,
  "gender": "Male",
  "attendance": 85,
  "scholarship": "No",
  "co_curricular_activities": "Yes",
  "marks": 78,
  "assignment_submission": "Yes",
  "debtor": "No",
  "displaced": "No",
  "income": 120000
}
```

**Response Example:**
```json
{
  "status": "success",
  "prediction": "Low",
  "is_dropout_risk": false,
  "dropout_probability": 0.12
}
```

---

## Installation & Setup Guide

### 1. Prerequisites
- Python 3.9+
- PostgreSQL or SQLite database

### 2. Setup Virtual Environment & Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd pulse-prediction-system

# Create and activate virtual environment
python -m venv lenv
source lenv/bin/activate  # On Windows: lenv\Scripts\activate

# Install required dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
DB_CONNECTION=postgresql://username:password@localhost:5432/pulse_db
DB_ECHO=false
```

### 4. Running the Backend Server
```bash
uvicorn main:app --reload --port 8000
```
The FastAPI interactive documentation (Swagger UI) will be accessible at `http://127.0.0.1:8000/docs`.

### 5. Accessing the Web Frontend
Open `index.html` directly in your browser or serve it using a local static web server. Ensure `API_BASE` in `script.js` points to your backend URL.

---

## License & Advisory

- **Educational Purpose**: Designed for early intervention and academic counseling workflows.
- **Advisory Notice**: Predictions generated by this system are indicative. Institutional staff should verify metrics before taking intervention measures.