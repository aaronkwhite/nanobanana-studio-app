mod commands;
mod db;
mod models;
pub mod paths;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Register shared HTTP client
            app.manage(reqwest::Client::new());

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
            commands::login,
            commands::logout,
            commands::get_auth_state,
            commands::api_generate,
            commands::api_generate_batch,
            commands::api_get_job,
            commands::api_get_balance,
            commands::api_purchase_credits,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
