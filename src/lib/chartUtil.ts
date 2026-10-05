/** Right-pads a value series with trailing $0s so two schedules of different lengths (e.g. an
 *  original payoff vs. a shorter one from extra payments) can share one chart x-axis - same idea as
 *  a goal balance freezing after its endYear elsewhere in this app, just frozen at $0 instead. */
export function padToLength(values: number[], length: number): number[] {
  if (values.length >= length) {
    return values.slice(0, length);
  }
  return [...values, ...Array(length - values.length).fill(0)];
}
