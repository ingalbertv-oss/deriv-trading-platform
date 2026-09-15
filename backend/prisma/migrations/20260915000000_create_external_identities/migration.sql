CREATE TABLE "external_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider_email" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_identities_provider_provider_id_key" ON "external_identities"("provider", "provider_id");
CREATE INDEX "external_identities_user_id_idx" ON "external_identities"("user_id");
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
