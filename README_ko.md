<div align="center">

# Wallpaper 4K

**Tauri v2 + Rust 기반의 초경량 멀티 소스 데스크톱 배경화면 관리 프로그램**

Windows 11 WinUI 3 Fluent Design과 Material You 감각적 미학의 결합

[简体中文](README.md) • [English](README_en.md) • [日本語](README_ja.md) • [한국어](README_ko.md)

<br/>

[![GitHub Release](https://img.shields.io/github/v/release/Mokssa/wallpaper_app?color=8b5cf6&style=flat-square)](https://github.com/Mokssa/wallpaper_app/releases)
[![Rust](https://img.shields.io/badge/Rust-2021-ea580c?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24c8db?style=flat-square&logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=flat-square&logo=windows)](https://www.microsoft.com/windows)

</div>

---

## 📸 스크린샷 (Screenshots)

<div align="center">

### 배경화면 탐색 (Explore)
다양한 온라인 소스에서 4K 고화질 이미지를 탐색하고, 태그 및 키워드로 스마트하게 검색합니다.
<img src="docs/screenshots/explore.png" alt="배경화면 탐색" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### 로컬 배경화면 및 일괄 관리 (Local Gallery & Batch Mode)
원클릭 배경화면 적용, 단일 삭제 확인 팝업, 다중 선택 체크박스 및 안전한 일괄 삭제를 지원합니다.
<img src="docs/screenshots/gallery_batch.png" alt="로컬 배경화면 및 일괄 관리" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### 탐색 기록 갤러리 (Browsing History)
클릭하여 열람한 배경화면이 로컬에 자동 기록됩니다. 언제든지 열람 내역을 확인하고, 배경화면으로 재설정하거나 확인 팝업을 통해 기록을 안전하게 초기화할 수 있습니다.
<img src="docs/screenshots/history.png" alt="탐색 기록 갤러리" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### 테마 및 서체 설정 (Material You & Typography)
12가지 다이내믹 테마, 커스텀 컬러 팔레트, 순수 블랙 AMOLED 모드, 4가지 엄선된 폰트 프리셋을 제공합니다.
<img src="docs/screenshots/settings.png" alt="설정 및 개인화" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### 독립된 정보 페이지 (About & Update Engine)
소프트웨어 버전 및 오픈소스 정보를 독립 메뉴로 표시하며, GitHub 제한을 우회하는 업데이트 검사기를 탑재했습니다.
<img src="docs/screenshots/about.png" alt="프로그램 정보 및 업데이트" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

</div>

---

## ✨ 주요 기능

- **멀티 온라인 소스 통합** — Bing 일일 배경화면, Pexels 사진, Unsplash 예술, Wallhaven 애니메이션/CG 커뮤니티 지원.
- **순수 무한 스크롤 경험** — 번거로운 페이지네이션 버튼을 없애고, 부드러운 폭포수 무한 스크롤로 고해상도 뷰포트에 맞추어 배경화면을 자연스럽게 자동 로딩합니다.
- **독립된 탐색 기록 갤러리** — 이미지를 클릭할 때마다 로컬 히스토리에 자동 보존되며, 전용 내비게이션 탭에서 언제든 검토, 배경화면 설정 및 안전한 초기화가 가능합니다.
- **로컬 갤러리 및 안전한 일괄 삭제** — 단일 삭제 및 다중 선택 일괄 삭제 모두 Material 3 모달 2차 확인 창을 제공하여 실수로 인한 데이터 삭제를 방지합니다.
- **4개 국어 다국어 지원 (i18n)** — 한국어 (ko-KR), 영어 (en-US), 일본어 (ja-JP), 중국어 간체 (zh-CN) 기본 내장. 사용자 시스템 언어에 자동 적응하며, 불일치 시 기본 언어(중국어 간체)로 안전하게 대체됩니다.
- **Material Design 3 + WinUI 3 미학** —
  - **12가지 테마 팔레트**: 스카이블루, 민트그린, 사쿠라핑크, 선셋골드, 에메랄드, 크림슨플레임, 석양앰버, 사이버네온, 글래시어블루, 말차그린, 모카브라운, 딥스페이스.
  - **커스텀 컬러 팔레트**: 원하는 HEX 색상을 선택하면 전체 UI 토큰이 지능적으로 자동 파생됩니다.
  - **AMOLED 순수 블랙 모드**: 눈의 피로를 줄이고 전력을 절약하는 트루 블랙 모드.
  - **4종 고화질 폰트 프리셋**: HarmonyOS 라운드, 소프트 유원, 모던 Segoe UI, 지오메트릭 MiSans.
- **제한 없는 듀얼 트랙 업데이트 검사기** —
  - 기본적으로 GitHub Release REST API를 호출하여 상세 변경 내역을 수신합니다.
  - 비인증 IP 속도 제한(403 Forbidden)이 발생하면 HTTP 302 리디렉션 파싱 엔진으로 즉시 자동 전환되어 어떤 상황에서도 최신 버전을 확인할 수 있습니다.
- **초경량 및 최소 메모리 사용량** — Rust 2021과 Windows Win32 API (`SystemParametersInfoW`) 기반으로 수십 MB 수준의 최소 메모리로 동작합니다.
- **자동 회전 및 시스템 트레이** — 부팅 시 자동 시작, 창 닫기 시 트레이 최소화, 트레이 아이콘 더블 클릭 복원, 일정 주기마다 자동 배경화면 교체.

---

## 🛠️ 기술 아키텍처

| 모듈 | 기술 | 설명 |
|---|---|---|
| **데스크톱 프레임워크** | [Tauri v2](https://v2.tauri.app/) | Rust 기반의 초경량 고성능 데스크톱 프레임워크 |
| **백엔드 코어** | Rust 2021 + Tokio + Reqwest | 고동시성 비동기 I/O 및 안전한 네트워크 처리 |
| **배경화면 엔진** | Win32 `SystemParametersInfoW` + 레지스트리 | 6가지 채우기 스타일을 바탕화면에 직접 적용 |
| **프론트엔드 UI** | 순수 HTML5 / CSS3 / ES2022 | 무거운 외부 프레임워크 없는 순수 고속 렌더링 및 M3 리플 엔진 |
| **윈도우 비주얼** | window-vibrancy | Windows 11 Mica / Acrylic 배경 투명 블러 효과 |

---

## 🚀 시작하기

### 요구 사항
- Windows 10 (빌드 19041 이상) 또는 Windows 11
- [Rust](https://rustup.rs) 툴체인 및 Visual Studio C++ 빌드 도구 (MSVC)
- Node.js 18 이상

### 로컬 빌드 방법

```powershell
# 1. 저장소 복제
git clone https://github.com/Mokssa/wallpaper_app.git
cd wallpaper_app

# 2. 의존성 설치
npm install

# 3. 전체 테스트 실행 (Rust 유닛 테스트 + 285개 이상의 UI 테스트)
cargo test
npm test

# 4. 개발 모드 실행
cargo tauri dev

# 5. 배포용 빌드
cargo tauri build
```

빌드된 실행 파일은 `target/release/wallpaper_app.exe` 경로에 생성됩니다.

---

## ⚙️ 설정 파일 안내

프로그램을 처음 실행하면 `config/settings.json` 파일이 자동 생성됩니다:

```json
{
  "cache_dir": "cache/wallpapers",
  "wallpaper_style": "fill",
  "auto_update_enabled": false,
  "auto_update_interval_minutes": 60,
  "random_source": "all",
  "theme_color": "indigo",
  "custom_theme_color": null,
  "amoled_mode": false,
  "font_family": "misans",
  "language": "ko-KR",
  "load_mode": "pagination",
  "card_ratio": "uniform",
  "unsplash_access_key": "",
  "pexels_api_key": ""
}
```

> **🔒 개인정보 보호**: 모든 API 키와 설정 정보는 사용자의 로컬 컴퓨터에만 안전하게 저장됩니다. 외부 서버로의 개인 데이터 전송이나 원격 수집(Telemetry)이 전혀 없습니다.

---

## 📄 라이선스

이 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용 및 배포할 수 있습니다.
