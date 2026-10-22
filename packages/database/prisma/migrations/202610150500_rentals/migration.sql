-- Safari AI Rentals — car rental and chauffeur services (a Me and Adventure Safaris service).
-- CreateTable
CREATE TABLE "RentalServiceLine" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "useCases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon" TEXT,
    "localized" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RentalServiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalVehicle" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "modelYear" INTEGER,
    "category" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "doors" INTEGER NOT NULL DEFAULT 4,
    "luggageCapacity" INTEGER NOT NULL DEFAULT 0,
    "transmission" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "fuel" TEXT NOT NULL DEFAULT 'PETROL',
    "chauffeurDriven" BOOLEAN NOT NULL DEFAULT true,
    "selfDriveAvailable" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "photo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RentalVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalRate" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "rateType" TEXT NOT NULL DEFAULT 'DAILY',
    "currency" CHAR(3) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "minimumDays" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "activeAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalPolicyVersion" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "policy" JSONB NOT NULL,
    "createdBy" UUID,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalPolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalServiceLine_slug_key" ON "RentalServiceLine"("slug");

-- CreateIndex
CREATE INDEX "RentalServiceLine_status_sortOrder_idx" ON "RentalServiceLine"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RentalVehicle_slug_key" ON "RentalVehicle"("slug");

-- CreateIndex
CREATE INDEX "RentalVehicle_category_status_idx" ON "RentalVehicle"("category", "status");

-- CreateIndex
CREATE INDEX "RentalVehicle_segment_status_idx" ON "RentalVehicle"("segment", "status");

-- CreateIndex
CREATE INDEX "RentalVehicle_status_sortOrder_idx" ON "RentalVehicle"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RentalRate_vehicleId_version_rateType_currency_key" ON "RentalRate"("vehicleId", "version", "rateType", "currency");

-- CreateIndex
CREATE INDEX "RentalRate_vehicleId_rateType_currency_idx" ON "RentalRate"("vehicleId", "rateType", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "RentalPolicyVersion_version_key" ON "RentalPolicyVersion"("version");

-- AddForeignKey
ALTER TABLE "RentalRate" ADD CONSTRAINT "RentalRate_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "RentalVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
