CREATE OR REPLACE FUNCTION preserve_sent_quote() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."state" <> 'DRAFT' THEN RAISE EXCEPTION 'Sent quotation is immutable' USING ERRCODE='23514'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."state"<>'DRAFT' AND NEW."state"='DRAFT' THEN RAISE EXCEPTION 'Sent quotation cannot return to draft' USING ERRCODE='23514'; END IF;
  IF OLD."state" IN ('ACCEPTED','REJECTED','EXPIRED','SUPERSEDED') AND NEW."state"<>OLD."state" THEN RAISE EXCEPTION 'Closed quotation state is immutable' USING ERRCODE='23514'; END IF;
  IF OLD."state" <> 'DRAFT' AND (to_jsonb(NEW) - ARRAY['state','acceptedAt','version','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['state','acceptedAt','version','updatedAt']) THEN
    RAISE EXCEPTION 'Sent quotation content is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION preserve_published_itinerary() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD."state"<>'DRAFT' THEN RAISE EXCEPTION 'Published itinerary is immutable' USING ERRCODE='23514'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."state"<>'DRAFT' THEN
    IF NEW."state"='DRAFT' OR (to_jsonb(NEW)-ARRAY['state','updatedAt','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','updatedAt','version']) THEN
      RAISE EXCEPTION 'Published itinerary content is immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_published_itinerary BEFORE UPDATE OR DELETE ON "ItineraryVersion" FOR EACH ROW EXECUTE FUNCTION preserve_published_itinerary();

CREATE FUNCTION preserve_published_day() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_state text; parent_id uuid;
BEGIN
  parent_id:=CASE WHEN TG_OP='DELETE' THEN OLD."itineraryVersionId" ELSE NEW."itineraryVersionId" END;
  SELECT "state" INTO parent_state FROM "ItineraryVersion" WHERE "id"=parent_id FOR UPDATE;
  IF parent_state<>'DRAFT' THEN RAISE EXCEPTION 'Published itinerary days are immutable' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER preserve_published_day BEFORE INSERT OR UPDATE OR DELETE ON "ItineraryDay" FOR EACH ROW EXECUTE FUNCTION preserve_published_day();

CREATE FUNCTION preserve_published_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_state text; parent_id uuid;
BEGIN
  SELECT "itineraryVersionId" INTO parent_id FROM "ItineraryDay" WHERE "id"=CASE WHEN TG_OP='DELETE' THEN OLD."dayId" ELSE NEW."dayId" END;
  SELECT "state" INTO parent_state FROM "ItineraryVersion" WHERE "id"=parent_id FOR UPDATE;
  IF parent_state<>'DRAFT' THEN RAISE EXCEPTION 'Published itinerary activities are immutable' USING ERRCODE='23514'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER preserve_published_activity BEFORE INSERT OR UPDATE OR DELETE ON "ItineraryActivity" FOR EACH ROW EXECUTE FUNCTION preserve_published_activity();
CREATE TRIGGER immutable_booking_lines BEFORE UPDATE OR DELETE ON "BookingLineItem" FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
