-- Per-event unclaimed amounts: statements for different years add up; re-imports overwrite their own event.
ALTER TABLE unclaimed_folios ADD COLUMN amounts_by_event jsonb NOT NULL DEFAULT '{}';
UPDATE unclaimed_folios SET amounts_by_event = jsonb_build_object('legacy', unclaimed_dividend_amount) WHERE unclaimed_dividend_amount > 0;
