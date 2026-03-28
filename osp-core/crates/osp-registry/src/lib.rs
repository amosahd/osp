pub mod server;
pub mod db;
pub mod routes;
pub mod models;
mod error;

pub use error::RegistryError;
pub use server::start_server;
