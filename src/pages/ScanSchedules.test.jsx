// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScanSchedules } from "./ScanSchedules";
import { ScanScheduleDetail } from "./ScanScheduleDetail";
import { Route, Routes } from "react-router-dom";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({ api: { getScanSchedules: vi.fn(), getScanProfiles: vi.fn(), createScanSchedule: vi.fn(), getScanSchedule: vi.fn(), updateScanSchedule: vi.fn(), enableScanSchedule: vi.fn(), disableScanSchedule: vi.fn() } }));
vi.mock("../contexts/TenancyContext", () => ({ useTenancy: () => ({ currentWorkspace: { id: "workspace-1", role_key: "application_security_engineer" } }) }));
vi.mock("../layouts/DashboardLayout", () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock("../components/SectionHeader", () => ({ default: ({ title, actions }) => <header><h1>{title}</h1>{actions}</header> }));
vi.mock("../components/Panel", () => ({ default: ({ title, children }) => <section><h2>{title}</h2>{children}</section> }));

describe("scan schedules", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    api.getScanSchedules.mockResolvedValue({ items: [], total: 0 });
    api.getScanProfiles.mockResolvedValue([{ id: "profile-1", name: "Perimeter", is_enabled: true }]);
    api.createScanSchedule.mockResolvedValue({ id: "schedule-1" });
    api.getScanSchedule.mockResolvedValue({ id: "schedule-1", name: "Hourly perimeter", schedule_type: "interval", interval_minutes: 60, timezone: "UTC", is_enabled: true, next_run_at: "2026-07-19T01:00:00Z", last_run_at: null, last_outcome: null, last_job_id: "job-1", misfire_policy: "run_once", version: 1 });
  });

  it("renders the live empty state and creates an interval schedule", async () => {
    render(<MemoryRouter><ScanSchedules /></MemoryRouter>);
    expect(await screen.findByText("No scan schedules")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create schedule" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Hourly perimeter" } });
    fireEvent.change(screen.getByLabelText("Profile"), { target: { value: "profile-1" } });
    fireEvent.change(screen.getByLabelText("Interval minutes"), { target: { value: "60" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create schedule" }).at(-1));
    await waitFor(() => expect(api.createScanSchedule).toHaveBeenCalledWith("workspace-1", expect.objectContaining({ profile_id: "profile-1", schedule_type: "interval", interval_minutes: 60, timezone: "UTC" })));
  });
  it("shows timezone preview and sends a strictly shaped cron schedule", async () => {
    render(<MemoryRouter><ScanSchedules /></MemoryRouter>);
    await screen.findByText("No scan schedules");
    fireEvent.click(screen.getByRole("button", { name: "Create schedule" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Weekday perimeter" } });
    fireEvent.change(screen.getByLabelText("Profile"), { target: { value: "profile-1" } });
    fireEvent.change(screen.getByLabelText("Schedule type"), { target: { value: "cron" } });
    fireEvent.change(screen.getByLabelText("Cron expression"), { target: { value: "0 9 * * 1-5" } });
    fireEvent.change(screen.getByLabelText("Timezone"), { target: { value: "Asia/Kolkata" } });
    expect(screen.getByText(/Next-run preview:/).textContent).toContain("Asia/Kolkata");
    fireEvent.click(screen.getAllByRole("button", { name: "Create schedule" }).at(-1));
    await waitFor(() => expect(api.createScanSchedule).toHaveBeenCalledWith("workspace-1", expect.objectContaining({ schedule_type: "cron", cron_expression: "0 9 * * 1-5", interval_minutes: null, timezone: "Asia/Kolkata" })));
  });
  it("disables a schedule and renders optimistic conflicts", async () => {
    api.disableScanSchedule.mockResolvedValue({ ...(await api.getScanSchedule()), is_enabled: false, version: 2 });
    const view=render(<MemoryRouter initialEntries={["/scans/schedules/schedule-1"]}><Routes><Route path="/scans/schedules/:scheduleId" element={<ScanScheduleDetail />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Disable" }));
    await waitFor(() => expect(api.disableScanSchedule).toHaveBeenCalledWith("workspace-1", "schedule-1", 1));
    view.unmount();
    api.disableScanSchedule.mockRejectedValue({ status: 409, message: "stale version" });
    render(<MemoryRouter initialEntries={["/scans/schedules/schedule-1"]}><Routes><Route path="/scans/schedules/:scheduleId" element={<ScanScheduleDetail />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Disable" }));
    expect(await screen.findByText("Schedule changed")).toBeTruthy();
  });
});
