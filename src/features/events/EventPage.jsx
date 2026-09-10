import React from "react";
import { Link, useParams } from "react-router-dom";
import EventDetail from "../../components/detail/EventDetail.jsx";
import { useThreatIntel } from "../../state/ThreatIntelContext.jsx";
import { EmptyState, Panel } from "../../components/ui/Primitives.jsx";

export default function EventPage() {
  const { id } = useParams();
  const { getEvent, events } = useThreatIntel();
  const event = id ? getEvent(decodeURIComponent(id)) : null;

  if (!event) {
    return (
      <div className="event-page">
        <Panel title="Event not in current session">
          <EmptyState
            title="This record is not loaded in memory."
            hint={
              events.length === 0
                ? "The session holds no observations (page refresh resets all state). Return to the monitor to fetch live data."
                : `The session holds ${events.length} observations, but none with this ID. It may come from an older fetch cycle — refresh the monitor to reload.`
            }
            action={<Link to="/monitor" className="btn btn-primary">Back to Live Monitor</Link>}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="event-page">
      <Link to="/monitor" className="btn btn-ghost btn-sm">← Back to monitor</Link>
      <Panel title={`Event ${event.id}`}>
        <EventDetail event={event} />
      </Panel>
    </div>
  );
}
