use std::{
    path::{Path, PathBuf},
    sync::OnceLock,
    time::Duration,
};
use tokio::io::AsyncWriteExt;

pub fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .user_agent("WallpaperApp/0.2")
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(90))
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()
            .expect("HTTP client initialization failed")
    })
}

pub fn validate_url(url: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(url).map_err(|e| e.to_string())?;
    if !["https", "http"].contains(&url.scheme())
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Only HTTP(S) URLs without credentials are allowed".into());
    }
    Ok(url)
}

pub async fn download(
    url: &str,
    directory: &Path,
    max_bytes: u64,
) -> Result<(tempfile::NamedTempFile, &'static str), String> {
    let url = validate_url(url)?;
    let mut response = client()
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    if response.content_length().is_some_and(|n| n > max_bytes) {
        return Err("Image exceeds size limit".into());
    }
    tokio::fs::create_dir_all(directory)
        .await
        .map_err(|e| e.to_string())?;
    let temp = tempfile::Builder::new()
        .suffix(".part")
        .tempfile_in(directory)
        .map_err(|e| e.to_string())?;
    let mut file = tokio::fs::File::from_std(temp.reopen().map_err(|e| e.to_string())?);
    let mut total = 0u64;
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        total += chunk.len() as u64;
        if total > max_bytes {
            return Err("Image exceeds size limit".into());
        }
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
    }
    file.sync_all().await.map_err(|e| e.to_string())?;
    drop(file);
    let path: PathBuf = temp.path().into();
    let ext = tokio::task::spawn_blocking(move || validate_image(&path))
        .await
        .map_err(|e| e.to_string())??;
    Ok((temp, ext))
}

pub fn validate_image(path: &Path) -> Result<&'static str, String> {
    let mut reader = image::ImageReader::open(path)
        .map_err(|e| e.to_string())?
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    let ext = match reader.format() {
        Some(image::ImageFormat::Jpeg) => "jpg",
        Some(image::ImageFormat::Png) => "png",
        Some(image::ImageFormat::WebP) => "webp",
        Some(image::ImageFormat::Bmp) => "bmp",
        _ => return Err("Unsupported image format".into()),
    };
    let mut limits = image::Limits::default();
    limits.max_alloc = Some(256 * 1024 * 1024);
    limits.max_image_width = Some(16384);
    limits.max_image_height = Some(16384);
    reader.limits(limits);
    reader.decode().map_err(|e| e.to_string())?;
    Ok(ext)
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use tokio::io::AsyncReadExt;

    pub async fn image_server(body: Vec<u8>, status: &str) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let status = status.to_string();
        tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = [0u8; 4096];
            let _ = socket.read(&mut request).await;
            let headers = format!(
                "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                body.len()
            );
            let _ = socket.write_all(headers.as_bytes()).await;
            let _ = socket.write_all(&body).await;
        });
        format!("http://{address}/image")
    }

    #[tokio::test]
    async fn streamed_download_checks_status_size_and_actual_format() {
        let dir = tempfile::tempdir().unwrap();
        let mut png = std::io::Cursor::new(Vec::new());
        image::DynamicImage::new_rgb8(2, 2)
            .write_to(&mut png, image::ImageFormat::Png)
            .unwrap();
        let url = image_server(png.into_inner(), "200 OK").await;
        let (temp, ext) = download(&url, dir.path(), 1024).await.unwrap();
        assert_eq!(ext, "png");
        assert!(temp.path().exists());
        drop(temp);
        let url = image_server(vec![0; 2048], "200 OK").await;
        assert!(download(&url, dir.path(), 1024).await.is_err());
        let url = image_server(b"error page".to_vec(), "404 Not Found").await;
        assert!(download(&url, dir.path(), 1024).await.is_err());
        let url = image_server(b"error page".to_vec(), "200 OK").await;
        assert!(download(&url, dir.path(), 1024).await.is_err());
        assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 0);
    }
    #[test]
    fn rejects_non_network_urls_and_error_pages() {
        for url in [
            "file:///C:/test",
            "javascript:alert(1)",
            "https://user:password@example.com/",
        ] {
            assert!(validate_url(url).is_err());
        }
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("wrong.jpg");
        std::fs::write(&path, b"<html>error</html>").unwrap();
        assert!(validate_image(&path).is_err());
        image::RgbImage::new(1, 1)
            .save_with_format(&path, image::ImageFormat::Png)
            .unwrap();
        assert_eq!(validate_image(&path).unwrap(), "png");
    }
}
