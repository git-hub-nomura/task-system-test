/** snake_case キーを camelCase に変換 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** オブジェクトのキーを snake_case → camelCase に変換 */
export function keysToCamel<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[toCamelCase(key)] = value;
  }
  return result as T;
}

/** 配列内の全オブジェクトのキーを変換 */
export function rowsToCamel<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => keysToCamel<T>(row));
}
