import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext.jsx";

function Probe() {
  const { theme, toggle } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button type="button" data-testid="toggle" onClick={toggle} aria-pressed={theme === "light"}>
        toggle
      </button>
    </>
  );
}

describe("theme state", () => {
  it("defaults to dark and exposes a working toggle", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByTestId("toggle"));
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByTestId("toggle").getAttribute("aria-pressed")).toBe("true");
    cleanup();
    document.documentElement.dataset.theme = "dark";
  });

  it("is runtime-only state (no persistence layer involved)", () => {
    render(
      <ThemeProvider initial="light">
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
    cleanup();
    document.documentElement.dataset.theme = "dark";
  });
});
