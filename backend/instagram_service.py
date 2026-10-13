import logging
import re
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_USER_AGENT = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
_HEADERS = {"User-Agent": _USER_AGENT, "Accept-Language": "en-US,en;q=0.8"}
_INSTAGRAM_HOSTS = {"instagram.com", "www.instagram.com", "m.instagram.com"}
_KINDS = {"p": "p", "reel": "reel", "reels": "reel", "tv": "tv"}
_MIN_CAPTION_LEN = 40
_MAX_IMAGE_BYTES = 5 * 1024 * 1024


@dataclass
class InstagramPost:
    canonical_url: str
    caption: str
    author: str | None
    image_url: str | None
    is_video: bool


def is_instagram_url(url: str) -> bool:
    try:
        host = urlparse(url).hostname
    except ValueError:
        return False
    return (host or "").lower() in _INSTAGRAM_HOSTS


def normalize_instagram_url(url: str) -> str | None:
    """Return https://www.instagram.com/{p|reel|tv}/{shortcode}/ or None if not a post/reel."""
    if not is_instagram_url(url):
        return None
    segments = [s for s in urlparse(url).path.split("/") if s]
    for i, seg in enumerate(segments[:-1]):
        kind = _KINDS.get(seg.lower())
        # only allow an optional leading username segment before the kind
        if kind and i <= 1:
            shortcode = segments[i + 1]
            if re.fullmatch(r"[A-Za-z0-9_-]+", shortcode):
                return f"https://www.instagram.com/{kind}/{shortcode}/"
    return None


def _extract_caption(description: str) -> str:
    """Description format: '<prefix>: "<caption>".' ; fall back to the whole description."""
    start = description.find(': "')
    end = description.rfind('"')
    if start != -1 and end > start + 2:
        return description[start + 3 : end].strip()
    return description.strip()


def parse_instagram_html(html: str, canonical_url: str) -> InstagramPost | None:
    """Pure parsing of the preview page; None if the caption is missing or too short."""
    soup = BeautifulSoup(html, "html.parser")
    desc_tag = soup.find("meta", attrs={"name": "description"})
    if not desc_tag or not desc_tag.get("content"):
        return None
    caption = _extract_caption(desc_tag["content"])
    if len(caption) < _MIN_CAPTION_LEN:
        return None

    image_tag = soup.find("meta", attrs={"property": "og:image"})
    image_url = image_tag.get("content") if image_tag else None

    author = None
    title_tag = soup.find("meta", attrs={"name": "twitter:title"})
    if title_tag and title_tag.get("content"):
        m = re.search(r"\(@([\w.]+)\)", title_tag["content"])
        if m:
            author = m.group(1)

    is_video = "/reel/" in canonical_url or "/tv/" in canonical_url
    return InstagramPost(
        canonical_url=canonical_url,
        caption=caption,
        author=author,
        image_url=image_url or None,
        is_video=is_video,
    )


async def fetch_instagram_post(url: str) -> InstagramPost | None:
    canonical = normalize_instagram_url(url)
    if not canonical:
        return None
    try:
        async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True, timeout=20.0) as client:
            r = await client.get(canonical)
        if r.status_code != 200:
            logger.warning("Instagram ha risposto %s per %s", r.status_code, canonical)
            return None
        return parse_instagram_html(r.text, canonical)
    except Exception:
        logger.exception("Errore nel leggere il post Instagram %s", canonical)
        return None


async def download_image(url: str) -> tuple[bytes, str] | None:
    try:
        async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True, timeout=20.0) as client:
            r = await client.get(url)
        if r.status_code != 200:
            return None
        content_type = r.headers.get("content-type", "").split(";")[0].strip().lower()
        if not content_type.startswith("image/"):
            return None
        if len(r.content) > _MAX_IMAGE_BYTES:
            return None
        return r.content, content_type
    except Exception:
        logger.exception("Errore nel scaricare l'immagine %s", url)
        return None
