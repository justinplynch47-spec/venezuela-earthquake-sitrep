#!/usr/bin/env python3
"""Refresh narrowly supported live fields using cross-source validation.

The script never clears a previously verified value when a source is unavailable.
New casualty figures require a government-source extraction; corroboration is
reported separately. Other operational fields require an authoritative source.
"""
from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "sitrep.json"
PUBLIC_DATA = ROOT / "public" / "sitrep.json"
VERSION = ROOT / "public" / "version.json"
REPORT = ROOT / "public" / "validation-status.json"

SOURCES = {
    "government": "https://www.telesurtv.net/venezuela-sube-fallecidos-doblete-sismico/",
    "ap": "https://apnews.com/article/venezuela-earthquakes-survivors-rescue-rodriguez-c1e96329a6194b56f19c75c168b9595d",
    "un": "https://www.ungeneva.org/en/news-media/news/2026/06/120122/venezuela-quake-search-goes-survivors-amid-impossible-odds",
    "southcom": "https://www.southcom.mil/News/PressReleases/Article/4529441/release-update-on-southcom-support-to-venezuela-earthquake-relief-june-29/",
    "usgs": "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2026-06-24&minlatitude=8&maxlatitude=13&minlongitude=-72&maxlongitude=-62&minmagnitude=4&orderby=time",
}


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Sentinel-SITREP-Validator/1.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read().decode("utf-8", errors="replace")


def number(value: str) -> int:
    return int(re.sub(r"[^0-9]", "", value))


def first(pattern: str, text: str) -> int | None:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    return number(match.group(1)) if match else None


def metric(data: dict, label: str) -> dict:
    return next(item for item in data["metrics"] if item["label"] == label)


def delta(data: dict, label: str) -> dict:
    return next(item for item in data["deltas"] if item["label"] == label)


def main() -> int:
    data = json.loads(DATA.read_text())
    fetched: dict[str, str] = {}
    errors: dict[str, str] = {}
    for name, url in SOURCES.items():
        try:
            fetched[name] = fetch(url)
        except Exception as exc:  # Keep last verified data on any fetch failure.
            errors[name] = f"{type(exc).__name__}: {exc}"

    gov = fetched.get("government", "")
    deaths = first(r"(?:ascendi[oó]\s+a|reporta\s+)([0-9][0-9.,]*)[^0-9]{0,35}(?:fallecid|muert)", gov)
    if deaths is None:
        deaths = first(r"([0-9][0-9.,]*)\s+(?:personas\s+)?(?:fallecid|muert)", gov)
    injured = first(r"([0-9][0-9.,]*)\s+(?:personas\s+)?herid", gov)
    affected = first(r"([0-9][0-9.,]*)\s+damnific", gov)
    buildings = first(r"total\s+de\s+([0-9][0-9.,]*)\s+edificios\s+afectados", gov)
    collapsed = first(r"([0-9][0-9.,]*)\s+sufrieron\s+un\s+colapso\s+total", gov)

    ap = fetched.get("ap", "")
    ap_corroborates = bool(deaths and (
        f"{deaths:,}" in ap or
        (deaths >= 1700 and re.search(r"more\s+than\s+1,?700", ap, re.IGNORECASE))
    ))

    previous_deaths = metric(data, "REPORTED DEATHS")["value"]
    previous_injured = metric(data, "REPORTED INJURIES")["value"]
    promoted: list[str] = []
    if deaths and deaths >= 100:
        metric(data, "REPORTED DEATHS").update(value=f"{deaths:,}", note="Latest government update; independently corroborated at threshold by AP." if ap_corroborates else "Latest government update; independent reconciliation pending.", confidence="Moderate-high" if ap_corroborates else "Moderate")
        d = delta(data, "Deaths")
        d.update({"from": previous_deaths, "to": f"{deaths:,}", "note": f"+{max(0, deaths - number(previous_deaths)):,}"})
        promoted.append("reported deaths")
    if injured and injured >= 100:
        metric(data, "REPORTED INJURIES").update(value=f"{injured:,}", note="Latest government update; independent reconciliation pending.", confidence="Moderate")
        d = delta(data, "Injured")
        d.update({"from": previous_injured, "to": f"{injured:,}", "note": f"+{max(0, injured - number(previous_injured)):,}"})
        promoted.append("reported injuries")
    if affected and affected >= 100:
        metric(data, "AFFECTED / DISPLACED").update(value=f"{affected:,}")
        promoted.append("affected population")
    if buildings and buildings >= 100:
        d = delta(data, "Buildings affected")
        d.update(to=f"{buildings:,}", note=f"{collapsed:,} total collapse" if collapsed else d["note"])

    un = fetched.get("un", "")
    rescuers = first(r"more\s+than\s+([0-9][0-9,.]*)\s+rescuers", un)
    dogs = first(r"([0-9][0-9,.]*)\s+search\s+dogs", un)
    if rescuers:
        metric(data, "INTL. RESCUE").update(value=f">{rescuers:,}", note=f"27 countries{f' and {dogs:,} search dogs' if dogs else ''} reported by OCHA.", confidence="High")
        promoted.append("international rescue capacity")

    southcom = fetched.get("southcom", "").lower()
    port_confirmed = "port of la guaira is now operational" in southcom
    if port_confirmed:
        delta(data, "Port access").update(to="operational", status="improved", note="La Guaira · SOUTHCOM")
        promoted.append("port access")

    usgs_summary = None
    if "usgs" in fetched:
        try:
            geo = json.loads(fetched["usgs"])
            feature = geo.get("features", [None])[0]
            if feature:
                props = feature["properties"]
                usgs_summary = {"magnitude": props.get("mag"), "place": props.get("place"), "timeUtc": datetime.fromtimestamp(props["time"] / 1000, tz=timezone.utc).isoformat()}
        except Exception as exc:
            errors["usgs_parse"] = f"{type(exc).__name__}: {exc}"

    now_utc = datetime.now(timezone.utc)
    now_et = now_utc.astimezone(ZoneInfo("America/New_York"))
    data["meta"]["cutoff"] = now_et.strftime("%d %b %Y · %H:%M ET").upper()
    data["meta"]["nextUpdate"] = "AUTOMATIC CHECKS · ≤30 MIN"
    status = "validated" if deaths and ap_corroborates and rescuers and port_confirmed else "partial"
    report = {
        "checkedAtUtc": now_utc.isoformat(),
        "status": status,
        "promotedFields": promoted,
        "sourceErrors": errors,
        "rules": "Primary-source extraction plus independent corroboration where available; failed checks preserve last verified values.",
        "latestUsgsM4Plus": usgs_summary,
    }
    rendered = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    DATA.write_text(rendered)
    PUBLIC_DATA.write_text(rendered)
    VERSION.write_text(json.dumps({"version": now_utc.isoformat(), "validation": status}) + "\n")
    REPORT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
