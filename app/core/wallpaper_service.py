from __future__ import annotations

import json
from pathlib import Path

import requests
from PySide6.QtCore import QSize
from PySide6.QtGui import QImageReader

from app.config.settings import AppConfig
from app.downloader.unsplash_client import UnsplashClient, UnsplashAuthError, UnsplashRateLimitError, UnsplashError
from app.wallpaper.win_wallpaper import WinWallpaperSetter
from app.utils.paths import get_app_root, resolve_app_path


class WallpaperService:
    def __init__(self, config: AppConfig, logger) -> None:
        self.config = config.normalized()
        self.logger = logger
        self._metadata_cache: dict[str, dict] = {}
        self._deleted_ids_cache: set[str] | None = None
        self.downloader = UnsplashClient(
            access_key=self.config.unsplash_access_key,
            query=self.config.query,
            orientation=self.config.orientation,
            content_filter=self.config.content_filter,
        )
        self.wallpaper_setter = WinWallpaperSetter()
        self.last_downloaded_path: Path | None = None

    def refresh_dependencies(self) -> None:
        self.config = self.config.normalized()
        self.downloader.refresh(
            access_key=self.config.unsplash_access_key,
            query=self.config.query,
            orientation=self.config.orientation,
            content_filter=self.config.content_filter,
        )

    def _images_in_dir(self, directory: Path) -> list[Path]:
        if not directory.is_dir():
            return []
        image_suffixes = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
        images = [path for path in directory.iterdir() if path.is_file() and path.suffix.lower() in image_suffixes]
        return sorted(images, key=lambda p: p.stat().st_mtime, reverse=True)

    def _deleted_ids_path(self) -> Path:
        return resolve_app_path('config/deleted_unsplash_ids.json', base_dir=get_app_root())

    def _normalized_cache_stems(self) -> set[str]:
        stems: set[str] = set()
        cache_dir = resolve_app_path(self.config.cache_dir, base_dir=get_app_root())
        if not cache_dir.is_dir():
            return stems
        for path in self._images_in_dir(cache_dir):
            stems.add(path.stem.strip())
        return stems

    def _load_deleted_ids(self) -> set[str]:
        if self._deleted_ids_cache is not None:
            return self._deleted_ids_cache
        path = self._deleted_ids_path()
        if not path.is_file():
            self._deleted_ids_cache = set()
            return self._deleted_ids_cache
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            self._deleted_ids_cache = set()
            return self._deleted_ids_cache
        ids: set[str] = set()
        if isinstance(data, list):
            ids = {str(item).strip() for item in data if str(item).strip()}
        elif isinstance(data, dict):
            raw_ids = data.get('ids') or data.get('photo_ids') or data.get('deleted_ids') or []
            if isinstance(raw_ids, list):
                ids = {str(item).strip() for item in raw_ids if str(item).strip()}
        self._deleted_ids_cache = ids
        return self._deleted_ids_cache

    def _save_deleted_ids(self) -> None:
        path = self._deleted_ids_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(sorted(self._load_deleted_ids()), ensure_ascii=False, indent=2),
            encoding='utf-8',
        )

    def is_blacklisted_photo_id(self, photo_id: str | None) -> bool:
        photo_id = str(photo_id or '').strip()
        if not photo_id:
            return False
        return photo_id in self._load_deleted_ids()

    def blacklist_photo_id(self, photo_id: str | None) -> None:
        photo_id = str(photo_id or '').strip()
        if not photo_id:
            return
        deleted_ids = self._load_deleted_ids()
        if photo_id in deleted_ids:
            return
        deleted_ids.add(photo_id)
        self._save_deleted_ids()

    def _non_blacklisted_photos(self, photos: list[dict]) -> list[dict]:
        allowed: list[dict] = []
        seen_ids: set[str] = set()
        cached_stems = self._normalized_cache_stems()
        blacklisted_ids = self._load_deleted_ids()
        for photo in photos:
            photo_id = str(photo.get('id') or '').strip()
            if not photo_id or photo_id in seen_ids:
                continue
            seen_ids.add(photo_id)
            if photo_id in blacklisted_ids or photo_id in cached_stems:
                self.logger.info('Skipping blacklisted Unsplash photo: %s', photo_id)
                continue
            download_url = str(photo.get('download_url') or '').strip()
            if not download_url:
                continue
            allowed.append(photo)
        return allowed

    def _fetch_allowed_photos(self, target_count: int, attempts: int = 3) -> list[dict]:
        target_count = max(1, int(target_count))
        request_count = min(30, max(10, target_count * 2))
        collected: list[dict] = []
        collected_ids: set[str] = set()
        cached_stems = self._normalized_cache_stems()
        blacklisted_ids = self._load_deleted_ids()
        for _ in range(max(1, attempts)):
            if len(collected) >= target_count:
                break
            photos = self._non_blacklisted_photos(self.downloader.fetch_random_photos(request_count))
            for photo in photos:
                photo_id = str(photo.get('id') or '').strip()
                if (
                    not photo_id
                    or photo_id in collected_ids
                    or photo_id in blacklisted_ids
                    or photo_id in cached_stems
                ):
                    continue
                collected_ids.add(photo_id)
                collected.append(photo)
                if len(collected) >= target_count:
                    break
            request_count = 30
        return collected

    def list_cached_wallpapers(self) -> list[Path]:
        cache_dir = resolve_app_path(self.config.cache_dir, base_dir=get_app_root())
        images = self._images_in_dir(cache_dir)
        blacklisted = self._load_deleted_ids()
        if not blacklisted:
            return images
        filtered: list[Path] = []
        for path in images:
            candidate_ids = {path.stem}
            metadata = self.get_cached_wallpaper_metadata(path)
            image_id = str(metadata.get('image_id') or '').strip()
            if image_id:
                candidate_ids.add(image_id)
            if candidate_ids & blacklisted:
                continue
            filtered.append(path)
        return filtered

    def get_cached_wallpaper_metadata(self, image_path: str | Path) -> dict:
        path = Path(image_path)
        cache_key = str(path.resolve())
        cached = self._metadata_cache.get(cache_key)
        if cached is not None:
            return cached
        sidecar = path.with_suffix('.json')
        if not sidecar.is_file():
            return {}
        try:
            data = json.loads(sidecar.read_text(encoding='utf-8'))
            if isinstance(data, dict):
                self._metadata_cache[cache_key] = data
                return data
            return {}
        except Exception:
            return {}

    def _write_metadata_sidecar(self, image_path: Path, metadata: dict) -> None:
        sidecar = image_path.with_suffix('.json')
        sidecar.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
        self._metadata_cache[str(image_path.resolve())] = metadata

    def _thumbnail_dir(self) -> Path:
        return resolve_app_path(self.config.cache_dir, base_dir=get_app_root()) / '.thumbnails'

    def get_thumbnail_path(self, image_path: str | Path) -> Path:
        path = Path(image_path)
        return self._thumbnail_dir() / f'{path.stem}.thumb.jpg'

    def ensure_thumbnail(self, image_path: str | Path, size: tuple[int, int] = (200, 132)) -> Path:
        source = Path(image_path)
        thumb_path = self.get_thumbnail_path(source)
        if thumb_path.is_file():
            try:
                if thumb_path.stat().st_mtime >= source.stat().st_mtime:
                    return thumb_path
            except OSError:
                pass
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        reader = QImageReader(str(source))
        reader.setAutoTransform(True)
        reader.setScaledSize(QSize(size[0], size[1]))
        image = reader.read()
        if image.isNull():
            raise RuntimeError(f'Failed to build thumbnail for {source}')
        if not image.save(str(thumb_path), 'JPG', 88):
            raise RuntimeError(f'Failed to save thumbnail for {source}')
        return thumb_path

    def list_gallery_items(self, build_thumbnails: bool = False) -> list[dict]:
        items: list[dict] = []
        for path in self.list_cached_wallpapers():
            try:
                thumb = self.ensure_thumbnail(path) if build_thumbnails else self.get_thumbnail_path(path)
            except Exception as exc:
                self.logger.warning('Thumbnail generation failed for %s: %s', path, exc)
                thumb = self.get_thumbnail_path(path)
            items.append({
                'path': path,
                'thumbnail': thumb,
                'meta': self.get_cached_wallpaper_metadata(path),
            })
        return items

    def delete_cached_wallpaper(self, image_path: str | Path) -> dict:
        path = Path(image_path).expanduser()
        metadata = self.get_cached_wallpaper_metadata(path)
        image_id = str(metadata.get('image_id') or path.stem).strip()
        if image_id:
            self.blacklist_photo_id(image_id)
        extra_ids = {image_id, path.stem}
        removed: list[Path] = []
        for target in (path, path.with_suffix('.json'), self.get_thumbnail_path(path)):
            try:
                if target.is_file():
                    target.unlink()
                    removed.append(target)
            except FileNotFoundError:
                continue
            except OSError as exc:
                self.logger.warning('Failed to remove cached file %s: %s', target, exc)
        self._metadata_cache.pop(str(path.resolve()), None)
        for extra_id in extra_ids:
            extra_id = str(extra_id or '').strip()
            if extra_id:
                self.blacklist_photo_id(extra_id)
        return {
            'image_id': image_id,
            'removed': removed,
        }

    def set_wallpaper_from_path(self, image_path: str | Path) -> Path:
        path = Path(image_path).expanduser()
        if not path.is_file():
            raise FileNotFoundError(path)
        self.wallpaper_setter.set_wallpaper(path, self.config.wallpaper_style)
        self.last_downloaded_path = path
        self.logger.info('Wallpaper set from local path: %s', path)
        return path

    def fetch_and_cache_batch(self, batch_count: int | None = None, reporter=None) -> list[Path]:
        self.refresh_dependencies()
        count = batch_count or self.config.batch_count
        self.logger.info('Starting batch fetch from Unsplash, count=%s.', count)
        if reporter is not None:
            reporter(f'正在向 Unsplash 请求候选图（{count} 张）...')
        photos = self._fetch_allowed_photos(count)
        if reporter is not None:
            reporter(f'Unsplash 返回 {len(photos)} 张候选图，开始下载并缓存...')
        cached_paths: list[Path] = []
        total_photos = len(photos)
        for index, photo in enumerate(photos, start=1):
            try:
                photo_name = str(photo.get('formal_name') or photo.get('title') or photo.get('id') or '未命名').strip()
                if reporter is not None:
                    reporter(f'正在下载第 {index}/{total_photos} 张：{photo_name}')
                try:
                    self.downloader.register_download(photo.get('download_location', ''))
                except Exception as track_exc:
                    self.logger.warning('Unsplash download tracking failed, continuing anyway: %s', track_exc)
                result = self.downloader.download_image(
                    image_url=photo['download_url'],
                    target_dir=resolve_app_path(self.config.cache_dir, base_dir=get_app_root()),
                    image_id=photo['id'],
                    metadata=photo,
                )
                self._write_metadata_sidecar(result.file_path, {
                    'image_id': result.image_id,
                    'source_url': result.source_url,
                    'photographer_name': photo.get('photographer_name', ''),
                    'photographer_profile': photo.get('photographer_profile', ''),
                    'unsplash_page': photo.get('unsplash_page', ''),
                    'width': photo.get('width'),
                    'height': photo.get('height'),
                    'formal_name': photo.get('formal_name', ''),
                    'title': photo.get('title', ''),
                    'description': photo.get('description', ''),
                    'alt_description': photo.get('alt_description', ''),
                })
                try:
                    self.ensure_thumbnail(result.file_path)
                except Exception as thumb_exc:
                    self.logger.warning('Thumbnail prebuild failed for %s: %s', result.file_path, thumb_exc)
                cached_paths.append(result.file_path)
                self.logger.info('Cached wallpaper: %s', result.file_path)
                if reporter is not None:
                    reporter(f'已缓存 {len(cached_paths)}/{count} 张本地图片')
            except Exception as exc:
                self.logger.exception('Failed to cache one Unsplash image: %s', exc)
                if reporter is not None:
                    reporter(f'第 {index}/{total_photos} 张下载失败，继续下一张...')
        if len(cached_paths) < count:
            self.logger.info('Requested %s images, cached %s after filtering blacklisted results.', count, len(cached_paths))
        if reporter is not None:
            reporter(f'本次刷新完成，成功缓存 {len(cached_paths)} 张本地图片。')
        return cached_paths

    def apply_first_cached_wallpaper(self) -> Path:
        images = self.list_cached_wallpapers()
        if not images:
            raise RuntimeError('No cached wallpapers are available to apply.')
        return self.set_wallpaper_from_path(images[0])

    def update_wallpaper(self) -> Path:
        self.refresh_dependencies()
        self.logger.info('Starting wallpaper update from Unsplash.')
        try:
            photos = self._fetch_allowed_photos(1)
            if not photos:
                raise RuntimeError('No non-blacklisted Unsplash photo could be fetched.')
            photo = photos[0]
            try:
                self.downloader.register_download(photo.get('download_location', ''))
            except Exception as track_exc:
                self.logger.warning('Unsplash download tracking failed, continuing anyway: %s', track_exc)
            result = self.downloader.download_image(
                image_url=photo['download_url'],
                target_dir=resolve_app_path(self.config.cache_dir, base_dir=get_app_root()),
                image_id=photo['id'],
                metadata=photo,
            )
            self.wallpaper_setter.set_wallpaper(result.file_path, self.config.wallpaper_style)
            self.last_downloaded_path = result.file_path
            self.logger.info(
                'Wallpaper updated: %s | photographer=%s | page=%s',
                result.file_path,
                photo.get('photographer_name', ''),
                photo.get('unsplash_page', ''),
            )
            return result.file_path
        except (UnsplashAuthError, UnsplashRateLimitError, UnsplashError, requests.RequestException, OSError, RuntimeError) as exc:
            self.logger.exception('Unsplash update failed; keeping current wallpaper unchanged: %s', exc)
            raise RuntimeError(f'Unsplash update failed; wallpaper was not changed: {exc}') from exc

