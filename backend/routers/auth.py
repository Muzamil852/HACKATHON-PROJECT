"""Authentication router for CivicNova AI admin access."""
from fastapi import APIRouter, HTTPException, Depends
from schemas import LoginRequest, LoginResponse
import uuid

router = APIRouter()

DEMO_USERS = {
    "admin@civic.gov": "admin123",
    "admin": "admin123",
}


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    username = request.username.strip().lower()
    password = request.password.strip()

    if username not in DEMO_USERS or DEMO_USERS[username] != password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email/username or password. Demo credentials: admin@civic.gov / admin123",
        )

    token = f"cr_token_{uuid.uuid4().hex}"
    return LoginResponse(
        token=token,
        token_type="bearer",
        user={
            "id": "admin_01",
            "name": "Administrator",
            "email": "admin@civic.gov",
            "role": "Civic Operations Lead",
        },
    )


@router.get("/me")
def get_me():
    return {
        "id": "admin_01",
        "name": "Administrator",
        "email": "admin@civic.gov",
        "role": "Civic Operations Lead",
    }
