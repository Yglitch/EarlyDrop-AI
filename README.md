# Early Drop Prediction System

Early Drop is a web app that helps school and college coordinators spot students at risk of dropping out **before** it happens. Admins enter a student's academic and personal signals, a machine learning model scores their dropout risk as **Low / Medium / High**, and the app suggests next steps for outreach.

Each admin registers and logs in separately, and only ever sees the students tied to their own institution.

## How it works

1. An admin registers or logs in.
2. They fill in a student's details — attendance, marks, assignment submission, financial background, and more.
3. The form sends that data to the backend, where a trained ML model returns a risk level.
4. The app shows the risk level along with a description and recommended next steps, and adds the student to the admin's flagged list if the risk is high.

## Tech stack

| Layer      | Technology |
|------------|------------|
| Frontend   | HTML, CSS, vanilla JavaScript |
| Backend    | Python (Flask / FastAPI) |
| Database   | PostgreSQL |
| ML model   | Python (scikit-learn / your model of choice) |

The frontend and backend are decoupled — the frontend talks to the backend only through the REST API described below, so the ML model or backend framework can be swapped without touching the UI.

## Project structure

```
early-drop/
├── frontend/
│   ├── index.html      # All pages (landing, form, result, about, contact, login, register)
│   ├── style.css        # Styling
│   └── script.js         # Routing, auth, form handling, API calls
├── backend/              # Flask/FastAPI app (Postgres-backed) — add your implementation here
│   └── ...
└── README.md
```

## Input signals

The prediction form collects the following fields for each student:

| Field | Description |
|---|---|
| `name` | Student's full name |
| `student_id` | Student ID / roll number |
| `age` | Student's age |
| `gender` | Male / Female / Other |
| `attendance` | Attendance percentage (0–100) |
| `scholarship` | Whether the student holds a scholarship (Yes/No) |
| `co_curricular_activities` | Participation in co-curricular activities (Yes/No) |
| `marks` | Academic marks (0–100) |
| `assignment_submission` | Assignment submission status (Yes / Half / No) |
| `debtor` | Whether the student has an outstanding fee balance (Yes/No) |
| `displaced` | Whether the student is relocated from their home region (Yes/No) |
| `income` | Annual household income |

`prediction` (Low / Medium / High) is the model's **output**, returned by the backend — it isn't collected from the user.


### Frontend

The frontend is static — no build step required.

```bash
cd frontend
python3 -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

By default, API calls in `script.js` go to the same origin the frontend is served from. If your backend runs elsewhere, update `API_BASE` at the top of `script.js`:

```js
var API_BASE = 'https://your-backend-url.com';
```

### Backend (to be added)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# configure your Postgres connection (e.g. via a .env file)
flask run   # or: uvicorn main:app --reload
```

### Database

PostgreSQL is used to store:
- Admin accounts (with hashed passwords)
- Student records and their prediction history, scoped per admin/institution

## Roadmap

- [ ] Implement backend auth (`/api/auth/register`, `/api/auth/login`) with hashed passwords and JWT tokens
- [ ] Plug in the trained ML model behind `/api/predict`
- [ ] Implement `/api/students/high-risk` with per-admin scoping
- [ ] Add password reset / email verification
- [ ] Deploy backend + frontend

## License

TBD.

## Contributing

Issues and pull requests are welcome. If you're adding a new input signal or endpoint, please update this README to match.
