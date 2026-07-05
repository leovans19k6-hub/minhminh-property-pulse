# Event Calendar Foundation (Phase 6C)

Phase 6C ships a client-side calendar-data helper only. No external sync (Google Calendar, Outlook, ICS files) is integrated.

## API

```ts
import { eventToCalendarData } from "@/services/admin/events.service";
// or from "@/services/events.service" (re-exported)

const cal = eventToCalendarData({
  title, summary, start_at, end_at, timezone,
  location_name, address_text, meeting_url,
});
// -> { title, description, startsAt, endsAt, timezone, location, url } | null
```

Returns `null` when `start_at` or `end_at` is missing. `location` concatenates `location_name` and `address_text`, falling back to `meeting_url`. Callers can feed this shape to an ICS builder or "Add to Calendar" link later.

## Future work (NOT in Phase 6C)

- RFC 5545 ICS generator with correct escaping and `TZID` handling.
- Google Calendar deep-link template.
- Recurring event engine.
- External calendar sync.