// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Scans } from "./Scans";
import { ScanProfiles } from "./ScanProfiles";
import { ScanJobDetail } from "./ScanJobDetail";
import { api } from "../lib/api";
vi.mock("../lib/api", () => ({
  api: {
    getScanners: vi.fn(),
    getScannerHealth: vi.fn(),
    getScanProfiles: vi.fn(),
    getScanJobs: vi.fn(),
    getScanWorkerStatus: vi.fn(),
    getScanSchedules: vi.fn(),
    getAssets: vi.fn(),
    createScanProfile: vi.fn(),
    getScanJob: vi.fn(),
    getScanResults: vi.fn(),
    cancelScanJob: vi.fn(),
  },
}));
vi.mock("../contexts/TenancyContext", () => ({
  useTenancy: () => ({
    currentWorkspace: {
      id: "workspace-1",
      name: "Workspace",
      role_key: "application_security_engineer",
    },
  }),
}));
vi.mock("../layouts/DashboardLayout", () => ({
  default: ({ children }) => <main>{children}</main>,
}));
vi.mock("../components/SectionHeader", () => ({
  default: ({ title, description, actions }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
}));
vi.mock("../components/Panel", () => ({
  default: ({ title, children }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));
const job = (status = "completed") => ({
  id: "job-1",
  profile_id: "profile-1",
  profile_name: "Web perimeter",
  scanner_type: "nuclei",
  status,
  requested_by: "user-1",
  target_count: 1,
  processed_target_count: 1,
  findings_created_count: 1,
  findings_updated_count: 0,
  findings_reopened_count: 0,
  findings_unchanged_count: 0,
  raw_result_count: 1,
  version: 3,
  created_at: "2026-07-19T00:00:00Z",
  updated_at: "2026-07-19T00:00:01Z",
  targets: [
    {
      id: "target-1",
      asset_id: "asset-1",
      asset_type: "domain",
      normalized_target: "example.test",
      execution_status: "completed",
      result_count: 1,
    },
  ],
});
describe("scanner management workflows", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    api.getScanners.mockResolvedValue([
      { scanner_type: "nuclei", active: true },
    ]);
    api.getScannerHealth.mockResolvedValue({
      available: false,
      message: "Nuclei CLI is not installed",
    });
    api.getScanProfiles.mockResolvedValue([]);
    api.getScanJobs.mockResolvedValue({ items: [], total: 0 });
    api.getScanWorkerStatus.mockResolvedValue({ status: "unavailable", active_lease_count: 0, queued_job_count: 0, expired_lease_count: 0 });
    api.getScanSchedules.mockResolvedValue({ items: [], total: 0 });
    api.getAssets.mockResolvedValue({ items: [] });
    api.createScanProfile.mockResolvedValue({ id: "profile-1" });
    api.getScanJob.mockResolvedValue(job());
    api.getScanResults.mockResolvedValue([
      {
        id: "result-1",
        payload_hash: "a".repeat(64),
        summary: {
          template_id: "tls-version",
          severity: "high",
          matched_at: "example.test",
        },
      },
    ]);
    api.cancelScanJob.mockResolvedValue(job("cancelled"));
  });
  it("shows the real unavailable scanner state without fake metrics", async () => {
    render(
      <MemoryRouter>
        <Scans />
      </MemoryRouter>,
    );
    expect((await screen.findAllByText("Unavailable")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Install and configure/)).toBeTruthy();
  });
  it("creates a validated Nuclei profile", async () => {
    render(
      <MemoryRouter>
        <ScanProfiles />
      </MemoryRouter>,
    );
    await screen.findByText("No profiles");
    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "External perimeter" },
    });
    fireEvent.click(screen.getByLabelText(/High/));
    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));
    await waitFor(() =>
      expect(api.createScanProfile).toHaveBeenCalledWith(
        "workspace-1",
        expect.objectContaining({
          scanner_type: "nuclei",
          configuration_json: { severities: ["high"] },
        }),
      ),
    );
  });
  it("polls terminal job data and renders safe summaries and Finding counters", async () => {
    render(
      <MemoryRouter initialEntries={["/scans/jobs/job-1"]}>
        <Routes>
          <Route path="/scans/jobs/:jobId" element={<ScanJobDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("tls-version")).toBeTruthy();
    expect(screen.getByText("Created")).toBeTruthy();
    expect(api.getScanJob).toHaveBeenCalledWith("workspace-1", "job-1");
  });
  it("renders failure state and permits active cancellation", async () => {
    api.getScanJob.mockResolvedValue(job("running"));
    render(
      <MemoryRouter initialEntries={["/scans/jobs/job-1"]}>
        <Routes>
          <Route path="/scans/jobs/:jobId" element={<ScanJobDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Cancel job" }));
    await waitFor(() =>
      expect(api.cancelScanJob).toHaveBeenCalledWith("workspace-1", "job-1"),
    );
  });
  it("renders durable retry, stalled, degraded worker, cancellation, and schedule context", async () => {
    api.getScanWorkerStatus.mockResolvedValue({ status: "degraded", active_lease_count: 0, queued_job_count: 1, expired_lease_count: 1 });
    api.getScanJobs.mockResolvedValue({ items: [{ ...job("claimed"), stalled: true, next_retry_at: "2026-07-19T01:00:00Z" }], total: 1 });
    const active = { ...job("running"), stalled: true, cancellation_requested_at: "2026-07-19T00:00:02Z", origin: "schedule", schedule_id: "schedule-1", scheduled_for: "2026-07-19T00:00:00Z", next_retry_at: "2026-07-19T01:00:00Z" };
    api.getScanJob.mockResolvedValue(active);
    const overview = render(<MemoryRouter><Scans /></MemoryRouter>);
    expect(await screen.findByText("Potentially stalled")).toBeTruthy();
    expect(screen.getByText("Degraded")).toBeTruthy();
    overview.unmount();
    render(<MemoryRouter initialEntries={["/scans/jobs/job-1"]}><Routes><Route path="/scans/jobs/:jobId" element={<ScanJobDetail />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Cancellation requested/)).toBeTruthy();
    expect(screen.getByText("Open associated schedule").getAttribute("href")).toBe("/scans/schedules/schedule-1");
    expect(screen.getByText(/Retry scheduled for/)).toBeTruthy();
  });
});
