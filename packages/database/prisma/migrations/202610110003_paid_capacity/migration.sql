-- Required captures retain fixed-departure inventory for staff review.
CREATE OR REPLACE FUNCTION validate_departure_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allowed integer; occupied bigint;
BEGIN
  SELECT "capacity" INTO allowed FROM "PackageDeparture" WHERE "id"=NEW."departureId" FOR UPDATE;
  IF NEW."seats" <= 0 THEN RAISE EXCEPTION 'Seat count must be positive' USING ERRCODE='23514'; END IF;
  IF NEW."state" IN ('HELD','PAID','CONFIRMED') AND (NEW."state" IN ('PAID','CONFIRMED') OR NEW."expiresAt">now()) THEN
    SELECT coalesce(sum("seats"),0) INTO occupied FROM "DepartureReservation" WHERE "departureId"=NEW."departureId" AND "id"<>NEW."id" AND ("state" IN ('PAID','CONFIRMED') OR ("state"='HELD' AND "expiresAt">now()));
    IF occupied+NEW."seats">allowed THEN RAISE EXCEPTION 'Departure capacity exceeded' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
ALTER TABLE "DepartureReservation" ADD CONSTRAINT reservation_state_valid CHECK ("state" IN ('HELD','PAID','CONFIRMED','RELEASED'));

CREATE FUNCTION validate_staff_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM "StaffProfile" WHERE "id"=NEW."staffId" FOR UPDATE;
  IF NEW."type" IN ('LEAVE','BLOCKED') AND EXISTS(SELECT 1 FROM "ResourceAllocation" WHERE "guideId"=NEW."staffId" AND "state"='ACTIVE' AND tstzrange("startsAt","endsAt",'[)') && tstzrange(NEW."startsAt",NEW."endsAt",'[)')) THEN
    RAISE EXCEPTION 'Staff block conflicts with an active allocation' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_staff_block BEFORE INSERT OR UPDATE ON "StaffAvailability" FOR EACH ROW EXECUTE FUNCTION validate_staff_block();
