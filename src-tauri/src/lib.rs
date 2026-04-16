mod commands;
mod db;
mod models;
pub mod paths;

use db::Database;
use std::time::Duration;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Logging: stdout + webview console in debug, rotating file
            // in $APPDATA/logs in release so crash diagnosis isn't blind.
            let log_builder = if cfg!(debug_assertions) {
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .targets([
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                    ])
            } else {
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Warn)
                    .max_file_size(2 * 1024 * 1024) // 2 MiB per file
                    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                    .targets([tauri_plugin_log::Target::new(
                        tauri_plugin_log::TargetKind::LogDir { file_name: None },
                    )])
            };
            app.handle().plugin(log_builder.build())?;

            // Shared HTTP client: explicit timeouts so a stalled Gemini
            // endpoint can't wedge a batch command forever.
            let http = reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(10))
                .timeout(Duration::from_secs(600))
                .build()?;
            app.manage(http);

            // Initialize database
            let app_data_dir = app.path().app_data_dir()?;
            let db = Database::new(app_data_dir)
                .map_err(|e| format!("Failed to initialize database: {}", e))?;
            app.manage(db);

            // Create required directories
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(app_data_dir.join("uploads")).ok();
            std::fs::create_dir_all(app_data_dir.join("temp")).ok();
            let pictures_dir = app.path().picture_dir()?;
            std::fs::create_dir_all(pictures_dir.join("Nana Studio")).ok();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_jobs,
            commands::get_job,
            commands::create_t2i_job,
            commands::create_i2i_job,
            commands::delete_job,
            commands::get_config,
            commands::save_config,
            commands::delete_config,
            commands::get_setting,
            commands::save_setting,
            commands::get_all_settings,
            commands::get_default_results_dir,
            commands::upload_images,
            commands::get_image,
            commands::delete_upload,
            commands::submit_batch,
            commands::poll_batch,
            commands::download_results,
            commands::cancel_batch,
            commands::validate_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
