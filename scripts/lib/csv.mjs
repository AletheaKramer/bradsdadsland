export const parseCsv = (input, delimiter = ",") => {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : String(input || "");
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const separator = String(delimiter || ",").slice(0, 1);

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === separator) {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (quoted) throw new Error("Malformed CSV: unterminated quoted field.");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((current) =>
    current.some((cell) => String(cell || "").trim())
  );
};

export const normalizeHeader = (value) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}#/%]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const rowsToObjects = (values) => {
  const [headers = [], ...rows] = values;
  return rows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [String(header || "").trim(), row[index] ?? ""])
    )
  );
};

export const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (!/[",\n\r]/.test(stringValue)) return stringValue;
  return `"${stringValue.replaceAll('"', '""')}"`;
};

export const stringifyCsv = (rows) =>
  rows.map((row) => row.map(csvEscape).join(",")).join("\n");
