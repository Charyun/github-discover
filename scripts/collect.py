#!/usr/bin/env python3
"""GitHub project collector — pushes new projects to OpenHub pending queue."""

import hashlib
import hmac
import json
import math
import os
import time
from datetime import datetime, timedelta, timezone

import requests

GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
WEBHOOK_URL = os.environ["COLLECT_WEBHOOK_URL"]
WEBHOOK_SECRET = os.environ["COLLECT_WEBHOOK_SECRET"]

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

SIX_MONTHS_AGO = (datetime.now(timezone.utc) - timedelta(days=180)).strftime("%Y-%m-%d")


def compute_auto_score(repo: dict) -> int:
    stars = repo.get("stargazers_count", 0)
    star_score = min(40, math.log10(max(stars, 1)) * 13)

    pushed = repo.get("pushed_at", "")
    days_since = (datetime.now(timezone.utc) - datetime.fromisoformat(pushed.replace("Z", "+00:00"))).days
    recency_score = max(0, 30 - days_since // 6)

    has_docker = 30 if any(
        t in (repo.get("topics") or []) for t in ["docker", "docker-compose", "containers"]
    ) else 0

    has_zh = 10 if repo.get("language") in ["Chinese", None] else 0

    return int(star_score + recency_score + has_docker + has_zh)


def search_github(keyword: str, min_stars: int, page: int = 1) -> list:
    params = {
        "q": f"{keyword} stars:>={min_stars} pushed:>{SIX_MONTHS_AGO}",
        "sort": "stars",
        "order": "desc",
        "per_page": 30,
        "page": page,
    }
    resp = requests.get("https://api.github.com/search/repositories", headers=HEADERS, params=params, timeout=15)
    if resp.status_code == 422:
        return []
    resp.raise_for_status()
    time.sleep(1)
    return resp.json().get("items", [])


def fetch_trending() -> list:
    since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    params = {
        "q": f"stars:>=100 created:>{since}",
        "sort": "stars",
        "order": "desc",
        "per_page": 30,
    }
    resp = requests.get("https://api.github.com/search/repositories", headers=HEADERS, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json().get("items", [])


def sign_body(body: str) -> str:
    return hmac.new(WEBHOOK_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()


def push_to_webhook(items: list) -> None:
    body = json.dumps({"items": items})
    sig = sign_body(body)
    resp = requests.post(
        WEBHOOK_URL,
        data=body,
        headers={"Content-Type": "application/json", "x-webhook-signature": sig},
        timeout=30,
    )
    resp.raise_for_status()
    print(f"Pushed {len(items)} items → {resp.json()}")


def push_stats_update(repos: list) -> None:
    updates = [
        {
            "github_full_name": r["full_name"],
            "stars": r["stargazers_count"],
            "updated_at": r["pushed_at"][:10],
        }
        for r in repos
    ]
    stats_url = WEBHOOK_URL.replace("/collect", "/sync-stats")
    body = json.dumps({"updates": updates})
    sig = sign_body(body)
    resp = requests.post(
        stats_url,
        data=body,
        headers={"Content-Type": "application/json", "x-webhook-signature": sig},
        timeout=30,
    )
    resp.raise_for_status()
    print(f"Stats updated for {len(updates)} projects")


def main():
    with open(os.path.join(os.path.dirname(__file__), "collect_config.json")) as f:
        config = json.load(f)

    seen_names: set = set()
    pending_items: list = []

    for industry_id, cfg in config["industries"].items():
        for keyword in cfg["keywords"]:
            repos = search_github(keyword, cfg["min_stars"])
            for repo in repos:
                name = repo["full_name"]
                if name in seen_names:
                    continue
                seen_names.add(name)
                pending_items.append({
                    "github_full_name": name,
                    "raw_data": json.dumps(repo),
                    "auto_score": compute_auto_score(repo),
                    "collected_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "status": "pending",
                })

    for repo in fetch_trending():
        name = repo["full_name"]
        if name not in seen_names:
            seen_names.add(name)
            pending_items.append({
                "github_full_name": name,
                "raw_data": json.dumps(repo),
                "auto_score": compute_auto_score(repo),
                "collected_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": "pending",
            })

    print(f"Collected {len(pending_items)} new candidate projects")

    for i in range(0, len(pending_items), 50):
        push_to_webhook(pending_items[i:i + 50])


if __name__ == "__main__":
    main()
