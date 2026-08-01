import React from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import SectionHeader from '../../components/SectionHeader';
import Panel from '../../components/Panel';

const NotFound = () => <DashboardLayout>
  <SectionHeader title="Page not found" description="This route is not part of the active ThreatStream workspace." eyebrow="404" />
  <Panel title="Return to a known workspace surface" hint="No request was made for an unknown resource identifier.">
    <Link className="btn btn-primary" to="/overview">Return to overview</Link>
  </Panel>
</DashboardLayout>;

export default NotFound;
