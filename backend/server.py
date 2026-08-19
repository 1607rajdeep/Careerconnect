import os
import uuid
import logging
import mimetypes
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

import jwt
import bcrypt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Header
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "career-connect"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("career-connect")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

storage_key: Optional[str] = None

def _init_storage_sync() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        r.raise_for_status()
        storage_key = r.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def _put_object_sync(path: str, data: bytes, content_type: str) -> dict:
    global storage_key
    key = _init_storage_sync()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    r = requests.put(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key, "Content-Type": content_type},
                     data=data, timeout=120)
    if r.status_code == 503:
        storage_key = None
        key = _init_storage_sync()
        r = requests.put(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key, "Content-Type": content_type},
                         data=data, timeout=120)
    if r.status_code == 402:
        raise HTTPException(402, "Storage credits exhausted")
    r.raise_for_status()
    return r.json()

def _get_object_sync(path: str):
    global storage_key
    key = _init_storage_sync()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 503:
        storage_key = None
        key = _init_storage_sync()
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code >= 400:
        raise HTTPException(404, "File not found")
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str
    role: str
    company_name: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class PublicUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool = True
    is_approved: bool = True
    photo_path: Optional[str] = None
    company_name: Optional[str] = None
    company_logo_path: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    experience_level: Optional[str] = None
    resume_path: Optional[str] = None

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PublicUser

class JobIn(BaseModel):
    title: str
    description: str
    category: str
    location: str
    job_type: str
    experience_level: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    requirements: Optional[str] = ""
    benefits: Optional[str] = ""

class JobOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    location: str
    job_type: str
    experience_level: str
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    requirements: str = ""
    benefits: str = ""
    employer_id: str
    company_name: str
    company_logo_path: Optional[str] = None
    status: str = "active"
    created_at: str
    applications_count: int = 0

class ApplyIn(BaseModel):
    job_id: str
    cover_letter: Optional[str] = ""

class ApplicationOut(BaseModel):
    id: str
    job_id: str
    job_title: str
    company_name: str
    seeker_id: str
    seeker_name: str
    seeker_email: str
    seeker_photo_path: Optional[str] = None
    seeker_resume_path: Optional[str] = None
    cover_letter: str = ""
    status: str
    created_at: str

class StatusUpdateIn(BaseModel):
    status: str

class ProfileUpdateIn(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    experience_level: Optional[str] = None
    company_name: Optional[str] = None

class NotificationOut(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    type: str
    read: bool = False
    created_at: str

class CategoryOut(BaseModel):
    id: str
    name: str
    icon: str
    job_count: int = 0

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def make_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "role": role, "iat": now, "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def user_to_public(u: dict) -> PublicUser:
    return PublicUser(
        id=u["id"], email=u["email"], full_name=u["full_name"], role=u["role"],
        is_active=u.get("is_active", True), is_approved=u.get("is_approved", True),
        photo_path=u.get("photo_path"), company_name=u.get("company_name"),
        company_logo_path=u.get("company_logo_path"), bio=u.get("bio"),
        location=u.get("location"), experience_level=u.get("experience_level"),
        resume_path=u.get("resume_path"),
    )

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        uid = payload.get("sub")
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": uid}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account deactivated")
    return user

def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return _dep

app = FastAPI(title="Career Connect API")
api = APIRouter(prefix="/api")

@api.get("/")
async def root():
    return {"app": "Career Connect", "status": "ok"}

@api.post("/auth/register", response_model=TokenOut)
async def register(data: RegisterIn):
    if data.role not in ("job_seeker", "employer"):
        raise HTTPException(400, "Invalid role")
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")
    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": uid, "email": email, "password_hash": hash_password(data.password),
        "full_name": data.full_name, "role": data.role,
        "is_active": True, "is_approved": True,
        "photo_path": None, "bio": "", "location": "", "experience_level": "Entry",
        "resume_path": None,
        "company_name": data.company_name if data.role == "employer" else None,
        "company_logo_path": None, "created_at": now,
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None); doc.pop("_id", None)
    return TokenOut(access_token=make_token(uid, data.role), user=user_to_public(doc))

@api.post("/auth/login", response_model=TokenOut)
async def login(data: LoginIn):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account deactivated")
    return TokenOut(access_token=make_token(user["id"], user["role"]), user=user_to_public(user))

@api.get("/auth/me", response_model=PublicUser)
async def me(user: dict = Depends(get_current_user)):
    return user_to_public(user)

@api.put("/auth/me", response_model=PublicUser)
async def update_me(data: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return user_to_public(fresh)

ALLOWED_IMAGE = {"image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"}
ALLOWED_DOC = {"application/pdf", "application/msword",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
MAX_SIZE = 8 * 1024 * 1024

async def _upload_file(f: UploadFile, kind: str, user_id: str, allowed: set) -> str:
    data = await f.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "File too large (max 8MB)")
    ctype = f.content_type or mimetypes.guess_type(f.filename or "")[0] or "application/octet-stream"
    if ctype not in allowed:
        raise HTTPException(400, f"Unsupported file type: {ctype}")
    ext = (f.filename or "").rsplit(".", 1)[-1].lower() if "." in (f.filename or "") else "bin"
    path = f"{APP_NAME}/uploads/{user_id}/{kind}-{uuid.uuid4()}.{ext}"
    await run_in_threadpool(_put_object_sync, path, data, ctype)
    return path

@api.post("/uploads/photo")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    path = await _upload_file(file, "photo", user["id"], ALLOWED_IMAGE)
    await db.users.update_one({"id": user["id"]}, {"$set": {"photo_path": path}})
    return {"path": path}

@api.post("/uploads/resume")
async def upload_resume(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if user["role"] != "job_seeker":
        raise HTTPException(403, "Only seekers can upload resume")
    path = await _upload_file(file, "resume", user["id"], ALLOWED_DOC)
    await db.users.update_one({"id": user["id"]}, {"$set": {"resume_path": path}})
    return {"path": path}

@api.post("/uploads/logo")
async def upload_logo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if user["role"] != "employer":
        raise HTTPException(403, "Only employers can upload logo")
    path = await _upload_file(file, "logo", user["id"], ALLOWED_IMAGE)
    await db.users.update_one({"id": user["id"]}, {"$set": {"company_logo_path": path}})
    return {"path": path}

@api.get("/files/{path:path}")
async def get_file(path: str, token: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    ok = False
    if authorization and authorization.lower().startswith("bearer "):
        try: jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"]); ok = True
        except Exception: pass
    if not ok and token:
        try: jwt.decode(token, JWT_SECRET, algorithms=["HS256"]); ok = True
        except Exception: pass
    if not ok:
        raise HTTPException(401, "Auth required")
    content, ctype = await run_in_threadpool(_get_object_sync, path)
    return Response(content=content, media_type=ctype)

@api.get("/categories", response_model=List[CategoryOut])
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(500)
    for c in cats:
        c["job_count"] = await db.jobs.count_documents({"category": c["name"], "status": "active"})
    return cats

async def _job_to_out(job: dict) -> JobOut:
    count = await db.applications.count_documents({"job_id": job["id"]})
    employer = await db.users.find_one({"id": job["employer_id"]}, {"_id": 0}) or {}
    return JobOut(
        id=job["id"], title=job["title"], description=job["description"],
        category=job["category"], location=job["location"], job_type=job["job_type"],
        experience_level=job["experience_level"], salary_min=job.get("salary_min"),
        salary_max=job.get("salary_max"), requirements=job.get("requirements", ""),
        benefits=job.get("benefits", ""), employer_id=job["employer_id"],
        company_name=job.get("company_name") or employer.get("company_name") or "Company",
        company_logo_path=employer.get("company_logo_path"),
        status=job.get("status", "active"), created_at=job["created_at"],
        applications_count=count,
    )

@api.get("/jobs", response_model=List[JobOut])
async def list_jobs(
    q: Optional[str] = None, location: Optional[str] = None, category: Optional[str] = None,
    job_type: Optional[str] = None, experience_level: Optional[str] = None,
    limit: int = 50, skip: int = 0, status: Optional[str] = "active",
):
    filt: dict = {}
    if status: filt["status"] = status
    if location: filt["location"] = {"$regex": location, "$options": "i"}
    if category: filt["category"] = category
    if job_type: filt["job_type"] = job_type
    if experience_level: filt["experience_level"] = experience_level
    if q:
        filt["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"company_name": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.jobs.find(filt, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [await _job_to_out(j) for j in docs]

@api.get("/jobs/featured", response_model=List[JobOut])
async def featured_jobs():
    docs = await db.jobs.find({"status": "active"}, {"_id": 0}).sort("created_at", -1).limit(6).to_list(6)
    return [await _job_to_out(j) for j in docs]

@api.get("/jobs/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    j = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not j: raise HTTPException(404, "Job not found")
    return await _job_to_out(j)

@api.post("/jobs", response_model=JobOut)
async def create_job(data: JobIn, user: dict = Depends(require_roles("employer"))):
    if not user.get("is_approved", True):
        raise HTTPException(403, "Employer not approved yet")
    jid = str(uuid.uuid4())
    doc = data.dict()
    doc.update({
        "id": jid, "employer_id": user["id"],
        "company_name": user.get("company_name") or user["full_name"],
        "status": "active", "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.jobs.insert_one(doc)
    doc.pop("_id", None)
    return await _job_to_out(doc)

@api.put("/jobs/{job_id}", response_model=JobOut)
async def update_job(job_id: str, data: JobIn, user: dict = Depends(require_roles("employer", "admin"))):
    j = await db.jobs.find_one({"id": job_id})
    if not j: raise HTTPException(404, "Job not found")
    if user["role"] != "admin" and j["employer_id"] != user["id"]:
        raise HTTPException(403, "Not your job")
    await db.jobs.update_one({"id": job_id}, {"$set": data.dict()})
    fresh = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return await _job_to_out(fresh)

@api.post("/jobs/{job_id}/close")
async def close_job(job_id: str, user: dict = Depends(require_roles("employer", "admin"))):
    j = await db.jobs.find_one({"id": job_id})
    if not j: raise HTTPException(404, "Job not found")
    if user["role"] != "admin" and j["employer_id"] != user["id"]:
        raise HTTPException(403, "Not your job")
    await db.jobs.update_one({"id": job_id}, {"$set": {"status": "closed"}})
    return {"ok": True}

@api.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(require_roles("employer", "admin"))):
    j = await db.jobs.find_one({"id": job_id})
    if not j: raise HTTPException(404, "Job not found")
    if user["role"] != "admin" and j["employer_id"] != user["id"]:
        raise HTTPException(403, "Not your job")
    await db.jobs.delete_one({"id": job_id})
    await db.applications.delete_many({"job_id": job_id})
    await db.saved_jobs.delete_many({"job_id": job_id})
    return {"ok": True}

@api.get("/employer/jobs", response_model=List[JobOut])
async def employer_jobs(user: dict = Depends(require_roles("employer"))):
    docs = await db.jobs.find({"employer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [await _job_to_out(j) for j in docs]

async def _app_to_out(a: dict) -> ApplicationOut:
    job = await db.jobs.find_one({"id": a["job_id"]}, {"_id": 0}) or {}
    seeker = await db.users.find_one({"id": a["seeker_id"]}, {"_id": 0}) or {}
    return ApplicationOut(
        id=a["id"], job_id=a["job_id"],
        job_title=job.get("title", "Unknown"),
        company_name=job.get("company_name", ""),
        seeker_id=a["seeker_id"], seeker_name=seeker.get("full_name", ""),
        seeker_email=seeker.get("email", ""),
        seeker_photo_path=seeker.get("photo_path"),
        seeker_resume_path=seeker.get("resume_path"),
        cover_letter=a.get("cover_letter", ""),
        status=a.get("status", "applied"),
        created_at=a["created_at"],
    )

@api.post("/applications", response_model=ApplicationOut)
async def apply(data: ApplyIn, user: dict = Depends(require_roles("job_seeker"))):
    j = await db.jobs.find_one({"id": data.job_id})
    if not j: raise HTTPException(404, "Job not found")
    if j.get("status") != "active": raise HTTPException(400, "Job is not active")
    existing = await db.applications.find_one({"job_id": data.job_id, "seeker_id": user["id"]})
    if existing: raise HTTPException(409, "Already applied")
    aid = str(uuid.uuid4())
    doc = {
        "id": aid, "job_id": data.job_id, "seeker_id": user["id"],
        "cover_letter": data.cover_letter or "", "status": "applied",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.applications.insert_one(doc)
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": j["employer_id"],
        "title": "New application", "body": f"{user['full_name']} applied for {j['title']}",
        "type": "new_application", "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return await _app_to_out(doc)

@api.get("/applications/mine", response_model=List[ApplicationOut])
async def my_applications(user: dict = Depends(require_roles("job_seeker"))):
    docs = await db.applications.find({"seeker_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [await _app_to_out(a) for a in docs]

@api.get("/applications/job/{job_id}", response_model=List[ApplicationOut])
async def job_applications(job_id: str, user: dict = Depends(require_roles("employer", "admin"))):
    j = await db.jobs.find_one({"id": job_id})
    if not j: raise HTTPException(404, "Job not found")
    if user["role"] != "admin" and j["employer_id"] != user["id"]:
        raise HTTPException(403, "Not your job")
    docs = await db.applications.find({"job_id": job_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [await _app_to_out(a) for a in docs]

@api.put("/applications/{app_id}/status", response_model=ApplicationOut)
async def update_status(app_id: str, data: StatusUpdateIn, user: dict = Depends(require_roles("employer", "admin"))):
    valid = {"applied", "under_review", "shortlisted", "rejected", "hired"}
    if data.status not in valid: raise HTTPException(400, "Invalid status")
    a = await db.applications.find_one({"id": app_id})
    if not a: raise HTTPException(404, "Application not found")
    j = await db.jobs.find_one({"id": a["job_id"]})
    if user["role"] != "admin" and j and j["employer_id"] != user["id"]:
        raise HTTPException(403, "Not your job")
    await db.applications.update_one({"id": app_id}, {"$set": {"status": data.status}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": a["seeker_id"],
        "title": "Application update",
        "body": f"Your application for {j['title'] if j else 'a job'} is now: {data.status.replace('_', ' ').title()}",
        "type": "status_update", "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    fresh = await db.applications.find_one({"id": app_id}, {"_id": 0})
    return await _app_to_out(fresh)

@api.get("/saved", response_model=List[JobOut])
async def list_saved(user: dict = Depends(require_roles("job_seeker"))):
    saved = await db.saved_jobs.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [s["job_id"] for s in saved]
    docs = await db.jobs.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    return [await _job_to_out(j) for j in docs]

@api.post("/saved/{job_id}")
async def toggle_saved(job_id: str, user: dict = Depends(require_roles("job_seeker"))):
    existing = await db.saved_jobs.find_one({"user_id": user["id"], "job_id": job_id})
    if existing:
        await db.saved_jobs.delete_one({"user_id": user["id"], "job_id": job_id})
        return {"saved": False}
    await db.saved_jobs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "job_id": job_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"saved": True}

@api.get("/saved/ids")
async def saved_ids(user: dict = Depends(require_roles("job_seeker"))):
    saved = await db.saved_jobs.find({"user_id": user["id"]}, {"_id": 0, "job_id": 1}).to_list(500)
    return {"ids": [s["job_id"] for s in saved]}

@api.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return [NotificationOut(**d) for d in docs]

@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_roles("admin"))):
    seekers = await db.users.count_documents({"role": "job_seeker"})
    employers = await db.users.count_documents({"role": "employer"})
    jobs = await db.jobs.count_documents({})
    active_jobs = await db.jobs.count_documents({"status": "active"})
    apps = await db.applications.count_documents({})
    pending_employers = await db.users.count_documents({"role": "employer", "is_approved": False})
    return {"seekers": seekers, "employers": employers, "jobs": jobs,
            "active_jobs": active_jobs, "applications": apps,
            "pending_employers": pending_employers}

@api.get("/admin/users", response_model=List[PublicUser])
async def admin_list_users(role: Optional[str] = None, user: dict = Depends(require_roles("admin"))):
    filt = {}
    if role: filt["role"] = role
    docs = await db.users.find(filt, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return [user_to_public(d) for d in docs]

@api.post("/admin/users/{uid}/toggle-active")
async def admin_toggle_active(uid: str, user: dict = Depends(require_roles("admin"))):
    u = await db.users.find_one({"id": uid})
    if not u: raise HTTPException(404, "User not found")
    new_state = not u.get("is_active", True)
    await db.users.update_one({"id": uid}, {"$set": {"is_active": new_state}})
    return {"is_active": new_state}

@api.post("/admin/users/{uid}/approve")
async def admin_approve(uid: str, user: dict = Depends(require_roles("admin"))):
    await db.users.update_one({"id": uid}, {"$set": {"is_approved": True}})
    return {"ok": True}

@api.get("/admin/jobs", response_model=List[JobOut])
async def admin_all_jobs(user: dict = Depends(require_roles("admin"))):
    docs = await db.jobs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [await _job_to_out(j) for j in docs]

@api.post("/admin/jobs/{jid}/toggle")
async def admin_toggle_job(jid: str, user: dict = Depends(require_roles("admin"))):
    j = await db.jobs.find_one({"id": jid})
    if not j: raise HTTPException(404, "Job not found")
    new_status = "closed" if j.get("status") == "active" else "active"
    await db.jobs.update_one({"id": jid}, {"$set": {"status": new_status}})
    return {"status": new_status}

class CategoryIn(BaseModel):
    name: str
    icon: str = "briefcase"

@api.post("/admin/categories", response_model=CategoryOut)
async def admin_add_category(data: CategoryIn, user: dict = Depends(require_roles("admin"))):
    existing = await db.categories.find_one({"name": data.name})
    if existing: raise HTTPException(409, "Category exists")
    cid = str(uuid.uuid4())
    doc = {"id": cid, "name": data.name, "icon": data.icon}
    await db.categories.insert_one(doc)
    return CategoryOut(id=cid, name=data.name, icon=data.icon, job_count=0)

@api.delete("/admin/categories/{cid}")
async def admin_del_category(cid: str, user: dict = Depends(require_roles("admin"))):
    await db.categories.delete_one({"id": cid})
    return {"ok": True}

app.include_router(api)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

SEED_CATEGORIES = [
    ("Software Engineering", "code-slash"),
    ("Design", "color-palette"),
    ("Marketing", "megaphone"),
    ("Sales", "trending-up"),
    ("Data Science", "analytics"),
    ("Customer Support", "headset"),
    ("Finance", "cash"),
    ("Operations", "cog"),
]

SEED_JOBS = [
    {"title": "Senior React Native Engineer", "company": "Google", "category": "Software Engineering",
     "location": "Mountain View, CA", "job_type": "Full-time", "experience_level": "Senior",
     "salary_min": 180000, "salary_max": 240000,
     "description": "Build performant mobile experiences used by billions. Join our platform team crafting the next generation of Google apps.",
     "requirements": "5+ years React Native. TypeScript. Native module experience.",
     "benefits": "Equity. Health, dental, vision. Free food. 401k match."},
    {"title": "Product Designer", "company": "Apple", "category": "Design",
     "location": "Cupertino, CA", "job_type": "Full-time", "experience_level": "Mid",
     "salary_min": 140000, "salary_max": 190000,
     "description": "Design beautiful experiences for our next generation of devices.",
     "requirements": "4+ years product design. Figma expert. Strong portfolio.",
     "benefits": "Employee discount. Equity. Wellness stipend."},
    {"title": "Data Scientist", "company": "Microsoft", "category": "Data Science",
     "location": "Redmond, WA", "job_type": "Full-time", "experience_level": "Mid",
     "salary_min": 130000, "salary_max": 180000,
     "description": "Analyze petabyte-scale datasets to drive product decisions across Azure.",
     "requirements": "MS/PhD in quantitative field. Python, SQL, ML frameworks.",
     "benefits": "Remote-friendly. Stock. Learning budget."},
    {"title": "Growth Marketing Lead", "company": "Google", "category": "Marketing",
     "location": "Remote", "job_type": "Remote", "experience_level": "Senior",
     "salary_min": 150000, "salary_max": 200000,
     "description": "Own end-to-end growth strategy for our fastest-growing product.",
     "requirements": "7+ years growth. Track record scaling B2C. Analytics-driven.",
     "benefits": "Remote. Equity. Unlimited PTO."},
    {"title": "Junior Frontend Developer", "company": "Apple", "category": "Software Engineering",
     "location": "New York, NY", "job_type": "Full-time", "experience_level": "Entry",
     "salary_min": 90000, "salary_max": 120000,
     "description": "Kickstart your career on our web platform team.",
     "requirements": "CS degree or equivalent. React, JS, CSS. Curiosity.",
     "benefits": "Mentorship. Health. Equity."},
    {"title": "Enterprise Account Executive", "company": "Microsoft", "category": "Sales",
     "location": "Chicago, IL", "job_type": "Full-time", "experience_level": "Senior",
     "salary_min": 120000, "salary_max": 180000,
     "description": "Close 7-figure deals with Fortune 500 accounts.",
     "requirements": "8+ years SaaS sales. Proven quota attainment.",
     "benefits": "OTE $300k+. Car allowance. Full benefits."},
    {"title": "Customer Support Specialist", "company": "Google", "category": "Customer Support",
     "location": "Austin, TX", "job_type": "Full-time", "experience_level": "Entry",
     "salary_min": 55000, "salary_max": 75000,
     "description": "Delight customers via chat, email, and calls.",
     "requirements": "Excellent communication. Empathy. Attention to detail.",
     "benefits": "Free lunch. Career growth. Health."},
    {"title": "Financial Analyst Intern", "company": "Apple", "category": "Finance",
     "location": "Cupertino, CA", "job_type": "Internship", "experience_level": "Entry",
     "salary_min": 40000, "salary_max": 55000,
     "description": "Support corporate finance team on strategic projects.",
     "requirements": "Finance/Econ student. Excel wizard. Strong analytical skills.",
     "benefits": "Housing stipend. Mentorship."},
]

async def seed():
    if await db.categories.count_documents({}) == 0:
        for name, icon in SEED_CATEGORIES:
            await db.categories.insert_one({"id": str(uuid.uuid4()), "name": name, "icon": icon})
        logger.info("Seeded categories")
    if await db.users.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": "admin@careerconnect.com",
            "password_hash": hash_password("Admin123!"),
            "full_name": "Platform Admin", "role": "admin",
            "is_active": True, "is_approved": True, "photo_path": None,
            "bio": "Platform administrator", "location": "HQ", "experience_level": "Lead",
            "resume_path": None, "company_name": None, "company_logo_path": None,
            "created_at": now,
        })
        for e, n in [("seeker@careerconnect.com", "Alex Rivera"), ("emily@careerconnect.com", "Emily Chen")]:
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "email": e, "password_hash": hash_password("Seeker123!"),
                "full_name": n, "role": "job_seeker",
                "is_active": True, "is_approved": True, "photo_path": None,
                "bio": "Passionate software engineer seeking new challenges.",
                "location": "San Francisco, CA", "experience_level": "Mid",
                "resume_path": None, "company_name": None, "company_logo_path": None,
                "created_at": now,
            })
        employers = []
        for e, n, c in [
            ("employer@careerconnect.com", "Sarah Johnson", "Google"),
            ("hiring@microsoft.com", "David Kim", "Microsoft"),
            ("recruit@apple.com", "Lisa Wang", "Apple"),
        ]:
            eid = str(uuid.uuid4())
            employers.append((eid, c))
            await db.users.insert_one({
                "id": eid, "email": e, "password_hash": hash_password("Employer123!"),
                "full_name": n, "role": "employer",
                "is_active": True, "is_approved": True, "photo_path": None,
                "bio": f"Hiring manager at {c}", "location": "USA", "experience_level": "Senior",
                "resume_path": None, "company_name": c, "company_logo_path": None,
                "created_at": now,
            })
        emp_map = {c: eid for eid, c in employers}
        for j in SEED_JOBS:
            await db.jobs.insert_one({
                "id": str(uuid.uuid4()), "employer_id": emp_map[j["company"]],
                "company_name": j["company"],
                "title": j["title"], "description": j["description"], "category": j["category"],
                "location": j["location"], "job_type": j["job_type"],
                "experience_level": j["experience_level"],
                "salary_min": j["salary_min"], "salary_max": j["salary_max"],
                "requirements": j["requirements"], "benefits": j["benefits"],
                "status": "active", "created_at": now,
            })
        logger.info("Seeded users and jobs")

@app.on_event("startup")
async def on_startup():
    await seed()
    try:
        await run_in_threadpool(_init_storage_sync)
    except Exception as e:
        logger.warning(f"Storage init at startup: {e}")

@app.on_event("shutdown")
async def on_shutdown():
    client.close()
