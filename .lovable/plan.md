# Transaction Date and Time

## Goal
Show and edit transaction time without adding clutter to the mobile PWA.

## Experience

### Add transaction
- Keep the existing compact date pill as the only always-visible control.
- Display `Today · 10:47 PM`, `Yesterday · 8:15 AM`, or `Sep 10 · 2:30 PM` inside the pill.
- Opening it keeps the existing calendar and adds a native mobile-friendly time field beneath it.
- New transactions default to the current date and time.
- Choosing another date preserves the selected time instead of resetting it to midnight.

### Edit transaction
- Combine date and time in the existing date section rather than adding another full form row.
- Keep the calendar picker and add an adjacent native time field.
- Preserve the transaction’s exact timestamp when unrelated details are edited.

### Transaction list
- Show time as small secondary metadata beside the payment mode.
- Day view: `Cash • 10:47 PM`.
- Month/year view: `Cash • 10 Sep • 10:47 PM`.
- Sort transactions within each day by timestamp, newest first.
- As requested, existing entries display their currently stored time, including `12:00 AM`.

## Data and compatibility
- Continue using the existing ISO timestamp in `Transaction.date`; no schema migration or extra field is needed.
- Preserve local calendar date and local time when combining picker values, then store the resulting ISO timestamp.
- QR transfer and local backup already preserve the full timestamp and need no format change.
- Add an optional `time` column to CSV export/import so round trips retain time while old date-only CSV files remain valid.
- Include date and time in Google Sheets output so exported records do not silently lose precision.
- Recurring transactions keep their current generated time (`12:00 AM`) in this scope; configurable recurring times remain separate future work.

## Technical details
- Add shared date/time helpers for compact labels, time formatting, and safely combining a selected date with a time value.
- Update add, edit, list, CSV, and Sheets paths to use those helpers consistently.
- Leave day-based filters, heatmap, streaks, goals, and analytics unchanged; time must not alter which local calendar day a transaction belongs to.
- Add tests for current-time creation, date changes preserving time, editing, ordering within a day, date-only CSV compatibility, and time-preserving CSV round trips.

## Validation
- Verify the add, edit, and list flows at a narrow mobile viewport.
- Confirm the date/time controls remain usable on iPhone-style screens without horizontal overflow.
- Run the relevant date, CSV, transaction, and full regression tests.
