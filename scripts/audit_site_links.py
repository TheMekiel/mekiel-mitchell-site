from pathlib import Path
from bs4 import BeautifulSoup
import json

html_path = Path(__file__).resolve().parents[1] / "client" / "index.html"
soup = BeautifulSoup(html_path.read_text(encoding="utf-8"), "html.parser")

page_ids = {node.get("id", "")[5:] for node in soup.select('[id^="page-"]')}
route_links = []
placeholders = []
external_links = []

for anchor in soup.find_all("a"):
    href = anchor.get("href", "")
    label = " ".join(anchor.get_text(" ", strip=True).split())
    page = anchor.get("data-page")
    onclick = anchor.get("onclick", "")
    if page:
        route_links.append({"label": label, "page": page, "valid": page in page_ids})
    elif href == "#" and not onclick:
        placeholders.append({"label": label, "html": str(anchor)[:240]})
    elif href.startswith(("http://", "https://", "mailto:")):
        external_links.append({"label": label, "href": href})

forms = [
    {
        "purpose": form.get("data-kit-purpose", ""),
        "action": form.get("action", ""),
        "method": form.get("method", "get").lower(),
    }
    for form in soup.find_all("form")
]

audio_sources = [source.get("src", "") for source in soup.select("audio source")]

result = {
    "page_ids": sorted(page_ids),
    "route_link_count": len(route_links),
    "invalid_route_links": [link for link in route_links if not link["valid"]],
    "placeholder_links": placeholders,
    "external_links": external_links,
    "kit_forms": [form for form in forms if "app.kit.com/forms/" in form["action"]],
    "non_kit_forms": [form for form in forms if "app.kit.com/forms/" not in form["action"]],
    "audio_sources": audio_sources,
}

print(json.dumps(result, indent=2))
