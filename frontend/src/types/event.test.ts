import { describe, expect, it } from "vitest";
import {
  EVENT_LINK_LABEL,
  EVENT_STATUS_LABEL,
  EVENT_TYPE_COLOR,
  EVENT_TYPE_LABEL,
  IMPORTANCE_COLOR,
  IMPORTANCE_LABEL,
  type EventLinkKind,
  type EventStatusKind,
  type EventTypeKind,
} from "./event";

describe("event type", () => {
  it("has 6 types", () => {
    expect(Object.keys(EVENT_TYPE_LABEL)).toHaveLength(6);
  });

  it("contains canonical types", () => {
    expect(EVENT_TYPE_LABEL.main).toBe("主线");
    expect(EVENT_TYPE_LABEL.climax).toBe("高潮");
    expect(EVENT_TYPE_LABEL.foreshadow).toBe("伏笔");
  });

  it("LABEL and COLOR keys aligned", () => {
    expect(Object.keys(EVENT_TYPE_LABEL).sort()).toEqual(
      Object.keys(EVENT_TYPE_COLOR).sort()
    );
  });
});

describe("event status", () => {
  it("has 4 statuses", () => {
    expect(Object.keys(EVENT_STATUS_LABEL)).toHaveLength(4);
  });

  it("contains canonical statuses", () => {
    expect(EVENT_STATUS_LABEL.planned).toBe("规划中");
    expect(EVENT_STATUS_LABEL.resolved).toBe("已解决");
  });
});

describe("event link", () => {
  it("has 5 link types", () => {
    expect(Object.keys(EVENT_LINK_LABEL)).toHaveLength(5);
  });

  it("contains canonical link types", () => {
    expect(EVENT_LINK_LABEL.causes).toBe("导致");
    expect(EVENT_LINK_LABEL.blocks).toBe("阻止");
  });
});

describe("importance", () => {
  it("has 5 levels", () => {
    expect(Object.keys(IMPORTANCE_LABEL)).toHaveLength(5);
  });

  it("importance keys align between LABEL and COLOR", () => {
    expect(Object.keys(IMPORTANCE_LABEL).sort()).toEqual(
      Object.keys(IMPORTANCE_COLOR).sort()
    );
  });
});

describe("type-safety invariants", () => {
  it("EVENT_TYPE keys match EventTypeKind", () => {
    const labelKeys = Object.keys(EVENT_TYPE_LABEL);
    const colorKeys = Object.keys(EVENT_TYPE_COLOR);
    expect(labelKeys.sort()).toEqual(colorKeys.sort());
    // also matches the union type union members
    for (const k of labelKeys) {
      const _: EventTypeKind = k as EventTypeKind;
      expect(_).toBe(k);
    }
  });

  it("status keys match EventStatusKind", () => {
    for (const k of Object.keys(EVENT_STATUS_LABEL)) {
      const _: EventStatusKind = k as EventStatusKind;
      expect(_).toBe(k);
    }
  });

  it("link keys match EventLinkKind", () => {
    for (const k of Object.keys(EVENT_LINK_LABEL)) {
      const _: EventLinkKind = k as EventLinkKind;
      expect(_).toBe(k);
    }
  });
});