#!/usr/bin/env python3
# Make a push to main live on jsDelivr now, not after its 12-hour cache (run by .github/workflows/release.yml).
#   python3 tools/cdn-release.py <commit> <file list>
# jsDelivr learns that @main moved to the new commit a little after the push. A purge sent before that re-caches the OLD
# file, and a second purge of the same file is throttled for ~15 minutes. So: wait until jsDelivr serves the new commit
# for one file, purge everything, then compare what the CDN serves with git and purge again (after any throttle) until
# every file matches or the time runs out. Files the time runs out on still go live when the cache expires.
import hashlib, json, os, subprocess, sys, time, urllib.parse, urllib.request

REPO = os.environ.get('GITHUB_REPOSITORY', 'coderadam2000/huntington-rebuilt')
SHA, LIST = sys.argv[1], sys.argv[2]
LIMIT = time.time() + float(os.environ.get('CDN_MINUTES', '30')) * 60
files = [l.strip() for l in open(LIST) if l.strip()]
if not files: print('nothing to purge'); sys.exit(0)
q = urllib.parse.quote

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'hg-release', 'Cache-Control': 'no-cache'})
            with urllib.request.urlopen(req, timeout=40) as r: return r.read()
        except Exception as e:
            if i == tries - 1: return None
            time.sleep(3)

def want(f): return hashlib.sha1(subprocess.run(['git', 'show', f'{SHA}:{f}'], capture_output=True).stdout).hexdigest()
def live(f):
    b = get(f'https://cdn.jsdelivr.net/gh/{REPO}@main/{q(f)}')
    return hashlib.sha1(b).hexdigest() if b is not None else None

throttle = {}          # file -> time when it can be purged again
def purge(f):
    if throttle.get(f, 0) > time.time(): return False
    raw = get(f'https://purge.jsdelivr.net/gh/{REPO}@main/{q(f)}')
    try: info = list(json.loads(raw)['paths'].values())[0]
    except Exception: print(f'  purge failed: {f}'); return False
    if info.get('throttled'): throttle[f] = time.time() + info.get('throttlingReset', 900) + 5; print(f'  throttled {info.get("throttlingReset")}s: {f}'); return False
    throttle[f] = time.time() + 60          # give one purge a minute to land before trying the same file again
    return True

# 1. wait until jsDelivr knows about the new commit (the commit-pinned copy of the first file is always right)
probe = files[0]
print(f'waiting for jsDelivr to see {SHA[:7]} ...')
get(f'https://cdn.jsdelivr.net/gh/{REPO}@{SHA}/{q(probe)}')      # warms jsDelivr's copy of the commit
time.sleep(int(os.environ.get('CDN_SETTLE', '75')))
# 2. purge everything, then 3. check and purge again until it all matches
for f in files: purge(f); time.sleep(0.5)
pending = {f: want(f) for f in files}
while pending and time.time() < LIMIT:
    time.sleep(45)
    for f in list(pending):
        if live(f) == pending[f]: print(f'live     {f}'); pending.pop(f)
        else: purge(f)
for f in pending: print(f'::warning::still the old copy of {f} after the time limit: it goes live when jsDelivr\'s cache runs out (up to 12 h)')
print(f'{len(files) - len(pending)} of {len(files)} files live')
