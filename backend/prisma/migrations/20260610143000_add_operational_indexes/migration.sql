CREATE INDEX "vacation_id_medecin_id_site_modalite_date_idx"
ON "vacation"("id_medecin", "id_site", "modalite", "date");

CREATE INDEX "rdv_id_medecin_date_idx"
ON "rdv"("id_medecin", "date");

CREATE INDEX "rdv_id_site_date_idx"
ON "rdv"("id_site", "date");

CREATE UNIQUE INDEX "dossier_file_stored_name_key"
ON "dossier_file"("stored_name");

CREATE INDEX "audit_log_resource_resource_id_idx"
ON "audit_log"("resource", "resource_id");

CREATE INDEX "session_user_id_idx"
ON "session"("user_id");

CREATE INDEX "account_user_id_idx"
ON "account"("user_id");

CREATE INDEX "account_provider_id_account_id_idx"
ON "account"("provider_id", "account_id");

CREATE INDEX "verification_identifier_idx"
ON "verification"("identifier");
