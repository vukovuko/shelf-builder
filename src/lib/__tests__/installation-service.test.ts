import { describe, expect, it } from "vitest";
import {
  buildInstallationServiceAdjustment,
  INSTALLATION_ROUNDING_STEP,
  roundUpToStep,
} from "../installation-service";

describe("installation service pricing", () => {
  it("rounds values up to the next 2000 RSD step", () => {
    expect(roundUpToStep(1210, INSTALLATION_ROUNDING_STEP)).toBe(2000);
    expect(roundUpToStep(4000, INSTALLATION_ROUNDING_STEP)).toBe(4000);
    expect(roundUpToStep(4001, INSTALLATION_ROUNDING_STEP)).toBe(6000);
  });

  it("calculates prepared delivery surcharge at 10%", () => {
    const adjustment = buildInstallationServiceAdjustment(
      12100,
      "prepared-delivery",
    );

    expect(adjustment).toMatchObject({
      description: "Dostava bez montaže, sa pripremom materijala",
      amount: 14000,
      visible: true,
    });
  });

  it("calculates full installation surcharge at 40% plus base fee", () => {
    const adjustment = buildInstallationServiceAdjustment(
      41000,
      "full-installation",
    );

    expect(adjustment?.amount).toBe(30000);
  });

  it("returns null when no service is selected", () => {
    expect(buildInstallationServiceAdjustment(25000, "")).toBeNull();
  });
});