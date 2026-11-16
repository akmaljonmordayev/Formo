-- Yuklangan fayllar bazada: S3 ham, UPLOAD_DIR ham sozlanmagan productionda rasm yuklash 503 qaytarardi
CREATE TABLE "StoredFile" (
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
);
