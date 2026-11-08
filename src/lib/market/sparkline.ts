/** SVG path for a sparkline. Pure and tiny so it can render on the server and in chips. */
export function sparklinePath(values: readonly number[], width: number, height: number, pad = 1): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (height - pad * 2) * (1 - (v - min) / span);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
}

export function trend(values: readonly number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  const first = values[0] as number;
  const last = values[values.length - 1] as number;
  return last > first ? "up" : last < first ? "down" : "flat";
}
