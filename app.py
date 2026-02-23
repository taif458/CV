import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, flash, redirect, render_template, request, session, url_for


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "lost_found.db"

app = Flask(__name__)
app.secret_key = os.environ.get("APP_SECRET_KEY", "change-this-secret-key")
app.config["ADMIN_PASSWORD"] = os.environ.get("LOST_FOUND_ADMIN_PASSWORD", "airport-admin")


def db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                tracking_id TEXT PRIMARY KEY,
                passenger_name TEXT NOT NULL,
                item_name TEXT NOT NULL,
                description TEXT NOT NULL,
                found_status INTEGER NOT NULL DEFAULT 0,
                claim_status INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )


def generate_tracking_id():
    stamp = datetime.utcnow().strftime("%y%m%d")
    token = uuid.uuid4().hex[:6].upper()
    return f"LF-{stamp}-{token}"


def fetch_metrics():
    with db_connection() as conn:
        total = conn.execute("SELECT COUNT(*) AS count FROM reports").fetchone()["count"]
        found = conn.execute("SELECT COUNT(*) AS count FROM reports WHERE found_status = 1").fetchone()["count"]
        claimed = conn.execute("SELECT COUNT(*) AS count FROM reports WHERE claim_status = 1").fetchone()["count"]
    open_cases = max(total - claimed, 0)
    return {
        "total": total,
        "found": found,
        "open_cases": open_cases,
        "claimed": claimed,
    }


def fetch_recent_reports(limit=8):
    with db_connection() as conn:
        rows = conn.execute(
            """
            SELECT tracking_id, passenger_name, item_name, found_status, claim_status, created_at
            FROM reports
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return rows


def fetch_all_reports():
    with db_connection() as conn:
        rows = conn.execute(
            """
            SELECT tracking_id, passenger_name, item_name, description, found_status, claim_status, created_at
            FROM reports
            ORDER BY created_at DESC
            """
        ).fetchall()
    return rows


def get_pipeline_step(report):
    if report["claim_status"]:
        return 3
    if report["found_status"]:
        return 2
    return 1


@app.context_processor
def inject_helpers():
    return {"pipeline_step": get_pipeline_step}


@app.route("/", methods=["GET", "POST"])
def home():
    init_db()
    search_result = None
    latest_tracking_id = None

    if request.method == "POST":
        action = request.form.get("action", "")

        if action == "report":
            passenger_name = request.form.get("passenger_name", "").strip()
            item_name = request.form.get("item_name", "").strip()
            description = request.form.get("description", "").strip()

            if not passenger_name or not item_name or not description:
                flash("Please complete all report fields.", "error")
            else:
                tracking_id = generate_tracking_id()
                created_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                with db_connection() as conn:
                    conn.execute(
                        """
                        INSERT INTO reports (
                            tracking_id, passenger_name, item_name, description, found_status, claim_status, created_at
                        )
                        VALUES (?, ?, ?, ?, 0, 0, ?)
                        """,
                        (tracking_id, passenger_name, item_name, description, created_at),
                    )
                latest_tracking_id = tracking_id
                flash("Report submitted successfully.", "success")

        elif action == "track":
            tracking_id = request.form.get("tracking_id", "").strip().upper()
            if not tracking_id:
                flash("Enter a Tracking ID to search.", "error")
            else:
                with db_connection() as conn:
                    search_result = conn.execute(
                        """
                        SELECT tracking_id, passenger_name, item_name, description, found_status, claim_status, created_at
                        FROM reports
                        WHERE tracking_id = ?
                        """,
                        (tracking_id,),
                    ).fetchone()
                if search_result is None:
                    flash("Tracking ID not found. Please verify and try again.", "error")

    metrics = fetch_metrics()
    recent_reports = fetch_recent_reports()

    return render_template(
        "index.html",
        search_result=search_result,
        latest_tracking_id=latest_tracking_id,
        metrics=metrics,
        recent_reports=recent_reports,
    )


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    init_db()
    if request.method == "POST":
        password = request.form.get("password", "")
        if password == app.config["ADMIN_PASSWORD"]:
            session["admin_authenticated"] = True
            return redirect(url_for("admin_dashboard"))
        flash("Invalid admin password.", "error")
    return render_template("admin_login.html")


@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_authenticated", None)
    return redirect(url_for("home"))


@app.route("/admin")
def admin_dashboard():
    init_db()
    if not session.get("admin_authenticated"):
        return redirect(url_for("admin_login"))

    reports = fetch_all_reports()
    metrics = fetch_metrics()
    return render_template("admin_dashboard.html", reports=reports, metrics=metrics)


@app.route("/admin/update/<tracking_id>", methods=["POST"])
def admin_update(tracking_id):
    if not session.get("admin_authenticated"):
        return redirect(url_for("admin_login"))

    found_status = 1 if request.form.get("found_status") == "1" else 0
    claim_status = 1 if request.form.get("claim_status") == "1" else 0

    if found_status == 0:
        claim_status = 0

    with db_connection() as conn:
        conn.execute(
            """
            UPDATE reports
            SET found_status = ?, claim_status = ?
            WHERE tracking_id = ?
            """,
            (found_status, claim_status, tracking_id),
        )

    flash(f"Updated workflow for {tracking_id}.", "success")
    return redirect(url_for("admin_dashboard"))


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
