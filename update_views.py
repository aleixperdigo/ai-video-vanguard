"""Refresh YouTube view counts in videos.json (views + meta.viewsUpdated).

Run: python3 update_views.py   (needs yt-dlp; uses ~/video-automatico/.venv-ytdlp by default)
"""
import datetime
import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor

YTDLP = os.environ.get("YTDLP", os.path.expanduser("~/video-automatico/.venv-ytdlp/bin/yt-dlp"))
PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos.json")


def views(yt_id):
    r = subprocess.run([YTDLP, "--skip-download", "--print", "%(view_count)s", f"https://youtu.be/{yt_id}"],
                       capture_output=True, text=True)
    out = r.stdout.strip()
    return int(out) if out.isdigit() else None


def main():
    data = json.load(open(PATH))
    vids = data["videos"]
    with ThreadPoolExecutor(8) as ex:
        counts = list(ex.map(lambda v: views(v["youtubeId"]), vids))
    for v, n in zip(vids, counts):
        if n is not None:  # private/removed videos keep their last known count
            v["views"] = n
        else:
            print("no count:", v["title"])
    data.setdefault("meta", {})["viewsUpdated"] = datetime.date.today().isoformat()
    json.dump(data, open(PATH, "w"), ensure_ascii=False, indent=2)
    print(f"{sum(n is not None for n in counts)}/{len(vids)} updated")


if __name__ == "__main__":
    main()
