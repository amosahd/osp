use chrono::Utc;
use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Mutex;

use crate::error::RegistryError;
use crate::models::{ManifestEntry, Reputation, SearchQuery, SearchResult, SkillEntry, TemplateEntry};

/// SQLite-backed registry database.
pub struct RegistryDb {
    conn: Mutex<Connection>,
}

impl RegistryDb {
    /// Open (or create) the registry database.
    pub fn open(path: &Path) -> Result<Self, RegistryError> {
        let conn = Connection::open(path)?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    /// Open an in-memory database (for testing).
    pub fn in_memory() -> Result<Self, RegistryError> {
        let conn = Connection::open_in_memory()?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS manifests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider_id TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                domain TEXT NOT NULL,
                manifest_version INTEGER NOT NULL,
                manifest_json TEXT NOT NULL,
                signature_verified INTEGER NOT NULL DEFAULT 0,
                registered_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                reputation_score REAL NOT NULL DEFAULT 0.0,
                health_status TEXT NOT NULL DEFAULT 'unknown'
            );

            CREATE TABLE IF NOT EXISTS reputation (
                provider_id TEXT PRIMARY KEY,
                uptime_30d REAL NOT NULL DEFAULT 100.0,
                avg_provision_time_ms INTEGER NOT NULL DEFAULT 0,
                total_provisions INTEGER NOT NULL DEFAULT 0,
                failure_rate REAL NOT NULL DEFAULT 0.0,
                score REAL NOT NULL DEFAULT 0.0
            );

            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL,
                template_json TEXT NOT NULL,
                author TEXT NOT NULL,
                created_at TEXT NOT NULL,
                downloads INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider_id TEXT NOT NULL UNIQUE,
                skill_content TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'general',
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_manifests_domain ON manifests(domain);
            CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
            ",
        )?;
        Ok(())
    }

    /// Insert or update a manifest.
    pub fn upsert_manifest(
        &self,
        provider_id: &str,
        display_name: &str,
        domain: &str,
        manifest_version: u64,
        manifest_json: &str,
        signature_verified: bool,
    ) -> Result<i64, RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO manifests (provider_id, display_name, domain, manifest_version, manifest_json, signature_verified, registered_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
             ON CONFLICT(provider_id) DO UPDATE SET
                display_name = excluded.display_name,
                manifest_version = excluded.manifest_version,
                manifest_json = excluded.manifest_json,
                signature_verified = excluded.signature_verified,
                updated_at = excluded.updated_at",
            params![provider_id, display_name, domain, manifest_version, manifest_json, signature_verified as i32, now],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get a manifest by provider_id.
    pub fn get_manifest(&self, provider_id: &str) -> Result<ManifestEntry, RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;
        conn.query_row(
            "SELECT id, provider_id, display_name, domain, manifest_version, manifest_json, signature_verified, registered_at, updated_at, reputation_score, health_status
             FROM manifests WHERE provider_id = ?1",
            params![provider_id],
            |row| {
                Ok(ManifestEntry {
                    id: row.get(0)?,
                    provider_id: row.get(1)?,
                    display_name: row.get(2)?,
                    domain: row.get(3)?,
                    manifest_version: row.get::<_, i64>(4)? as u64,
                    manifest_json: row.get(5)?,
                    signature_verified: row.get::<_, i32>(6)? != 0,
                    registered_at: row.get::<_, String>(7)?.parse().unwrap_or_default(),
                    updated_at: row.get::<_, String>(8)?.parse().unwrap_or_default(),
                    reputation_score: row.get(9)?,
                    health_status: row.get(10)?,
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                RegistryError::NotFound(format!("provider: {provider_id}"))
            }
            other => RegistryError::DatabaseError(other),
        })
    }

    /// Search manifests with cursor-based pagination.
    pub fn search(&self, query: &SearchQuery) -> Result<(Vec<SearchResult>, Option<String>, u64), RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;

        let mut sql = String::from(
            "SELECT id, provider_id, display_name, domain, manifest_json, reputation_score, health_status FROM manifests WHERE 1=1",
        );
        let mut count_sql = String::from("SELECT COUNT(*) FROM manifests WHERE 1=1");
        let mut param_values: Vec<String> = Vec::new();

        if let Some(ref q) = query.q {
            let clause = format!(
                " AND (display_name LIKE '%{}%' OR domain LIKE '%{}%' OR manifest_json LIKE '%{}%')",
                q, q, q
            );
            sql.push_str(&clause);
            count_sql.push_str(&clause);
        }

        if let Some(ref category) = query.category {
            let clause = format!(" AND manifest_json LIKE '%\"category\":\"{}\"%'", category);
            sql.push_str(&clause);
            count_sql.push_str(&clause);
        }

        if let Some(ref cursor) = query.cursor {
            sql.push_str(&format!(" AND id > {}", cursor.parse::<i64>().unwrap_or(0)));
            param_values.push(cursor.clone());
        }

        sql.push_str(&format!(" ORDER BY id ASC LIMIT {}", query.limit + 1));

        let total_count: u64 = conn
            .query_row(&count_sql, [], |row| row.get::<_, i64>(0))
            .map(|c| c as u64)
            .unwrap_or(0);

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt
            .query_map([], |row| {
                let manifest_json: String = row.get(4)?;
                let manifest: serde_json::Value =
                    serde_json::from_str(&manifest_json).unwrap_or_default();

                let categories: Vec<String> = manifest
                    .get("offerings")
                    .and_then(|o| o.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|o| o.get("category").and_then(|c| c.as_str()))
                            .map(|s| s.to_string())
                            .collect()
                    })
                    .unwrap_or_default();

                let offerings_count = manifest
                    .get("offerings")
                    .and_then(|o| o.as_array())
                    .map(|a| a.len())
                    .unwrap_or(0);

                Ok(SearchResult {
                    provider_id: row.get(1)?,
                    display_name: row.get(2)?,
                    domain: row.get(3)?,
                    categories,
                    offerings_count,
                    reputation_score: row.get(5)?,
                    health_status: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let has_more = rows.len() > query.limit as usize;
        let results: Vec<SearchResult> = rows.into_iter().take(query.limit as usize).collect();
        let next_cursor = if has_more {
            results.last().map(|_| (total_count).to_string())
        } else {
            None
        };

        Ok((results, next_cursor, total_count))
    }

    /// Delete a manifest by provider_id.
    pub fn delete_manifest(&self, provider_id: &str) -> Result<(), RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;
        let affected = conn.execute(
            "DELETE FROM manifests WHERE provider_id = ?1",
            params![provider_id],
        )?;
        if affected == 0 {
            return Err(RegistryError::NotFound(format!("provider: {provider_id}")));
        }
        Ok(())
    }

    /// Update reputation score.
    pub fn update_reputation(&self, rep: &Reputation) -> Result<(), RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;
        conn.execute(
            "INSERT INTO reputation (provider_id, uptime_30d, avg_provision_time_ms, total_provisions, failure_rate, score)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(provider_id) DO UPDATE SET
                uptime_30d = excluded.uptime_30d,
                avg_provision_time_ms = excluded.avg_provision_time_ms,
                total_provisions = excluded.total_provisions,
                failure_rate = excluded.failure_rate,
                score = excluded.score",
            params![rep.provider_id, rep.uptime_30d, rep.avg_provision_time_ms, rep.total_provisions, rep.failure_rate, rep.score],
        )?;

        // Also update the manifests table score
        conn.execute(
            "UPDATE manifests SET reputation_score = ?1 WHERE provider_id = ?2",
            params![rep.score, rep.provider_id],
        )?;

        Ok(())
    }

    /// Get reputation for a provider.
    pub fn get_reputation(&self, provider_id: &str) -> Result<Reputation, RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;
        conn.query_row(
            "SELECT provider_id, uptime_30d, avg_provision_time_ms, total_provisions, failure_rate, score
             FROM reputation WHERE provider_id = ?1",
            params![provider_id],
            |row| {
                Ok(Reputation {
                    provider_id: row.get(0)?,
                    uptime_30d: row.get(1)?,
                    avg_provision_time_ms: row.get::<_, i64>(2)? as u64,
                    total_provisions: row.get::<_, i64>(3)? as u64,
                    failure_rate: row.get(4)?,
                    score: row.get(5)?,
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                RegistryError::NotFound(format!("reputation: {provider_id}"))
            }
            other => RegistryError::DatabaseError(other),
        })
    }

    /// Insert a template.
    pub fn insert_template(&self, entry: &TemplateEntry) -> Result<i64, RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;
        conn.execute(
            "INSERT INTO templates (name, description, template_json, author, created_at, downloads)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![entry.name, entry.description, entry.template_json, entry.author, entry.created_at.to_rfc3339(), entry.downloads],
        )?;
        Ok(conn.last_insert_rowid())
    }

    /// Insert a skill.
    pub fn upsert_skill(&self, entry: &SkillEntry) -> Result<(), RegistryError> {
        let conn = self.conn.lock().map_err(|e| RegistryError::Internal(e.to_string()))?;
        conn.execute(
            "INSERT INTO skills (provider_id, skill_content, category, updated_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(provider_id) DO UPDATE SET
                skill_content = excluded.skill_content,
                category = excluded.category,
                updated_at = excluded.updated_at",
            params![entry.provider_id, entry.skill_content, entry.category, entry.updated_at.to_rfc3339()],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_and_search() {
        let db = RegistryDb::in_memory().unwrap();

        db.upsert_manifest(
            "com.supabase",
            "Supabase",
            "supabase.com",
            3,
            r#"{"offerings":[{"category":"database"}]}"#,
            true,
        )
        .unwrap();

        let entry = db.get_manifest("com.supabase").unwrap();
        assert_eq!(entry.display_name, "Supabase");
        assert!(entry.signature_verified);

        let query = SearchQuery {
            q: Some("Supabase".to_string()),
            category: None,
            tag: None,
            cursor: None,
            limit: 10,
        };
        let (results, _, count) = db.search(&query).unwrap();
        assert_eq!(count, 1);
        assert_eq!(results[0].display_name, "Supabase");
    }

    #[test]
    fn upsert_updates_existing() {
        let db = RegistryDb::in_memory().unwrap();

        db.upsert_manifest("test", "Test v1", "test.com", 1, "{}", true)
            .unwrap();
        db.upsert_manifest("test", "Test v2", "test.com", 2, "{}", true)
            .unwrap();

        let entry = db.get_manifest("test").unwrap();
        assert_eq!(entry.display_name, "Test v2");
        assert_eq!(entry.manifest_version, 2);
    }

    #[test]
    fn delete_manifest() {
        let db = RegistryDb::in_memory().unwrap();
        db.upsert_manifest("to-delete", "Del", "del.com", 1, "{}", false)
            .unwrap();
        db.delete_manifest("to-delete").unwrap();
        assert!(db.get_manifest("to-delete").is_err());
    }
}
