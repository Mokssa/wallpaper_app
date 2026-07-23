import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config.settings import DEFAULT_QUERY, parse_query_terms


@dataclass
class DownloadResult:
    image_id: str
    file_path: Path
    source_url: str
    photographer_name: str
    photographer_profile: str
    unsplash_page: str
    width: int | None = None
    height: int | None = None
    formal_name: str = ""
    title: str = ""
    description: str = ""
    alt_description: str = ""


class UnsplashError(RuntimeError):
    pass


class UnsplashAuthError(UnsplashError):
    pass


class UnsplashRateLimitError(UnsplashError):
    pass


class UnsplashClient:
    API_BASE = "https://api.unsplash.com"

    def __init__(
        self,
        access_key: str,
        query: str = "wallpaper",
        orientation: str = "landscape",
        content_filter: str = "low",
        timeout_seconds: int = 20,
    ) -> None:
        self.access_key = access_key.strip()
        self.query = query
        self.orientation = orientation
        self.content_filter = content_filter
        self.timeout_seconds = timeout_seconds
        self.session = self._build_session()

    def _build_session(self) -> requests.Session:
        session = requests.Session()
        retry = Retry(
            total=3,
            connect=3,
            read=3,
            status=3,
            backoff_factor=0.8,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset({"GET", "HEAD"}),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        session.headers.update({
            "Authorization": f"Client-ID {self.access_key}",
            "Accept-Version": "v1",
            "User-Agent": "WallpaperApp/1.0",
        })
        return session

    def refresh(self, **kwargs) -> None:
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.access_key = self.access_key.strip()
        self.session = self._build_session()

    def _check_access_key(self) -> None:
        if not self.access_key:
            raise UnsplashAuthError(
                "Missing Unsplash access key. Create an app in the Unsplash developer portal and paste the Access Key into settings."
            )

    def _request_json(self, path: str, params: Optional[dict] = None) -> dict:
        self._check_access_key()
        url = f"{self.API_BASE}{path}"
        response = self.session.get(url, params=params, timeout=self.timeout_seconds)
        if response.status_code in (401, 403):
            raise UnsplashAuthError(self._format_http_error(response))
        if response.status_code == 429:
            raise UnsplashRateLimitError(self._format_http_error(response))
        if response.status_code >= 400:
            raise UnsplashError(self._format_http_error(response))
        try:
            return response.json()
        except json.JSONDecodeError as exc:
            raise UnsplashError("Unsplash returned invalid JSON.") from exc

    def _format_http_error(self, response: requests.Response) -> str:
        try:
            payload = response.json()
            message = payload.get("errors") or payload.get("error") or payload
        except Exception:
            message = response.text[:300]
        return f"Unsplash request failed with HTTP {response.status_code}: {message}"

    def _build_download_url(self, raw_url: str) -> str:
        parsed = urlparse(raw_url)
        query = dict(parse_qsl(parsed.query))
        query.pop("w", None)
        query.pop("h", None)
        query.pop("fit", None)
        query.pop("crop", None)
        query.pop("q", None)
        query.pop("fm", None)
        query.pop("auto", None)
        return urlunparse(parsed._replace(query=urlencode(query)))

    def _query_terms(self) -> list[str]:
        terms = parse_query_terms(self.query, default=DEFAULT_QUERY)
        return terms or [DEFAULT_QUERY]

    def _choose_query_term(self, preferred: str | None = None) -> str:
        terms = self._query_terms()
        if preferred:
            preferred_text = str(preferred).strip()
            if preferred_text:
                normalized = preferred_text.casefold()
                for term in terms:
                    if term.casefold() == normalized:
                        return term
                return preferred_text
        return random.choice(terms)

    def _request_random_photo(self, query_term: str) -> dict:
        params = {
            "query": query_term,
            "orientation": self.orientation,
            "content_filter": self.content_filter,
        }
        return self._request_json("/photos/random", params=params)

    def _request_random_photos(self, query_term: str, count: int) -> dict | list[dict]:
        params = {
            "query": query_term,
            "orientation": self.orientation,
            "content_filter": self.content_filter,
            "count": count,
        }
        return self._request_json("/photos/random", params=params)

    def fetch_random_photo(self) -> dict:
        data = self._request_random_photos(self._choose_query_term(), 1)
        if isinstance(data, list):
            data = data[0] if data else {}
        urls = data.get("urls") or {}
        links = data.get("links") or {}
        user = data.get("user") or {}
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        alt_description = (data.get("alt_description") or "").strip()
        formal_name = title or description or alt_description or data.get("slug") or data.get("id", "unsplash_wallpaper")
        return {
            "id": data.get("id", "unsplash_wallpaper"),
            "download_url": self._build_download_url(urls.get("raw") or urls.get("full") or urls.get("regular")),
            "download_location": links.get("download_location", ""),
            "unsplash_page": links.get("html", ""),
            "photographer_name": user.get("name", "Unknown"),
            "photographer_profile": user.get("links", {}).get("html", ""),
            "width": data.get("width"),
            "height": data.get("height"),
            "formal_name": formal_name,
            "title": title,
            "description": description,
            "alt_description": alt_description,
        }

    def fetch_random_photos(self, count: int) -> list[dict]:
        count = max(1, min(int(count), 30))
        photos: list[dict] = []
        query_terms = self._query_terms()
        shuffled_terms = query_terms[:]
        random.shuffle(shuffled_terms)
        base_count = count // len(query_terms)
        extra_count = count % len(query_terms)
        allocations = {term: base_count for term in query_terms}
        for term in shuffled_terms[:extra_count]:
            allocations[term] += 1
        for query_term, request_count in allocations.items():
            if request_count <= 0:
                continue
            data = self._request_random_photos(query_term, request_count)
            if isinstance(data, dict):
                data = [data]
            for entry in data:
                urls = entry.get("urls") or {}
                links = entry.get("links") or {}
                user = entry.get("user") or {}
                title = (entry.get("title") or "").strip()
                description = (entry.get("description") or "").strip()
                alt_description = (entry.get("alt_description") or "").strip()
                formal_name = title or description or alt_description or entry.get("slug") or entry.get("id", "unsplash_wallpaper")
                photos.append({
                    "id": entry.get("id", "unsplash_wallpaper"),
                    "download_url": self._build_download_url(urls.get("raw") or urls.get("full") or urls.get("regular")),
                    "download_location": links.get("download_location", ""),
                    "unsplash_page": links.get("html", ""),
                    "photographer_name": user.get("name", "Unknown"),
                    "photographer_profile": user.get("links", {}).get("html", ""),
                    "width": entry.get("width"),
                    "height": entry.get("height"),
                    "formal_name": formal_name,
                    "title": title,
                    "description": description,
                    "alt_description": alt_description,
                })
        return photos

    def register_download(self, download_location: str) -> None:
        self._check_access_key()
        if not download_location:
            raise UnsplashError("Unsplash photo did not include a download_location.")
        response = self.session.get(download_location, timeout=self.timeout_seconds)
        if response.status_code in (401, 403):
            raise UnsplashAuthError(self._format_http_error(response))
        if response.status_code == 429:
            raise UnsplashRateLimitError(self._format_http_error(response))
        if response.status_code >= 400:
            raise UnsplashError(self._format_http_error(response))

    def download_image(self, image_url: str, target_dir: Path, image_id: Optional[str] = None, metadata: Optional[dict] = None) -> DownloadResult:
        target_dir.mkdir(parents=True, exist_ok=True)
        response = self.session.get(image_url, stream=True, timeout=self.timeout_seconds)
        if response.status_code in (401, 403):
            raise UnsplashAuthError(self._format_http_error(response))
        if response.status_code == 429:
            raise UnsplashRateLimitError(self._format_http_error(response))
        if response.status_code >= 400:
            raise UnsplashError(self._format_http_error(response))
        name = image_id or "unsplash_wallpaper"
        file_path = target_dir / f"{name}.jpg"
        with file_path.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 64):
                if chunk:
                    handle.write(chunk)
        metadata = metadata or {}
        result = DownloadResult(
            image_id=name,
            file_path=file_path,
            source_url=image_url,
            photographer_name=metadata.get("photographer_name", ""),
            photographer_profile=metadata.get("photographer_profile", ""),
            unsplash_page=metadata.get("unsplash_page", ""),
            width=metadata.get("width"),
            height=metadata.get("height"),
            formal_name=metadata.get("formal_name", ""),
            title=metadata.get("title", ""),
            description=metadata.get("description", ""),
            alt_description=metadata.get("alt_description", ""),
        )
        sidecar = file_path.with_suffix(".json")
        sidecar.write_text(json.dumps({
            "image_id": result.image_id,
            "source_url": result.source_url,
            "photographer_name": result.photographer_name,
            "photographer_profile": result.photographer_profile,
            "unsplash_page": result.unsplash_page,
            "width": result.width,
            "height": result.height,
            "formal_name": result.formal_name,
            "title": result.title,
            "description": result.description,
            "alt_description": result.alt_description,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        return result
