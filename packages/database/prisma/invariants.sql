-- Hand-written safeguards applied after the generated relational migration.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "User" ADD CONSTRAINT user_email_normalized CHECK ("email" = lower(trim("email")) AND position('@' in "email") > 1);
ALTER TABLE "User" ADD CONSTRAINT user_status_valid CHECK ("status" IN ('ACTIVE','INVITED','SUSPENDED'));
ALTER TABLE "UserRoleGrant" ADD CONSTRAINT role_valid CHECK ("role" IN ('CUSTOMER','OPERATIONS','DRIVER_GUIDE','ADMIN'));
CREATE UNIQUE INDEX one_active_role ON "UserRoleGrant" ("userId", "role") WHERE "revokedAt" IS NULL;
ALTER TABLE "PermissionOverride" ADD CONSTRAINT permission_scope CHECK (("userId" IS NOT NULL)::integer + ("role" IS NOT NULL)::integer = 1);
ALTER TABLE "PermissionOverride" ADD CONSTRAINT permission_reason CHECK (length(trim("reason")) > 0);
CREATE UNIQUE INDEX user_permission_unique ON "PermissionOverride" ("userId","action") WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX role_permission_unique ON "PermissionOverride" ("role","action") WHERE "role" IS NOT NULL;
ALTER TABLE "AuthToken" ADD CONSTRAINT token_purpose_valid CHECK ("purpose" IN ('VERIFY_EMAIL','RESET_PASSWORD','INVITE','REAUTH','EMAIL_CHANGE','VERIFICATION','RESET','INVITATION'));
ALTER TABLE "Session" ADD CONSTRAINT session_valid_expiry CHECK ("expiresAt" > "createdAt");
ALTER TABLE "BookingPolicyVersion" ADD CONSTRAINT policy_ranges CHECK ("depositBasisPoints" BETWEEN 0 AND 10000 AND "balanceDaysBefore" >= 0 AND "previewMinutes" > 0 AND "quoteDays" > 0);
ALTER TABLE "PackagePriceVersion" ADD CONSTRAINT price_ranges CHECK ("adultMinor" >= 0 AND "childBasisPoints" BETWEEN 0 AND 10000 AND "childMinAge" >= 0 AND "childMaxAge" >= "childMinAge" AND ("endsAt" IS NULL OR "endsAt" >= "startsAt"));
ALTER TABLE "Package" ADD CONSTRAINT package_duration_positive CHECK ("durationDays" BETWEEN 1 AND 365);
ALTER TABLE "PackageDeparture" ADD CONSTRAINT departure_window CHECK ("endDate" >= "startDate" AND "capacity" > 0);
ALTER TABLE "PricePreview" ADD CONSTRAINT preview_valid CHECK ("adults" >= 1 AND "children" >= 0 AND "adults" + "children" <= 50 AND "endDate" >= "startDate" AND "totalMinor" >= 0 AND "depositMinor" BETWEEN 0 AND "totalMinor");
ALTER TABLE "Booking" ADD CONSTRAINT booking_valid CHECK ("adults" >= 1 AND "children" >= 0 AND "adults" + "children" <= 50 AND "endDate" >= "startDate" AND "totalMinor" >= 0 AND "depositMinor" BETWEEN 0 AND "totalMinor");
ALTER TABLE "Booking" ADD CONSTRAINT booking_status_valid CHECK ("status" IN ('REQUESTED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','DECLINED'));
ALTER TABLE "Booking" ADD CONSTRAINT booking_currency CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "BookingTraveler" ADD CONSTRAINT traveler_band CHECK ("band" IN ('ADULT','CHILD') AND ("ageYears" IS NULL OR "ageYears" BETWEEN 0 AND 120));
CREATE UNIQUE INDEX one_lead_traveler ON "BookingTraveler" ("bookingId") WHERE "lead";
ALTER TABLE "BookingPickup" ADD CONSTRAINT pickup_coordinates CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180));
ALTER TABLE "BookingLineItem" ADD CONSTRAINT booking_line_math CHECK ("quantity" > 0 AND "unitMinor" >= 0 AND "totalMinor" = "quantity"::bigint * "unitMinor");
ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT adjustment_nonnegative CHECK ("amountMinor" >= 0 AND "direction" IN ('DEBIT','CREDIT') AND length(trim("reason")) > 0);
CREATE UNIQUE INDEX one_open_booking_change ON "BookingChangeRequest" ("bookingId") WHERE "status" IN ('OPEN','PENDING');
ALTER TABLE "CustomRequest" ADD CONSTRAINT request_counts CHECK ("adults" >= 1 AND "children" >= 0 AND "adults" + "children" <= 50 AND ("budgetMinor" IS NULL OR "budgetMinor" >= 0) AND ("startDate" IS NULL OR "endDate" IS NULL OR "endDate" >= "startDate"));
ALTER TABLE "QuoteVersion" ADD CONSTRAINT quote_amounts CHECK ("totalMinor" >= 0 AND "depositMinor" BETWEEN 0 AND "totalMinor");
ALTER TABLE "QuoteVersion" ADD CONSTRAINT quote_state_valid CHECK ("state" IN ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','SUPERSEDED'));
CREATE UNIQUE INDEX one_current_sent_quote ON "QuoteVersion" ("requestId") WHERE "state" = 'SENT';
CREATE UNIQUE INDEX one_accepted_quote ON "QuoteVersion" ("requestId") WHERE "state" = 'ACCEPTED';
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT quote_line_math CHECK ("quantity" > 0 AND "unitMinor" >= 0 AND "totalMinor" = "quantity"::bigint * "unitMinor");
ALTER TABLE "ItineraryVersion" ADD CONSTRAINT itinerary_owner CHECK (("bookingId" IS NOT NULL)::integer + ("requestId" IS NOT NULL)::integer = 1);
CREATE UNIQUE INDEX one_published_booking_itinerary ON "ItineraryVersion" ("bookingId") WHERE "state" = 'PUBLISHED';
CREATE UNIQUE INDEX one_published_request_itinerary ON "ItineraryVersion" ("requestId") WHERE "state" = 'PUBLISHED';
ALTER TABLE "ItineraryDay" ADD CONSTRAINT day_sequence_positive CHECK ("sequence" > 0);
ALTER TABLE "ItineraryActivity" ADD CONSTRAINT activity_order_positive CHECK ("order" > 0);
ALTER TABLE "Review" ADD CONSTRAINT stars_valid CHECK ("stars" BETWEEN 1 AND 5);
ALTER TABLE "Favorite" ADD CONSTRAINT favorite_one_target CHECK (("packageId" IS NOT NULL)::integer + ("destinationId" IS NOT NULL)::integer = 1);
ALTER TABLE "Trip" ADD CONSTRAINT trip_window CHECK ("endsAt" > "startsAt");
ALTER TABLE "Trip" ADD CONSTRAINT trip_status_valid CHECK ("status" IN ('SCHEDULED','EN_ROUTE_TO_PICKUP','PICKED_UP','SAFARI_STARTED','ACTIVITY_REACHED','RETURNING','COMPLETED','CANCELLED'));
ALTER TABLE "Vehicle" ADD CONSTRAINT vehicle_seats CHECK ("seats" > 0 AND "luggageCapacity" >= 0);
ALTER TABLE "Vehicle" ADD CONSTRAINT vehicle_status_valid CHECK ("status" IN ('ACTIVE','MAINTENANCE','RETIRED'));
ALTER TABLE "StaffAvailability" ADD CONSTRAINT staff_window CHECK ("endsAt" > "startsAt" AND "type" IN ('AVAILABLE','LEAVE','BLOCKED'));
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT allocation_window CHECK ("endsAt" > "startsAt");
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT allocation_state CHECK ("state" IN ('ACTIVE','RELEASED'));
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT allocation_resource CHECK (("resourceType" = 'GUIDE' AND "guideId" = "resourceId" AND "vehicleId" IS NULL) OR ("resourceType" = 'VEHICLE' AND "vehicleId" = "resourceId" AND "guideId" IS NULL));
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT allocation_no_overlap EXCLUDE USING gist (
  "resourceType" WITH =, "resourceId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&
) WHERE ("state" = 'ACTIVE');
CREATE UNIQUE INDEX one_current_assignment ON "TripAssignment" ("tripId") WHERE "endedAt" IS NULL;
ALTER TABLE "TripAssignment" ADD CONSTRAINT assignment_guide_allocation FOREIGN KEY ("guideAllocationId") REFERENCES "ResourceAllocation" ("id") ON DELETE RESTRICT;
ALTER TABLE "TripAssignment" ADD CONSTRAINT assignment_vehicle_allocation FOREIGN KEY ("vehicleAllocationId") REFERENCES "ResourceAllocation" ("id") ON DELETE RESTRICT;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT intent_amount_positive CHECK ("amountMinor" > 0 AND "reservationMinor" BETWEEN 0 AND "amountMinor");
CREATE UNIQUE INDEX one_pending_intent ON "PaymentIntent" ("bookingId") WHERE "state" IN ('PENDING','PROCESSING','UNKNOWN');
ALTER TABLE "PaymentPosting" ADD CONSTRAINT capture_amount_positive CHECK ("amountMinor" > 0);
ALTER TABLE "PaymentPosting" ADD CONSTRAINT capture_origin CHECK (("intentId" IS NOT NULL)::integer + ("offlineRecordId" IS NOT NULL)::integer = 1);
ALTER TABLE "OfflinePaymentRecord" ADD CONSTRAINT offline_amount_positive CHECK ("amountMinor" > 0);
ALTER TABLE "Refund" ADD CONSTRAINT refund_amount_positive CHECK ("amountMinor" > 0 AND length(trim("reason")) > 0);
ALTER TABLE "RefundPosting" ADD CONSTRAINT refund_posting_positive CHECK ("amountMinor" > 0);
ALTER TABLE "MediaAsset" ADD CONSTRAINT media_size CHECK ("bytes" >= 0);
ALTER TABLE "InternalNote" ADD CONSTRAINT note_internal CHECK ("visibility" = 'INTERNAL');

CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_payment_posting BEFORE UPDATE OR DELETE ON "PaymentPosting" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_refund_posting BEFORE UPDATE OR DELETE ON "RefundPosting" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_adjustment BEFORE UPDATE OR DELETE ON "FinancialAdjustment" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_trip_event BEFORE UPDATE OR DELETE ON "TripEvent" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_handover BEFORE UPDATE OR DELETE ON "TripHandover" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_internal_note BEFORE UPDATE OR DELETE ON "InternalNote" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_policy BEFORE UPDATE OR DELETE ON "BookingPolicyVersion" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_price BEFORE UPDATE OR DELETE ON "PackagePriceVersion" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_company_version BEFORE UPDATE OR DELETE ON "CompanySettingsVersion" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

CREATE FUNCTION preserve_booking_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."totalMinor",NEW."depositMinor",NEW."priceSnapshot",NEW."policySnapshot",NEW."currency",NEW."policyVersionId",NEW."quoteId",NEW."packageId",NEW."customerId",NEW."adults",NEW."children")
    IS DISTINCT FROM (OLD."totalMinor",OLD."depositMinor",OLD."priceSnapshot",OLD."policySnapshot",OLD."currency",OLD."policyVersionId",OLD."quoteId",OLD."packageId",OLD."customerId",OLD."adults",OLD."children") THEN
    RAISE EXCEPTION 'Accepted booking snapshot is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_booking_snapshot BEFORE UPDATE ON "Booking" FOR EACH ROW EXECUTE FUNCTION preserve_booking_snapshot();

CREATE FUNCTION preserve_sent_quote() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."state" <> 'DRAFT' THEN RAISE EXCEPTION 'Sent quotation is immutable' USING ERRCODE='23514'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."state" <> 'DRAFT' AND (to_jsonb(NEW) - ARRAY['state','acceptedAt','version','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['state','acceptedAt','version','updatedAt']) THEN
    RAISE EXCEPTION 'Sent quotation content is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_sent_quote BEFORE UPDATE OR DELETE ON "QuoteVersion" FOR EACH ROW EXECUTE FUNCTION preserve_sent_quote();

CREATE FUNCTION preserve_quote_line() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_state text;
BEGIN
  SELECT "state" INTO parent_state FROM "QuoteVersion" WHERE "id" = CASE WHEN TG_OP='DELETE' THEN OLD."quoteId" ELSE NEW."quoteId" END FOR UPDATE;
  IF parent_state <> 'DRAFT' THEN RAISE EXCEPTION 'Sent quotation lines are immutable' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER preserve_quote_line BEFORE INSERT OR UPDATE OR DELETE ON "QuoteLineItem" FOR EACH ROW EXECUTE FUNCTION preserve_quote_line();

CREATE FUNCTION validate_resource() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE staff_active boolean; vehicle_status text; capacity integer; traveler_count integer;
BEGIN
  IF NEW."resourceType" = 'GUIDE' THEN NEW."guideId" := NEW."resourceId"; NEW."vehicleId" := NULL;
  ELSIF NEW."resourceType" = 'VEHICLE' THEN NEW."vehicleId" := NEW."resourceId"; NEW."guideId" := NULL;
  ELSE RAISE EXCEPTION 'Invalid resource type' USING ERRCODE='23514'; END IF;
  IF NEW."state" <> 'ACTIVE' THEN RETURN NEW; END IF;
  IF NEW."resourceType" = 'GUIDE' THEN
    SELECT s."active" AND u."status"='ACTIVE' INTO staff_active FROM "StaffProfile" s JOIN "User" u ON u."id"=s."userId" WHERE s."id"=NEW."resourceId" FOR UPDATE OF s;
    IF NOT coalesce(staff_active,false) THEN RAISE EXCEPTION 'Inactive guide' USING ERRCODE='23514'; END IF;
    IF NOT EXISTS(SELECT 1 FROM "StaffProfile" s JOIN "UserRoleGrant" r ON r."userId"=s."userId" WHERE s."id"=NEW."resourceId" AND r."role"='DRIVER_GUIDE' AND r."revokedAt" IS NULL) THEN RAISE EXCEPTION 'Guide capability missing' USING ERRCODE='23514'; END IF;
    IF EXISTS(SELECT 1 FROM "StaffAvailability" a WHERE a."staffId"=NEW."resourceId" AND a."type" IN ('LEAVE','BLOCKED') AND tstzrange(a."startsAt",a."endsAt",'[)') && tstzrange(NEW."startsAt",NEW."endsAt",'[)')) THEN RAISE EXCEPTION 'Guide leave conflict' USING ERRCODE='23514'; END IF;
  ELSE
    SELECT "status","seats" INTO vehicle_status,capacity FROM "Vehicle" WHERE "id"=NEW."resourceId" FOR UPDATE;
    IF NEW."source"='TRIP' AND vehicle_status <> 'ACTIVE' THEN RAISE EXCEPTION 'Unavailable vehicle' USING ERRCODE='23514'; END IF;
    IF NEW."tripId" IS NOT NULL THEN
      SELECT b."adults"+b."children" INTO traveler_count FROM "Trip" t JOIN "Booking" b ON b."id"=t."bookingId" WHERE t."id"=NEW."tripId";
      IF traveler_count > capacity THEN RAISE EXCEPTION 'Insufficient vehicle capacity' USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_resource BEFORE INSERT OR UPDATE ON "ResourceAllocation" FOR EACH ROW EXECUTE FUNCTION validate_resource();

CREATE FUNCTION validate_departure_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allowed integer; occupied bigint;
BEGIN
  SELECT "capacity" INTO allowed FROM "PackageDeparture" WHERE "id"=NEW."departureId" FOR UPDATE;
  IF NEW."seats" <= 0 THEN RAISE EXCEPTION 'Seat count must be positive' USING ERRCODE='23514'; END IF;
  IF NEW."state" IN ('HELD','CONFIRMED') AND (NEW."state"='CONFIRMED' OR NEW."expiresAt">now()) THEN
    SELECT coalesce(sum("seats"),0) INTO occupied FROM "DepartureReservation" WHERE "departureId"=NEW."departureId" AND "id"<>NEW."id" AND ("state"='CONFIRMED' OR ("state"='HELD' AND "expiresAt">now()));
    IF occupied+NEW."seats">allowed THEN RAISE EXCEPTION 'Departure capacity exceeded' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER departure_capacity BEFORE INSERT OR UPDATE ON "DepartureReservation" FOR EACH ROW EXECUTE FUNCTION validate_departure_capacity();

CREATE FUNCTION validate_capture() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE booking_currency text; intent_record record; offline_record record;
BEGIN
  SELECT "currency" INTO booking_currency FROM "Booking" WHERE "id"=NEW."bookingId" FOR UPDATE;
  IF NEW."currency"<>booking_currency THEN RAISE EXCEPTION 'Capture currency mismatch' USING ERRCODE='23514'; END IF;
  IF NEW."intentId" IS NOT NULL THEN
    SELECT * INTO intent_record FROM "PaymentIntent" WHERE "id"=NEW."intentId";
    IF NEW."bookingId"<>intent_record."bookingId" OR NEW."amountMinor"<>intent_record."amountMinor" OR NEW."currency"<>intent_record."currency" THEN RAISE EXCEPTION 'Capture intent mismatch' USING ERRCODE='23514'; END IF;
  ELSE
    SELECT * INTO offline_record FROM "OfflinePaymentRecord" WHERE "id"=NEW."offlineRecordId";
    IF offline_record."verifiedAt" IS NULL OR offline_record."verifiedBy" IS NULL OR NEW."bookingId"<>offline_record."bookingId" OR NEW."amountMinor"<>offline_record."amountMinor" OR NEW."currency"<>offline_record."currency" THEN RAISE EXCEPTION 'Offline capture is unverified or mismatched' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_capture BEFORE INSERT ON "PaymentPosting" FOR EACH ROW EXECUTE FUNCTION validate_capture();

CREATE FUNCTION validate_refund_limit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE capture record; reserved bigint;
BEGIN
  SELECT * INTO capture FROM "PaymentPosting" WHERE "id"=NEW."postingId" FOR UPDATE;
  IF NEW."bookingId"<>capture."bookingId" OR NEW."currency"<>capture."currency" THEN RAISE EXCEPTION 'Refund capture mismatch' USING ERRCODE='23514'; END IF;
  IF NEW."state" NOT IN ('REJECTED','FAILED','CANCELLED') THEN
    SELECT coalesce(sum("amountMinor"),0) INTO reserved FROM "Refund" WHERE "postingId"=NEW."postingId" AND "id"<>NEW."id" AND "state" NOT IN ('REJECTED','FAILED','CANCELLED');
    IF reserved+NEW."amountMinor">capture."amountMinor" THEN RAISE EXCEPTION 'Refund limit exceeded' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_refund_limit BEFORE INSERT OR UPDATE ON "Refund" FOR EACH ROW EXECUTE FUNCTION validate_refund_limit();

CREATE FUNCTION validate_refund_posting() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE approved record;
BEGIN
  SELECT * INTO approved FROM "Refund" WHERE "id"=NEW."refundId" FOR UPDATE;
  IF approved."approvedBy" IS NULL OR NEW."amountMinor"<>approved."amountMinor" OR NEW."currency"<>approved."currency" THEN RAISE EXCEPTION 'Refund posting lacks matching approval' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_refund_posting BEFORE INSERT ON "RefundPosting" FOR EACH ROW EXECUTE FUNCTION validate_refund_posting();

CREATE FUNCTION validate_review_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM "Booking" WHERE "id"=NEW."bookingId" AND "customerId"=NEW."customerId" AND "status"='COMPLETED') THEN RAISE EXCEPTION 'Review requires owned completed booking' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_review_owner BEFORE INSERT OR UPDATE ON "Review" FOR EACH ROW EXECUTE FUNCTION validate_review_owner();

CREATE FUNCTION protect_last_admin() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_user uuid; removes_admin boolean;
BEGIN
  IF TG_TABLE_NAME='User' THEN
    target_user:=OLD."id"; removes_admin:=OLD."status"='ACTIVE' AND NEW."status"<>'ACTIVE';
  ELSE
    target_user:=OLD."userId"; removes_admin:=OLD."role"='ADMIN' AND OLD."revokedAt" IS NULL AND (TG_OP='DELETE' OR NEW."revokedAt" IS NOT NULL OR NEW."role"<>'ADMIN');
  END IF;
  IF removes_admin THEN
    PERFORM pg_advisory_xact_lock(4781231);
    IF EXISTS(SELECT 1 FROM "UserRoleGrant" WHERE "userId"=target_user AND "role"='ADMIN' AND "revokedAt" IS NULL) AND NOT EXISTS(SELECT 1 FROM "UserRoleGrant" r JOIN "User" u ON u."id"=r."userId" WHERE r."role"='ADMIN' AND r."revokedAt" IS NULL AND u."status"='ACTIVE' AND u."id"<>target_user) THEN RAISE EXCEPTION 'Last active Admin cannot be removed' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER protect_last_admin_user BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION protect_last_admin();
CREATE TRIGGER protect_last_admin_grant BEFORE UPDATE OR DELETE ON "UserRoleGrant" FOR EACH ROW EXECUTE FUNCTION protect_last_admin();
