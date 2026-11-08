const sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown"];

/** Each key must arrive within one second of the previous key. */
export function createDemoResetSequence() {
  let keys: string[] = [];
  let previous = -Infinity;
  return (key: string, now: number) => {
    if (now - previous > 1000) keys = [];
    previous = now;
    keys = [...keys, key].slice(-sequence.length);
    const complete = sequence.every(
      (expected, index) => keys[index] === expected,
    );
    if (complete) keys = [];
    return complete;
  };
}
