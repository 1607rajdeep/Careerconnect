"""Career Connect - backend API integration tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://connect-careers-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEEKER = {"email": "seeker@careerconnect.com", "password": "Seeker123!"}
EMPLOYER = {"email": "employer@careerconnect.com", "password": "Employer123!"}
ADMIN = {"email": "admin@careerconnect.com", "password": "Admin123!"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()["access_token"], r.json()["user"]


@pytest.fixture(scope="session")
def seeker_ctx():
    tok, u = _login(SEEKER)
    return {"token": tok, "user": u, "h": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="session")
def employer_ctx():
    tok, u = _login(EMPLOYER)
    return {"token": tok, "user": u, "h": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="session")
def admin_ctx():
    tok, u = _login(ADMIN)
    return {"token": tok, "user": u, "h": {"Authorization": f"Bearer {tok}"}}


# ---------- Health ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200 and r.json().get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_login_seeker(self, seeker_ctx):
        assert seeker_ctx["user"]["role"] == "job_seeker"

    def test_login_employer(self, employer_ctx):
        assert employer_ctx["user"]["role"] == "employer"

    def test_login_admin(self, admin_ctx):
        assert admin_ctx["user"]["role"] == "admin"

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": SEEKER["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, seeker_ctx):
        r = requests.get(f"{API}/auth/me", headers=seeker_ctx["h"])
        assert r.status_code == 200 and r.json()["email"] == SEEKER["email"]

    def test_update_me(self, seeker_ctx):
        r = requests.put(f"{API}/auth/me", headers=seeker_ctx["h"], json={"bio": "TEST_bio_update", "location": "TEST_SF"})
        assert r.status_code == 200
        assert r.json()["bio"] == "TEST_bio_update"
        g = requests.get(f"{API}/auth/me", headers=seeker_ctx["h"])
        assert g.json()["location"] == "TEST_SF"

    def test_register_seeker(self):
        email = f"TEST_seeker_{uuid.uuid4().hex[:8]}@t.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "full_name": "TEST User", "role": "job_seeker"
        })
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "job_seeker"

    def test_register_employer(self):
        email = f"TEST_emp_{uuid.uuid4().hex[:8]}@t.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "full_name": "TEST Emp",
            "role": "employer", "company_name": "TEST Co"
        })
        assert r.status_code == 200 and r.json()["user"]["role"] == "employer"

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": SEEKER["email"], "password": "Pass1234!", "full_name": "x", "role": "job_seeker"
        })
        assert r.status_code == 409

    def test_missing_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Categories & Jobs ----------
class TestJobs:
    def test_categories(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200 and len(r.json()) >= 8

    def test_featured(self):
        r = requests.get(f"{API}/jobs/featured")
        assert r.status_code == 200 and len(r.json()) > 0

    def test_list_jobs(self):
        r = requests.get(f"{API}/jobs")
        assert r.status_code == 200 and len(r.json()) >= 8

    def test_filter_by_category(self):
        r = requests.get(f"{API}/jobs", params={"category": "Software Engineering"})
        assert r.status_code == 200
        for j in r.json():
            assert j["category"] == "Software Engineering"

    def test_filter_q(self):
        r = requests.get(f"{API}/jobs", params={"q": "React"})
        assert r.status_code == 200 and len(r.json()) >= 1

    def test_filter_location(self):
        r = requests.get(f"{API}/jobs", params={"location": "CA"})
        assert r.status_code == 200 and len(r.json()) >= 1

    def test_filter_type_exp(self):
        r = requests.get(f"{API}/jobs", params={"job_type": "Full-time", "experience_level": "Senior"})
        assert r.status_code == 200

    def test_get_single_job(self):
        jobs = requests.get(f"{API}/jobs").json()
        r = requests.get(f"{API}/jobs/{jobs[0]['id']}")
        assert r.status_code == 200 and r.json()["id"] == jobs[0]["id"]

    def test_get_missing_job(self):
        assert requests.get(f"{API}/jobs/nope").status_code == 404


# ---------- Employer Job CRUD ----------
class TestEmployerJobs:
    created_job_id = None

    def test_create_job(self, employer_ctx):
        payload = {
            "title": "TEST_QA Engineer", "description": "TEST role",
            "category": "Software Engineering", "location": "TEST_Remote",
            "job_type": "Full-time", "experience_level": "Mid",
            "salary_min": 100000, "salary_max": 130000,
            "requirements": "TEST", "benefits": "TEST",
        }
        r = requests.post(f"{API}/jobs", headers=employer_ctx["h"], json=payload)
        assert r.status_code == 200, r.text
        TestEmployerJobs.created_job_id = r.json()["id"]
        # verify persisted
        g = requests.get(f"{API}/jobs/{TestEmployerJobs.created_job_id}")
        assert g.status_code == 200 and g.json()["title"] == payload["title"]

    def test_employer_jobs_list(self, employer_ctx):
        r = requests.get(f"{API}/employer/jobs", headers=employer_ctx["h"])
        assert r.status_code == 200
        assert any(j["id"] == TestEmployerJobs.created_job_id for j in r.json())

    def test_seeker_cannot_post_job(self, seeker_ctx):
        r = requests.post(f"{API}/jobs", headers=seeker_ctx["h"], json={
            "title": "x", "description": "x", "category": "Design",
            "location": "x", "job_type": "Full-time", "experience_level": "Entry"
        })
        assert r.status_code == 403

    def test_update_job(self, employer_ctx):
        r = requests.put(f"{API}/jobs/{TestEmployerJobs.created_job_id}", headers=employer_ctx["h"], json={
            "title": "TEST_QA Engineer v2", "description": "updated",
            "category": "Software Engineering", "location": "TEST_Remote",
            "job_type": "Full-time", "experience_level": "Mid",
        })
        assert r.status_code == 200 and r.json()["title"] == "TEST_QA Engineer v2"

    def test_close_job(self, employer_ctx):
        r = requests.post(f"{API}/jobs/{TestEmployerJobs.created_job_id}/close", headers=employer_ctx["h"])
        assert r.status_code == 200
        j = requests.get(f"{API}/jobs/{TestEmployerJobs.created_job_id}").json()
        assert j["status"] == "closed"

    def test_zzz_delete_job(self, employer_ctx):
        # Recreate + delete to keep other tests intact
        payload = {
            "title": "TEST_ToDelete", "description": "x", "category": "Design",
            "location": "x", "job_type": "Full-time", "experience_level": "Entry"
        }
        c = requests.post(f"{API}/jobs", headers=employer_ctx["h"], json=payload).json()
        r = requests.delete(f"{API}/jobs/{c['id']}", headers=employer_ctx["h"])
        assert r.status_code == 200
        assert requests.get(f"{API}/jobs/{c['id']}").status_code == 404


# ---------- Applications ----------
class TestApplications:
    app_id = None
    job_id = None

    def test_apply(self, seeker_ctx, employer_ctx):
        # create a fresh active job by employer
        job = requests.post(f"{API}/jobs", headers=employer_ctx["h"], json={
            "title": "TEST_ApplyJob", "description": "x",
            "category": "Design", "location": "x",
            "job_type": "Full-time", "experience_level": "Mid",
        }).json()
        TestApplications.job_id = job["id"]
        r = requests.post(f"{API}/applications", headers=seeker_ctx["h"], json={
            "job_id": job["id"], "cover_letter": "TEST cover"
        })
        assert r.status_code == 200, r.text
        TestApplications.app_id = r.json()["id"]
        assert r.json()["status"] == "applied"

    def test_duplicate_apply_409(self, seeker_ctx):
        r = requests.post(f"{API}/applications", headers=seeker_ctx["h"], json={
            "job_id": TestApplications.job_id, "cover_letter": "again"
        })
        assert r.status_code == 409

    def test_mine(self, seeker_ctx):
        r = requests.get(f"{API}/applications/mine", headers=seeker_ctx["h"])
        assert r.status_code == 200 and any(a["id"] == TestApplications.app_id for a in r.json())

    def test_employer_sees_applicants(self, employer_ctx):
        r = requests.get(f"{API}/applications/job/{TestApplications.job_id}", headers=employer_ctx["h"])
        assert r.status_code == 200 and len(r.json()) >= 1

    def test_update_status(self, employer_ctx):
        r = requests.put(f"{API}/applications/{TestApplications.app_id}/status",
                         headers=employer_ctx["h"], json={"status": "shortlisted"})
        assert r.status_code == 200 and r.json()["status"] == "shortlisted"

    def test_invalid_status(self, employer_ctx):
        r = requests.put(f"{API}/applications/{TestApplications.app_id}/status",
                         headers=employer_ctx["h"], json={"status": "bogus"})
        assert r.status_code == 400

    def test_seeker_cant_view_job_apps(self, seeker_ctx):
        r = requests.get(f"{API}/applications/job/{TestApplications.job_id}", headers=seeker_ctx["h"])
        assert r.status_code == 403


# ---------- Saved Jobs ----------
class TestSaved:
    def test_toggle_and_list(self, seeker_ctx):
        jobs = requests.get(f"{API}/jobs").json()
        jid = jobs[0]["id"]
        r = requests.post(f"{API}/saved/{jid}", headers=seeker_ctx["h"])
        assert r.status_code == 200 and r.json()["saved"] in (True, False)
        # ensure it becomes saved
        if not r.json()["saved"]:
            r = requests.post(f"{API}/saved/{jid}", headers=seeker_ctx["h"])
            assert r.json()["saved"] is True
        ids = requests.get(f"{API}/saved/ids", headers=seeker_ctx["h"]).json()["ids"]
        assert jid in ids
        lst = requests.get(f"{API}/saved", headers=seeker_ctx["h"]).json()
        assert any(j["id"] == jid for j in lst)
        # untoggle
        r2 = requests.post(f"{API}/saved/{jid}", headers=seeker_ctx["h"])
        assert r2.json()["saved"] is False


# ---------- Notifications ----------
class TestNotifications:
    def test_employer_notification_on_apply(self, employer_ctx):
        r = requests.get(f"{API}/notifications", headers=employer_ctx["h"])
        assert r.status_code == 200
        assert any(n["type"] == "new_application" for n in r.json())

    def test_seeker_notification_on_status(self, seeker_ctx):
        r = requests.get(f"{API}/notifications", headers=seeker_ctx["h"])
        assert r.status_code == 200
        assert any(n["type"] == "status_update" for n in r.json())

    def test_read_all(self, seeker_ctx):
        r = requests.post(f"{API}/notifications/read-all", headers=seeker_ctx["h"])
        assert r.status_code == 200
        n = requests.get(f"{API}/notifications", headers=seeker_ctx["h"]).json()
        assert all(x["read"] for x in n)


# ---------- Admin ----------
class TestAdmin:
    cat_id = None

    def test_stats(self, admin_ctx):
        r = requests.get(f"{API}/admin/stats", headers=admin_ctx["h"])
        assert r.status_code == 200
        d = r.json()
        for k in ("seekers", "employers", "jobs", "active_jobs", "applications"):
            assert k in d

    def test_users_role_filter(self, admin_ctx):
        r = requests.get(f"{API}/admin/users", headers=admin_ctx["h"], params={"role": "employer"})
        assert r.status_code == 200 and all(u["role"] == "employer" for u in r.json())

    def test_toggle_user_active(self, admin_ctx):
        users = requests.get(f"{API}/admin/users", headers=admin_ctx["h"], params={"role": "job_seeker"}).json()
        target = [u for u in users if u["email"] == "emily@careerconnect.com"][0]
        r1 = requests.post(f"{API}/admin/users/{target['id']}/toggle-active", headers=admin_ctx["h"])
        assert r1.status_code == 200
        # toggle back
        r2 = requests.post(f"{API}/admin/users/{target['id']}/toggle-active", headers=admin_ctx["h"])
        assert r2.status_code == 200

    def test_admin_jobs_and_toggle(self, admin_ctx):
        r = requests.get(f"{API}/admin/jobs", headers=admin_ctx["h"])
        assert r.status_code == 200 and len(r.json()) > 0
        jid = r.json()[0]["id"]
        original = r.json()[0]["status"]
        t = requests.post(f"{API}/admin/jobs/{jid}/toggle", headers=admin_ctx["h"])
        assert t.status_code == 200 and t.json()["status"] != original
        # restore
        requests.post(f"{API}/admin/jobs/{jid}/toggle", headers=admin_ctx["h"])

    def test_add_delete_category(self, admin_ctx):
        name = f"TEST_Cat_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/admin/categories", headers=admin_ctx["h"], json={"name": name, "icon": "briefcase"})
        assert r.status_code == 200
        TestAdmin.cat_id = r.json()["id"]
        # verify appears
        cats = requests.get(f"{API}/categories").json()
        assert any(c["name"] == name for c in cats)
        d = requests.delete(f"{API}/admin/categories/{TestAdmin.cat_id}", headers=admin_ctx["h"])
        assert d.status_code == 200


# ---------- RBAC ----------
class TestRBAC:
    def test_seeker_cannot_admin_stats(self, seeker_ctx):
        assert requests.get(f"{API}/admin/stats", headers=seeker_ctx["h"]).status_code == 403

    def test_employer_cannot_admin_stats(self, employer_ctx):
        assert requests.get(f"{API}/admin/stats", headers=employer_ctx["h"]).status_code == 403

    def test_seeker_cannot_employer_jobs(self, seeker_ctx):
        assert requests.get(f"{API}/employer/jobs", headers=seeker_ctx["h"]).status_code == 403

    def test_employer_cannot_apply(self, employer_ctx):
        jobs = requests.get(f"{API}/jobs").json()
        r = requests.post(f"{API}/applications", headers=employer_ctx["h"],
                          json={"job_id": jobs[0]["id"], "cover_letter": "x"})
        assert r.status_code == 403
