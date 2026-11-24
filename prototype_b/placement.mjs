// Device-independent placement. Feed null only for a confirmed empty region;
// undefined marks a frame whose contents could not be observed.
export function createPlacementController({
  commit,
  stableMs = 2000,
  removeMs = 300,
  tolerance = 0.35,
} = {}) {
  if (typeof commit !== 'function') throw new TypeError('commit must be a function');
  for (const [name, value] of Object.entries({ stableMs, removeMs, tolerance })) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(name + ' must be positive and finite');
  }

  let lastTime = -Infinity;
  let emptySince = null;
  let anchor = null;
  let stableSince = null;
  let placed = false;
  let blocked = null;

  const copy = ({ x, z }) => ({ x, z });
  const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) <= tolerance;
  const result = (phase, point = null, progress = 0, reason = null) => ({
    phase, point: point && copy(point), progress, reason,
  });

  function resetCandidate() {
    anchor = stableSince = null;
  }

  function sample(point, timeMs) {
    if (!Number.isFinite(timeMs) || timeMs < lastTime) {
      throw new RangeError('sample timestamp must be finite and nondecreasing');
    }
    if (point != null && (!Number.isFinite(point.x) || !Number.isFinite(point.z))) {
      throw new TypeError('sample point must have finite x and z');
    }
    lastTime = timeMs;

    if (point === undefined) {
      // A camera error or low-confidence frame cannot confirm removal or stability.
      resetCandidate();
      emptySince = null;
      return placed ? result('placed', null, 1)
        : blocked ? result('blocked', null, 0, blocked.reason) : result('empty');
    }
    if (point === null) {
      resetCandidate();
      emptySince ??= timeMs;
      if (timeMs - emptySince >= removeMs) {
        placed = false;
        blocked = null;
      }
      return placed ? result('placed', null, 1)
        : blocked ? result('blocked', null, 0, blocked.reason) : result('empty');
    }

    emptySince = null;
    if (placed) return result('placed', point, 1);
    if (blocked) {
      if (near(point, blocked.point)) return result('blocked', point, 1, blocked.reason);
      // Require a complete new stable interval at a clearly different position.
      blocked = null;
      resetCandidate();
    }
    if (!anchor || !near(point, anchor)) {
      anchor = copy(point);
      stableSince = timeMs;
    }
    const elapsed = timeMs - stableSince;
    if (elapsed < stableMs) return result('settling', point, elapsed / stableMs);

    const position = copy(point);
    let reason;
    try {
      const decision = commit(copy(position));
      if (decision?.ok === true) {
        placed = true;
        resetCandidate();
        return result('placed', position, 1);
      }
      reason = typeof decision?.reason === 'string' && decision.reason.trim()
        ? decision.reason : '这里暂时不能放置。';
    } catch (error) {
      reason = error instanceof Error && error.message
        ? error.message : '放置未完成。';
    }
    blocked = { point: position, reason };
    resetCandidate();
    return result('blocked', position, 1, reason);
  }

  return { sample };
}
