#!/usr/bin/env python3
"""Публикация сайта на Netlify напрямую из этой папки.

Резервный путь публикации: собирает dist/ через build.sh и заливает его через API,
минуя сборку на стороне Netlify. Обычно не нужен — сайт публикуется сам при пуше
в main. Пригодится, если автодеплой не сработал.

Запуск:
    bash с api_credentials=["custom-cred:api.netlify.com"]
    python3 deploy.py
"""
import hashlib
import json
import os
import subprocess
import sys
import time

SITE = "5160c45c-80d9-4a82-9a3d-068717d5fdc2"
API = "https://api.netlify.com/api/v1"
ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "dist")
SKIP_NAMES = {".DS_Store"}
SKIP_DIRS = set()


def curl(args, timeout=600):
    """Запрос через curl — он уже настроен на прокси песочницы."""
    p = subprocess.run(["curl", "-sS", "--max-time", str(timeout), *args],
                       capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"curl упал: {p.stderr.strip()[:300]}")
    return p.stdout


def req(method, url, body=None):
    args = ["-X", method, url, "-H", "Accept: application/json"]
    if body is not None:
        tmp = "/tmp/_netlify_body.json"
        with open(tmp, "w") as f:
            json.dump(body, f)
        args += ["-H", "Content-Type: application/json", "--data-binary", f"@{tmp}"]
    out = curl(args)
    return json.loads(out) if out.strip() else {}


def put_file(deploy_id, path, local):
    curl(["-X", "PUT", f"{API}/deploys/{deploy_id}/files{path}",
          "-H", "Content-Type: application/octet-stream",
          "--data-binary", f"@{local}"])


def sha1(p):
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def collect():
    out = {}
    for base, dirs, files in os.walk(DIST):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if fn in SKIP_NAMES:
                continue
            full = os.path.join(base, fn)
            rel = "/" + os.path.relpath(full, DIST).replace(os.sep, "/")
            out[rel] = (full, sha1(full))
    return out


def git(*a):
    return subprocess.check_output(["git", "-C", ROOT, *a], text=True).strip()


def main():
    subprocess.run(["bash", os.path.join(ROOT, "build.sh")], cwd=ROOT, check=True,
                   stdout=subprocess.DEVNULL)
    files = collect()
    print(f"файлов к публикации: {len(files)}")

    title = "manual deploy"
    try:
        title = f"{git('rev-parse', '--short', 'HEAD')} {git('log', '-1', '--pretty=%s')}"[:120]
        if git("status", "--porcelain"):
            print("ВНИМАНИЕ: есть незакоммиченные изменения — закоммить и запушь их")
    except Exception:
        pass

    dep = req("POST", f"{API}/sites/{SITE}/deploys",
              {"files": {p: s for p, (_, s) in files.items()},
               "draft": False, "title": title})
    did = dep.get("id")
    if not did:
        print("не удалось создать деплой:", json.dumps(dep, ensure_ascii=False)[:300])
        return 1
    need = dep.get("required", [])
    print(f"деплой {did} создан | догрузить файлов: {len(need)}")

    by_sha = {}
    for p, (full, s) in files.items():
        by_sha.setdefault(s, []).append((p, full))
    for s in need:
        for p, full in by_sha.get(s, []):
            put_file(did, p, full)
            print(f"   ↑ {p}")

    for _ in range(60):
        d = req("GET", f"{API}/deploys/{did}")
        st = d.get("state")
        if st in ("ready", "error"):
            print(f"состояние: {st} {d.get('error_message') or ''}")
            print(f"адрес: {d.get('ssl_url') or d.get('deploy_ssl_url')}")
            return 0 if st == "ready" else 1
        time.sleep(5)
    print("не дождались готовности деплоя")
    return 1


if __name__ == "__main__":
    sys.exit(main())
