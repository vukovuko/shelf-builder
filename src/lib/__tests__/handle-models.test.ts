import { describe, expect, it } from "vitest";
import {
  HANDLE_MODELS,
  handleFinishLabel,
  handleModelSlug,
  handleSize,
  modelForHandle,
} from "@/lib/handle-models";

describe("HANDLE_MODELS", () => {
  it("gives every model its own URL and every handle one model", () => {
    const slugs = HANDLE_MODELS.map(handleModelSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const ids = HANDLE_MODELS.flatMap((m) => m.ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("finds the model of a handle", () => {
    expect(modelForHandle(9)?.name).toBe("Ručka MD");
    expect(modelForHandle(5)).toBeUndefined();
  });
});

describe("handleSize", () => {
  it.each([
    ["ORN N 160 ruč.MD sjaj MT", "Razmak rupa 160 mm"],
    ["ORN U ruč.217/447mm AL SM", "Dužina 447 mm"],
    ["ORN N ruč.230/240mm AL SM", "Dužina 240 mm"],
    ["ORN D ruč.D800 sjaj MT", null],
  ])("%s → %s", (name, size) => {
    expect(handleSize(name)).toBe(size);
  });
});

describe("handleFinishLabel", () => {
  it.each([
    ["ORN N 96 ruč.K415 mat MT", "Mat", "Srebro mat"],
    ["ORN U ruč.217/147mm AL SB", "SB", "Srebro sjaj (eloksirano)"],
    ["ORN N 224 ruč.MODEL 395 CM EK", "Standard", "Crna mat"],
    ["ORN N 224 ruč.MODEL 395 TIT EK", "Standard", "Srebro sjaj"],
    ["ORN N 160 ruč.SY4025 CR TM", "Standard", "Hrom sjaj"],
    ["ORN N 128 ruč.UZ-CAMAIcrna sj.", "Crna", "Crni hrom"],
    ["ORN N 96 ruč.UZ-E82/760niklHS", "Standard", "Brušeni nikl"],
  ])("%s (%s) → %s", (name, finish, label) => {
    expect(handleFinishLabel(name, finish)).toBe(label);
  });
});
