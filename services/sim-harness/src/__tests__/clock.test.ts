import { describe, it, expect } from "vitest";
import { SimulationClock } from "../clock.js";

describe("SimulationClock", () => {
  describe("frozen mode", () => {
    it("starts at zero elapsed time", () => {
      const clock = new SimulationClock({ mode: "frozen" });
      expect(clock.elapsedMs).toBe(0);
      expect(clock.elapsedMinutes).toBe(0);
    });

    it("only advances via explicit tick()", () => {
      const clock = new SimulationClock({ mode: "frozen" });
      clock.start();
      expect(clock.elapsedMs).toBe(0);
      clock.tick(1000);
      expect(clock.elapsedMs).toBe(1000);
      clock.tick(500);
      expect(clock.elapsedMs).toBe(1500);
    });

    it("reports elapsed minutes correctly", () => {
      const clock = new SimulationClock({ mode: "frozen" });
      clock.tick(120_000); // 2 minutes
      expect(clock.elapsedMinutes).toBe(2);
    });

    it("resets to zero", () => {
      const clock = new SimulationClock({ mode: "frozen" });
      clock.tick(5000);
      clock.reset();
      expect(clock.elapsedMs).toBe(0);
      expect(clock.running).toBe(false);
    });

    it("rejects negative tick delta", () => {
      const clock = new SimulationClock({ mode: "frozen" });
      expect(() => clock.tick(-1)).toThrow(RangeError);
    });
  });

  describe("wall-clock mode", () => {
    it("tracks real time while running", async () => {
      const clock = new SimulationClock({ mode: "wall-clock" });
      clock.start();
      await new Promise((r) => setTimeout(r, 50));
      const elapsed = clock.elapsedMs;
      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(elapsed).toBeLessThan(200);
    });

    it("pauses and resumes", async () => {
      const clock = new SimulationClock({ mode: "wall-clock" });
      clock.start();
      await new Promise((r) => setTimeout(r, 50));
      clock.pause();
      const afterPause = clock.elapsedMs;
      await new Promise((r) => setTimeout(r, 50));
      expect(clock.elapsedMs).toBe(afterPause); // no change while paused
      clock.start();
      await new Promise((r) => setTimeout(r, 50));
      expect(clock.elapsedMs).toBeGreaterThan(afterPause);
    });
  });

  describe("accelerated mode", () => {
    it("multiplies wall-clock time by factor", async () => {
      const clock = new SimulationClock({
        mode: "accelerated",
        accelerationFactor: 10,
      });
      clock.start();
      await new Promise((r) => setTimeout(r, 50));
      const elapsed = clock.elapsedMs;
      // Should be ~500ms (50ms × 10) with some tolerance
      expect(elapsed).toBeGreaterThanOrEqual(300);
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe("encounter-scoped isolation", () => {
    it("two clocks run independently", () => {
      const clockA = new SimulationClock({ mode: "frozen" });
      const clockB = new SimulationClock({ mode: "frozen" });
      clockA.tick(1000);
      clockB.tick(5000);
      expect(clockA.elapsedMs).toBe(1000);
      expect(clockB.elapsedMs).toBe(5000);
    });
  });

  describe("toContract()", () => {
    it("returns correct contract shape", () => {
      const clock = new SimulationClock({ mode: "frozen" });
      const contract = clock.toContract();
      expect(contract.mode).toBe("frozen");
      expect(contract.encounterScopedStateIsolation).toBe(true);
    });
  });
});
