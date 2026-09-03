/**
 * Wallpaper App - Internationalization (i18n) Engine
 * Supported Locales:
 *  - zh-CN: 简体中文 (Default Fallback)
 *  - en-US: English
 *  - ja-JP: 日本語
 *  - ko-KR: 한국어
 */

const I18N_LOCALES = {
  'zh-CN': {
    // Navigation
    nav_gallery: '本地壁纸',
    nav_explore: '发现壁纸',
    nav_history: '浏览记录',
    nav_settings: '设置',
    nav_about: '关于',
    btn_random: '随机换一张',

    // History
    history_title: '浏览记录',
    history_subtitle: '查看您近期点击浏览过的精彩壁纸',
    history_count: '{count} 张',
    history_clear_btn: '清空记录',
    history_empty_title: '暂无浏览记录',
    history_empty_desc: '在「发现壁纸」或「我的壁纸」中点击任意图片，将自动收录至此。',
    confirm_clear_history_title: '确认清空浏览记录？',
    confirm_clear_history_msg: '确定要清空所有已保存的浏览历史吗？此操作不可撤销。',
    toast_history_cleared: '浏览记录已清空',
    history_delete_item: '从记录中移除',
    toast_history_item_deleted: '已从浏览记录移除',

    // Gallery
    gallery_title: '我的壁纸',
    gallery_subtitle: '已缓存至本地的精选壁纸库',
    gallery_batch_btn: '批量管理',
    gallery_batch_exit: '退出管理',
    gallery_refresh: '刷新',
    gallery_select_all: '全选',
    gallery_deselect_all: '取消全选',
    gallery_selected_count: '已选择 {count} 项',
    gallery_batch_delete: '批量删除',
    gallery_empty_title: '暂无本地壁纸',
    gallery_empty_desc: '前往「发现壁纸」探索海量 4K 超清大图，一键下载并应用为桌面壁纸',
    gallery_goto_explore: '立即去发现',
    action_set_wallpaper: '设为桌面壁纸',
    action_delete_wallpaper: '删除此壁纸',

    // Explore
    explore_title: '发现壁纸',
    explore_search_placeholder: '搜索关键词 (如: 赛博朋克, 自然, 极简)...',
    explore_search_btn: '搜索',
    explore_clear_search: '清空',
    source_pexels: 'Pexels 摄影',
    source_bing: 'Bing 每日壁纸',
    source_unsplash: 'Unsplash 艺术',
    source_wallhaven: 'Wallhaven 动漫/CG',
    tag_all: '全部',
    tag_nature: '自然风光',
    tag_anime: '二次元',
    tag_cyberpunk: '赛博朋克',
    tag_minimal: '极简主义',
    tag_space: '深空宇宙',
    tag_city: '都市建筑',
    explore_load_more: '加载更多壁纸',
    explore_loading: '正在获取精彩壁纸...',
    explore_no_results: '未找到相关壁纸，请尝试其他关键词',
    explore_page_indicator: '第 {current} / {total} 页',
    explore_prev_page: '上一页',
    explore_next_page: '下一页',

    // Settings
    settings_title: '设置',
    settings_general_group: '通用偏好 (Preferences)',
    settings_lang: '界面语言 (Language)',
    settings_lang_desc: '选择软件显示语言，默认自适应系统语言',
    settings_theme_group: '主题配色 (Material You)',
    settings_custom_theme: '自定义取色板',
    settings_custom_theme_desc: '点击调色盘选择任意主色调并自适应全套质感主题',
    settings_amoled: '纯黑 AMOLED 模式',
    settings_font_group: '界面字体风格 (Typography)',
    settings_font_rounded: '鸿蒙舒适圆体',
    settings_font_youyuan: '软萌可爱幼圆',
    settings_font_fluent: '现代极简屏显',
    settings_font_misans: '小米几何质感',
    settings_browse_mode: '浏览模式',
    settings_browse_pagination: '分页加载',
    settings_browse_infinite: '无限滚动',
    settings_card_ratio: '卡片比例',
    settings_card_uniform: '统一比例 (16:10)',
    settings_card_original: '原始比例',
    settings_fill_style: '壁纸填充样式',
    settings_fill_fill: '填充 (Fill)',
    settings_fill_fit: '适应 (Fit)',
    settings_fill_stretch: '拉伸 (Stretch)',
    settings_fill_tile: '平铺 (Tile)',
    settings_fill_center: '居中 (Center)',
    settings_fill_span: '跨屏 (Span)',
    settings_storage_group: '存储与自动化 (Storage & Automation)',
    settings_cache_path: '壁纸存储目录',
    settings_btn_change_path: '更改目录',
    settings_btn_open_folder: '打开文件夹',
    settings_auto_launch: '开机自启并驻留托盘',
    settings_auto_change: '定时自动轮换壁纸',
    settings_auto_interval: '轮换时间间隔',
    settings_random_source: '默认轮换/随机图源',
    settings_source_all: '全部图源 (混合)',
    settings_source_local: '本地图库',
    settings_api_group: '搜索与 API (Search & API)',
    settings_default_query: '默认搜索词',
    settings_default_query_ph: '默认为空...',
    settings_unsplash_key: 'Unsplash Access Key',
    settings_unsplash_key_ph: '填入以启用搜索...',
    settings_pexels_key: 'Pexels API Key',
    settings_pexels_key_desc: '默认内置高可用池，亦可填入专属 Key',
    settings_pexels_key_ph: '内置免填/可选...',

    // About
    about_title: '关于',
    about_app_name: 'Wallpaper 4K 壁纸管理器',
    about_app_desc: '基于 Tauri v2 + Rust 构建的超轻量跨图源桌面壁纸工具，融合 WinUI 3 Fluent Design 与 Material You 质感设计。',
    about_version: '当前版本',
    about_check_update: '检查更新',
    about_checking: '检查中...',
    about_already_latest: '当前已是最新版本 ({version})',
    about_tech_specs: '技术规格 (Tech Specs)',
    about_open_source: '开源生态与直达链接',
    about_repo_link: 'GitHub 源码仓库',
    about_repo_desc: '查看源码、Star 支持或提交 Issue 反馈',
    about_releases_link: '发行版本下载',
    about_releases_desc: '获取便携版压缩包与官方安装程序',
    about_issues_link: '问题与建议反馈',
    about_issues_desc: '提交 Bug 报告或功能改进建议',
    about_license_card: '开源许可协议',
    about_license_desc: '本项目基于 MIT License 开放源码，自由使用与分发。',

    // Confirmation Dialog
    confirm_dialog_title: '操作确认',
    confirm_dialog_cancel: '取消',
    confirm_dialog_ok: '确定',
    confirm_delete_single_title: '确认删除壁纸？',
    confirm_delete_single_msg: '确定要从本地永久删除这张壁纸吗？此操作不可恢复。',
    confirm_delete_batch_title: '确认批量删除壁纸？',
    confirm_delete_batch_msg: '确定要从本地永久删除选中的 {count} 张壁纸吗？此操作不可恢复。',

    // Toasts & Actions
    toast_downloading: '正在下载并应用壁纸...',
    toast_applied_success: '已成功下载并设为桌面壁纸！',
    toast_set_local_success: '已成功设为 Windows 桌面壁纸！',
    toast_delete_success: '已成功删除壁纸',
    toast_batch_delete_success: '已成功批量删除 {count} 张本地壁纸',
    toast_select_at_least_one: '请先选择需要删除的壁纸',
    toast_lang_changed: '界面语言已切换为 简体中文',
    toast_random_picking: '正在随机挑选精美壁纸...',
    toast_random_empty_local: '本地图库暂无壁纸，请前往发现壁纸下载',

    // Update Dialog
    update_dialog_title: '发现新版本',
    update_badge_current: '当前: {version}',
    update_badge_latest: '最新: {version}',
    update_release_notes: '更新日志',
    update_btn_download: '前往下载更新',
    update_btn_dismiss: '稍后再说'
  },

  'en-US': {
    // Navigation
    nav_gallery: 'Gallery',
    nav_explore: 'Explore',
    nav_history: 'History',
    nav_settings: 'Settings',
    nav_about: 'About',
    btn_random: 'Quick Random',

    // History
    history_title: 'Browsing History',
    history_subtitle: 'Wallpapers you recently clicked and viewed',
    history_count: '{count} items',
    history_clear_btn: 'Clear History',
    history_empty_title: 'No Browsing History',
    history_empty_desc: 'Click on any wallpaper in Explore or Gallery to record it here.',
    confirm_clear_history_title: 'Clear Browsing History?',
    confirm_clear_history_msg: 'Are you sure you want to clear all browsing history? This action cannot be undone.',
    toast_history_cleared: 'Browsing history cleared',
    history_delete_item: 'Remove from history',
    toast_history_item_deleted: 'Removed from browsing history',

    // Gallery
    gallery_title: 'My Wallpapers',
    gallery_subtitle: 'Cached 4K wallpapers on your local machine',
    gallery_batch_btn: 'Select',
    gallery_batch_exit: 'Done',
    gallery_refresh: 'Refresh',
    gallery_select_all: 'Select All',
    gallery_deselect_all: 'Deselect All',
    gallery_selected_count: '{count} selected',
    gallery_batch_delete: 'Delete',
    gallery_empty_title: 'No Local Wallpapers',
    gallery_empty_desc: 'Browse millions of stunning 4K photos in Explore tab and download them with a single click.',
    gallery_goto_explore: 'Explore Now',
    action_set_wallpaper: 'Set as Desktop Wallpaper',
    action_delete_wallpaper: 'Delete Wallpaper',

    // Explore
    explore_title: 'Explore Wallpapers',
    explore_search_placeholder: 'Search keywords (e.g. Cyberpunk, Nature, Minimalist)...',
    explore_search_btn: 'Search',
    explore_clear_search: 'Clear',
    source_pexels: 'Pexels Photos',
    source_bing: 'Bing Daily',
    source_unsplash: 'Unsplash Art',
    source_wallhaven: 'Wallhaven Anime/CG',
    tag_all: 'All',
    tag_nature: 'Nature',
    tag_anime: 'Anime',
    tag_cyberpunk: 'Cyberpunk',
    tag_minimal: 'Minimalist',
    tag_space: 'Space',
    tag_city: 'City Architecture',
    explore_load_more: 'Load More Wallpapers',
    explore_loading: 'Fetching stunning wallpapers...',
    explore_no_results: 'No wallpapers found. Try another query.',
    explore_page_indicator: 'Page {current} of {total}',
    explore_prev_page: 'Previous',
    explore_next_page: 'Next',

    // Settings
    settings_title: 'Settings',
    settings_general_group: 'Preferences',
    settings_lang: 'Language',
    settings_lang_desc: 'Choose UI display language, defaults to system locale',
    settings_theme_group: 'Theme Palette (Material You)',
    settings_custom_theme: 'Custom Color Palette',
    settings_custom_theme_desc: 'Pick any primary color to dynamically adapt the entire UI palette',
    settings_amoled: 'Pure Black AMOLED Mode',
    settings_font_group: 'Typography',
    settings_font_rounded: 'HarmonyOS Rounded',
    settings_font_youyuan: 'Cute YouYuan Soft',
    settings_font_fluent: 'Modern Fluent Segoe UI',
    settings_font_misans: 'MiSans Modern Geometric',
    settings_browse_mode: 'Browsing Mode',
    settings_browse_pagination: 'Pagination',
    settings_browse_infinite: 'Infinite Scroll',
    settings_card_ratio: 'Card Aspect Ratio',
    settings_card_uniform: 'Uniform (16:10)',
    settings_card_original: 'Original Ratio',
    settings_fill_style: 'Wallpaper Fill Mode',
    settings_fill_fill: 'Fill',
    settings_fill_fit: 'Fit',
    settings_fill_stretch: 'Stretch',
    settings_fill_tile: 'Tile',
    settings_fill_center: 'Center',
    settings_fill_span: 'Span',
    settings_storage_group: 'Storage & Automation',
    settings_cache_path: 'Wallpaper Storage Directory',
    settings_btn_change_path: 'Change Folder',
    settings_btn_open_folder: 'Open Folder',
    settings_auto_launch: 'Launch on Startup (System Tray)',
    settings_auto_change: 'Auto Wallpaper Rotation',
    settings_auto_interval: 'Rotation Interval',
    settings_random_source: 'Default Rotation / Random Source',
    settings_source_all: 'All Sources (Mixed)',
    settings_source_local: 'Local Gallery',
    settings_api_group: 'Search & API',
    settings_default_query: 'Default Search Query',
    settings_default_query_ph: 'Empty by default...',
    settings_unsplash_key: 'Unsplash Access Key',
    settings_unsplash_key_ph: 'Enter key to enable search...',
    settings_pexels_key: 'Pexels API Key',
    settings_pexels_key_desc: 'Built-in pool enabled, custom key optional',
    settings_pexels_key_ph: 'Optional / Built-in...',

    // About
    about_title: 'About',
    about_app_name: 'Wallpaper 4K Desktop Manager',
    about_app_desc: 'Ultra-lightweight multi-source 4K desktop wallpaper manager built with Tauri v2 and Rust, combining WinUI 3 Fluent Design and Material You.',
    about_version: 'Current Version',
    about_check_update: 'Check for Updates',
    about_checking: 'Checking...',
    about_already_latest: 'App is up to date ({version})',
    about_tech_specs: 'Technical Specifications',
    about_open_source: 'Open Source & Quick Links',
    about_repo_link: 'GitHub Repository',
    about_repo_desc: 'Source code, Star support or submit issues',
    about_releases_link: 'Releases & Downloads',
    about_releases_desc: 'Get portable zip and official setup installers',
    about_issues_link: 'Feedback & Bug Reports',
    about_issues_desc: 'Report issues or suggest new features',
    about_license_card: 'Open Source License',
    about_license_desc: 'Licensed under the MIT Open Source License. Free to use and distribute.',

    // Confirmation Dialog
    confirm_dialog_title: 'Confirmation',
    confirm_dialog_cancel: 'Cancel',
    confirm_dialog_ok: 'Confirm',
    confirm_delete_single_title: 'Delete this wallpaper?',
    confirm_delete_single_msg: 'Are you sure you want to permanently delete this wallpaper from your disk? This action cannot be undone.',
    confirm_delete_batch_title: 'Delete selected wallpapers?',
    confirm_delete_batch_msg: 'Are you sure you want to permanently delete {count} selected wallpapers? This action cannot be undone.',

    // Toasts & Actions
    toast_downloading: 'Downloading and applying wallpaper...',
    toast_applied_success: 'Wallpaper applied to desktop successfully!',
    toast_set_local_success: 'Applied as Windows desktop wallpaper!',
    toast_delete_success: 'Wallpaper deleted successfully',
    toast_batch_delete_success: 'Successfully deleted {count} wallpapers',
    toast_select_at_least_one: 'Please select at least one wallpaper',
    toast_lang_changed: 'Language switched to English',
    toast_random_picking: 'Picking a beautiful wallpaper...',
    toast_random_empty_local: 'No local wallpapers found. Please download from Explore tab.',

    // Update Dialog
    update_dialog_title: 'New Version Available',
    update_badge_current: 'Current: {version}',
    update_badge_latest: 'Latest: {version}',
    update_release_notes: 'Release Notes',
    update_btn_download: 'Download Update',
    update_btn_dismiss: 'Later'
  },

  'ja-JP': {
    // Navigation
    nav_gallery: 'ローカル壁紙',
    nav_explore: '壁紙を探す',
    nav_history: '閲覧履歴',
    nav_settings: '設定',
    nav_about: 'このアプリについて',
    btn_random: 'ランダム切替',

    // History
    history_title: '閲覧履歴',
    history_subtitle: '最近クリックして閲覧した壁紙の履歴',
    history_count: '{count} 件',
    history_clear_btn: '履歴を消去',
    history_empty_title: '閲覧履歴はありません',
    history_empty_desc: '「壁紙を探す」や「マイ壁紙」で画像をクリックすると自動的に記録されます。',
    confirm_clear_history_title: '閲覧履歴を消去しますか？',
    confirm_clear_history_msg: '保存されたすべての閲覧履歴を消去してもよろしいですか？この操作は取り消せません。',
    toast_history_cleared: '閲覧履歴を消去しました',
    history_delete_item: '履歴から削除',
    toast_history_item_deleted: '閲覧履歴から削除しました',

    // Gallery
    gallery_title: 'マイ壁紙',
    gallery_subtitle: 'ローカルに保存された厳選4K壁紙',
    gallery_batch_btn: '一括管理',
    gallery_batch_exit: '完了',
    gallery_refresh: '更新',
    gallery_select_all: 'すべて選択',
    gallery_deselect_all: '選択解除',
    gallery_selected_count: '{count} 件 選択中',
    gallery_batch_delete: '一括削除',
    gallery_empty_title: 'ローカル壁紙がありません',
    gallery_empty_desc: '「壁紙を探す」タブで4K画像を検索し、ワンクリックでダウンロード＆設定しましょう。',
    gallery_goto_explore: '今すぐ探す',
    action_set_wallpaper: '壁紙に設定',
    action_delete_wallpaper: 'この壁纸を削除',

    // Explore
    explore_title: '壁紙を探す',
    explore_search_placeholder: 'キーワード検索 (例: サイバーパンク, 自然, アニメ)...',
    explore_search_btn: '検索',
    explore_clear_search: 'クリア',
    source_pexels: 'Pexels 写真',
    source_bing: 'Bing デイリー',
    source_unsplash: 'Unsplash アート',
    source_wallhaven: 'Wallhaven アニメ/CG',
    tag_all: 'すべて',
    tag_nature: '自然風景',
    tag_anime: 'アニメ',
    tag_cyberpunk: 'サイバーパンク',
    tag_minimal: 'ミニマリズム',
    tag_space: '宇宙・星空',
    tag_city: '都市・建築',
    explore_load_more: 'さらに読み込む',
    explore_loading: '壁紙を読み込み中...',
    explore_no_results: '壁紙が見つかりませんでした。別のキーワードをお試しください。',
    explore_page_indicator: 'ページ {current} / {total}',
    explore_prev_page: '前へ',
    explore_next_page: '次へ',

    // Settings
    settings_title: '設定',
    settings_general_group: '一般設定 (Preferences)',
    settings_lang: '表示言語 (Language)',
    settings_lang_desc: 'UI言語を選択します（システムの言語設定に自動追従）',
    settings_theme_group: 'テーマカラー (Material You)',
    settings_custom_theme: 'カスタムカラーパレット',
    settings_custom_theme_desc: '任意の色を選んでUI全体のテーマカラーを自動生成',
    settings_amoled: 'ピュアブラック AMOLED モード',
    settings_font_group: 'フォントスタイル (Typography)',
    settings_font_rounded: 'HarmonyOS 丸ゴシック',
    settings_font_youyuan: 'ソフト YouYuan 丸文字',
    settings_font_fluent: 'モダン Fluent Segoe UI',
    settings_font_misans: 'MiSans 幾何学モダン',
    settings_browse_mode: '閲覧モード',
    settings_browse_pagination: 'ページ送り',
    settings_browse_infinite: '無限スクロール',
    settings_card_ratio: 'カード比率',
    settings_card_uniform: '均一比率 (16:10)',
    settings_card_original: '元の比率',
    settings_fill_style: '壁紙の配置方法',
    settings_fill_fill: '画面に合わせて伸縮 (Fill)',
    settings_fill_fit: '縦横比を維持 (Fit)',
    settings_fill_stretch: '引き伸ばし (Stretch)',
    settings_fill_tile: '並べて表示 (Tile)',
    settings_fill_center: '中央に配置 (Center)',
    settings_fill_span: '全画面スパン (Span)',
    settings_storage_group: 'ストレージと自動化 (Storage & Automation)',
    settings_cache_path: '壁紙保存先フォルダ',
    settings_btn_change_path: 'フォルダ変更',
    settings_btn_open_folder: 'フォルダを開く',
    settings_auto_launch: 'システム起動時に自動起動（タスクトレイ常駐）',
    settings_auto_change: '壁紙の定期自動ローテーション',
    settings_auto_interval: '切り替え間隔',
    settings_random_source: 'ランダム壁紙の画像ソース',
    settings_source_all: 'すべてのソース (混合)',
    settings_source_local: 'ローカルギャラリー',
    settings_api_group: '検索と API (Search & API)',
    settings_default_query: 'デフォルト検索キーワード',
    settings_default_query_ph: 'デフォルトは空欄...',
    settings_unsplash_key: 'Unsplash Access Key',
    settings_unsplash_key_ph: 'キーを入力して検索を有効化...',
    settings_pexels_key: 'Pexels API Key',
    settings_pexels_key_desc: '組み込みキー有効、個別キーは任意',
    settings_pexels_key_ph: '任意 / 組み込み済み...',

    // About
    about_title: 'このアプリについて',
    about_app_name: 'Wallpaper 4K 壁紙マネージャー',
    about_app_desc: 'Tauri v2 と Rust で構築された超軽量マルチソース4Kデスクトップ壁紙マネージャー。WinUI 3 と Material You を融合。',
    about_version: '現在のバージョン',
    about_check_update: 'アップデートを確認',
    about_checking: '確認中...',
    about_already_latest: '最新バージョンです ({version})',
    about_tech_specs: '技術仕様 (Tech Specs)',
    about_open_source: 'オープンソース情報＆リンク',
    about_repo_link: 'GitHub ソースコード',
    about_repo_desc: 'ソースコードの確認、スター、Issueの投稿',
    about_releases_link: 'リリース履歴＆ダウンロード',
    about_releases_desc: 'ポータブル版zipやインストーラーを入手',
    about_issues_link: 'フィードバック・機能リクエスト',
    about_issues_desc: 'バグ報告や改善要望はこちらから',
    about_license_card: 'オープンソースライセンス',
    about_license_desc: '本ソフトウェアは MIT ライセンスの下で自由に利用可能です。',

    // Confirmation Dialog
    confirm_dialog_title: '確認',
    confirm_dialog_cancel: 'キャンセル',
    confirm_dialog_ok: '確定',
    confirm_delete_single_title: '壁紙を削除しますか？',
    confirm_delete_single_msg: 'この壁紙をローカルディスクから完全に削除しますか？この操作は元に戻せません。',
    confirm_delete_batch_title: '選択した壁紙を一括削除しますか？',
    confirm_delete_batch_msg: '選択した {count} 枚の壁紙を完全に削除しますか？この操作は元に戻せません。',

    // Toasts & Actions
    toast_downloading: '壁紙をダウンロードして設定中...',
    toast_applied_success: 'デスクトップ壁紙に設定しました！',
    toast_set_local_success: 'Windows 壁紙に設定しました！',
    toast_delete_success: '壁紙を削除しました',
    toast_batch_delete_success: '{count} 枚の壁紙を削除しました',
    toast_select_at_least_one: '削除する壁紙を選択してください',
    toast_lang_changed: '表示言語を 日本語 に変更しました',
    toast_random_picking: '壁紙をランダムに選択中...',
    toast_random_empty_local: 'ローカル壁紙がありません。「壁紙を探す」からダウンロードしてください。',

    // Update Dialog
    update_dialog_title: '新しいバージョンが利用可能です',
    update_badge_current: '現在: {version}',
    update_badge_latest: '最新: {version}',
    update_release_notes: 'リリースノート',
    update_btn_download: 'ダウンロードページへ',
    update_btn_dismiss: '後で'
  },

  'ko-KR': {
    // Navigation
    nav_gallery: '로컬 배경화면',
    nav_explore: '배경화면 탐색',
    nav_history: '방문 기록',
    nav_settings: '설정',
    nav_about: '정보',
    btn_random: '랜덤 변경',

    // History
    history_title: '방문 기록',
    history_subtitle: '최근 클릭하여 확인한 배경화면 목록',
    history_count: '{count}개',
    history_clear_btn: '기록 삭제',
    history_empty_title: '방문 기록이 없습니다',
    history_empty_desc: '「배경화면 탐색」이나 「내 배경화면」에서 이미지를 클릭하면 자동으로 기록됩니다.',
    confirm_clear_history_title: '방문 기록을 삭제하시겠습니까?',
    confirm_clear_history_msg: '저장된 모든 방문 기록을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
    toast_history_cleared: '방문 기록이 삭제되었습니다',
    history_delete_item: '기록에서 제거',
    toast_history_item_deleted: '방문 기록에서 제거되었습니다',

    // Gallery
    gallery_title: '내 배경화면',
    gallery_subtitle: '로컬에 캐시된 4K 고화질 배경화면 컬렉션',
    gallery_batch_btn: '일괄 관리',
    gallery_batch_exit: '완료',
    gallery_refresh: '새로고침',
    gallery_select_all: '전체 선택',
    gallery_deselect_all: '선택 해제',
    gallery_selected_count: '{count}개 선택됨',
    gallery_batch_delete: '일괄 삭제',
    gallery_empty_title: '로컬 배경화면이 없습니다',
    gallery_empty_desc: '「배경화면 탐색」에서 멋진 4K 이미지를 찾아 원클릭으로 다운로드 및 설정해 보세요.',
    gallery_goto_explore: '지금 탐색하기',
    action_set_wallpaper: '배경화면으로 설정',
    action_delete_wallpaper: '배경화면 삭제',

    // Explore
    explore_title: '배경화면 탐색',
    explore_search_placeholder: '키워드 검색 (예: 사이버펑크, 자연, 미니멀)...',
    explore_search_btn: '검색',
    explore_clear_search: '지우기',
    source_pexels: 'Pexels 사진',
    source_bing: 'Bing 일일 배경화면',
    source_unsplash: 'Unsplash 아트',
    source_wallhaven: 'Wallhaven 애니/CG',
    tag_all: '전체',
    tag_nature: '자연 풍경',
    tag_anime: '애니메이션',
    tag_cyberpunk: '사이버펑크',
    tag_minimal: '미니멀리즘',
    tag_space: '우주/은하',
    tag_city: '도시/건축',
    explore_load_more: '더 불러오기',
    explore_loading: '배경화면 불러오는 중...',
    explore_no_results: '일치하는 배경화면이 없습니다. 다른 키워드로 검색해 보세요.',
    explore_page_indicator: '페이지 {current} / {total}',
    explore_prev_page: '이전',
    explore_next_page: '다음',

    // Settings
    settings_title: '설정',
    settings_general_group: '일반 환경설정 (Preferences)',
    settings_lang: '인터페이스 언어 (Language)',
    settings_lang_desc: '표시 언어 선택 (시스템 기본 언어 자동 감지)',
    settings_theme_group: '테마 색상 (Material You)',
    settings_custom_theme: '사용자 지정 팔레트',
    settings_custom_theme_desc: '원하는 주 색상을 골라 전체 앱 테마를 자동 적용합니다',
    settings_amoled: '퓨어 블랙 AMOLED 모드',
    settings_font_group: '글꼴 스타일 (Typography)',
    settings_font_rounded: 'HarmonyOS 둥근 폰트',
    settings_font_youyuan: '소프트 YouYuan 귀여운 폰트',
    settings_font_fluent: '모던 Fluent Segoe UI',
    settings_font_misans: 'MiSans 현대적 기하학 폰트',
    settings_browse_mode: '탐색 모드',
    settings_browse_pagination: '페이지 분할',
    settings_browse_infinite: '무한 스크롤',
    settings_card_ratio: '카드 비율',
    settings_card_uniform: '통일 비율 (16:10)',
    settings_card_original: '원본 비율',
    settings_fill_style: '배경화면 맞춤 방식',
    settings_fill_fill: '채우기 (Fill)',
    settings_fill_fit: '맞춤 (Fit)',
    settings_fill_stretch: '늘이기 (Stretch)',
    settings_fill_tile: '바둑판식 (Tile)',
    settings_fill_center: '가운데 (Center)',
    settings_fill_span: '스팬 (Span)',
    settings_storage_group: '저장소 및 자동화 (Storage & Automation)',
    settings_cache_path: '배경화면 저장 폴더',
    settings_btn_change_path: '폴더 변경',
    settings_btn_open_folder: '폴더 열기',
    settings_auto_launch: '부팅 시 자동 시작 (시스템 트레이 상주)',
    settings_auto_change: '배경화면 자동 순환',
    settings_auto_interval: '순환 주기',
    settings_random_source: '기본 순환/랜덤 이미지 소스',
    settings_source_all: '모든 소스 (혼합)',
    settings_source_local: '로컬 보관함',
    settings_api_group: '검색 및 API (Search & API)',
    settings_default_query: '기본 검색어',
    settings_default_query_ph: '기본값 없음...',
    settings_unsplash_key: 'Unsplash Access Key',
    settings_unsplash_key_ph: '키를 입력하여 검색 활성화...',
    settings_pexels_key: 'Pexels API Key',
    settings_pexels_key_desc: '기본 내장 키 사용 중, 개별 키 입력 선택 사항',
    settings_pexels_key_ph: '선택 사항 / 내장 풀 사용...',

    // About
    about_title: '정보',
    about_app_name: 'Wallpaper 4K 배경화면 매니저',
    about_app_desc: 'Tauri v2 및 Rust 기반의 초경량 멀티소스 4K 데스크톱 배경화면 도구. WinUI 3 Fluent Design과 Material You를 결합.',
    about_version: '현재 버전',
    about_check_update: '업데이트 확인',
    about_checking: '확인 중...',
    about_already_latest: '최신 버전입니다 ({version})',
    about_tech_specs: '기술 사양 (Tech Specs)',
    about_open_source: '오픈 소스 및 바로가기 링크',
    about_repo_link: 'GitHub 소스코드 저장소',
    about_repo_desc: '소스코드 확인, Star 후원 또는 이슈 등록',
    about_releases_link: '릴리스 및 다운로드',
    about_releases_desc: '포터블 zip 및 공식 설치 프로그램 다운로드',
    about_issues_link: '의견 및 버그 제보',
    about_issues_desc: '버그 신고 또는 새로운 기능 제안',
    about_license_card: '오픈 소스 라이선스',
    about_license_desc: '본 프로젝트는 MIT License에 따라 자유롭게 사용 및 배포 가능합니다.',

    // Confirmation Dialog
    confirm_dialog_title: '확인',
    confirm_dialog_cancel: '취소',
    confirm_dialog_ok: '확인',
    confirm_delete_single_title: '이 배경화면을 삭제하시겠습니까?',
    confirm_delete_single_msg: '로컬 저장소에서 이 배경화면을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    confirm_delete_batch_title: '선택한 배경화면을 일괄 삭제하시겠습니까?',
    confirm_delete_batch_msg: '선택한 {count}개의 배경화면을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',

    // Toasts & Actions
    toast_downloading: '배경화면 다운로드 및 적용 중...',
    toast_applied_success: '데스크톱 배경화면으로 설정되었습니다!',
    toast_set_local_success: 'Windows 배경화면으로 설정되었습니다!',
    toast_delete_success: '배경화면이 삭제되었습니다',
    toast_batch_delete_success: '{count}개의 배경화면을 일괄 삭제했습니다',
    toast_select_at_least_one: '삭제할 배경화면을 하나 이상 선택하세요',
    toast_lang_changed: '언어가 한국어로 변경되었습니다',
    toast_random_picking: '멋진 배경화면을 고르는 중...',
    toast_random_empty_local: '로컬 배경화면이 없습니다. 「배경화면 탐색」에서 다운로드해 주세요.',

    // Update Dialog
    update_dialog_title: '새로운 버전이 있습니다',
    update_badge_current: '현재: {version}',
    update_badge_latest: '최신: {version}',
    update_release_notes: '업데이트 내역',
    update_btn_download: '업데이트 다운로드',
    update_btn_dismiss: '나중에'
  }
};

let currentLocale = 'zh-CN';

/**
 * Detect system language or fallback to zh-CN if not supported
 */
function resolveSystemLanguage() {
  try {
    const raw = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (raw.startsWith('zh')) return 'zh-CN';
    if (raw.startsWith('en')) return 'en-US';
    if (raw.startsWith('ja')) return 'ja-JP';
    if (raw.startsWith('ko')) return 'ko-KR';
  } catch (e) {}
  return 'zh-CN'; // Default fallback
}

/**
 * Get translated string with parameter interpolation
 */
function t(key, params = {}) {
  const dict = I18N_LOCALES[currentLocale] || I18N_LOCALES['zh-CN'];
  let text = dict[key] || I18N_LOCALES['zh-CN'][key] || key;
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

/**
 * Translate all DOM elements with data-i18n attributes
 */
function applyTranslations() {
  // Inner text or HTML
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  // Placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.setAttribute('placeholder', t(key));
    }
  });

  // Title / Tooltip
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.setAttribute('title', t(key));
    }
  });

  // Aria-label
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) {
      el.setAttribute('aria-label', t(key));
    }
  });
}

/**
 * Set active language, persist to localStorage, and apply to DOM
 */
function setLanguage(lang) {
  if (!I18N_LOCALES[lang]) {
    lang = 'zh-CN';
  }
  currentLocale = lang;
  try {
    localStorage.setItem('wp_language', lang);
  } catch (e) {}

  applyTranslations();

  // Sync language dropdown if present
  const selectLang = document.getElementById('select-config-language');
  if (selectLang && selectLang.value !== lang) {
    selectLang.value = lang;
  }
}

/**
 * Initialize i18n
 */
function initI18n(initialLang = null) {
  let saved = null;
  try {
    saved = localStorage.getItem('wp_language');
  } catch (e) {}

  const activeLang = initialLang || saved || resolveSystemLanguage();
  setLanguage(activeLang);
  return activeLang;
}

// Attach to window object for global availability
if (typeof window !== 'undefined') {
  window.I18N_LOCALES = I18N_LOCALES;
  window.t = t;
  window.setLanguage = setLanguage;
  window.initI18n = initI18n;
  window.resolveSystemLanguage = resolveSystemLanguage;
  window.getCurrentLanguage = () => currentLocale;
}
