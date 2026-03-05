import {
  Packer,
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  PageOrientation,
  VerticalMergeType,
  VerticalAlign,
  TableLayoutType,
  TextRun,
  BorderStyle,
} from "docx";

// I'm defining the shape of the data used for each row in the table so TypeScript can catch any missing properties.
export interface BCGRowData {
  label: string;
  monthlyData: { m: number; f: number }[];
  totalM: number;
  totalF: number;
}

// I'm setting up strict interfaces for the raw data coming in, replacing the old `any` types.
// This makes the code much safer and gives us great autocomplete.
export interface Indicator {
  id: string;
  label: string;
}

export interface ReportEntry {
  report_id: string;
  indicator_id: string;
  value_m?: number | null;
  value_f?: number | null;
}

// I'm hardcoding the months here because this list will never change, and it gives me a reliable array to loop over later.
const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

const NUMERIC_COL_WIDTH = 450;

// I'm extracting all my color hex codes into constants.
// It keeps the visual theme consistent and makes it much easier to change the palette later if I need to.
const TITLE_COLOR = "2E4D36";
const HEADER_SHADING = "D0E1D4";
const TOTAL_SHADING = "E9F2EB";
const ZEBRA_SHADING = "F4F9F5";

// I'm defining my border styles here so I don't have to rewrite this object every single time I style a table cell.
const THICK_BORDER = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "BDBDBD" };

// I use this tiny helper to replace standard spaces with non-breaking spaces, which stops text from wrapping awkwardly in the Word doc.
const toSingleLine = (text: string) =>
  text ? text.replace(/ /g, "\u00A0") : "";

// This helper just formats my numbers with commas (e.g., 1,000 instead of 1000) for better readability.
const formatNum = (num: number) => num.toLocaleString("en-US");
type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType];

// I built this helper function because creating paragraphs in 'docx' requires a lot of boilerplate.
// Notice I replaced the old `any` type with `AlignmentType` from the docx library for better type safety!
const baseParagraph = (
  text: string,
  align: Alignment = AlignmentType.LEFT,
  bold: boolean = false,
) =>
  new Paragraph({
    children: [new TextRun({ text, bold, font: "Calibri" })],
    alignment: align,
    spacing: { before: 0, after: 0 },
    indent: { left: 0, right: 0, firstLine: 0 },
  });

// This is the main workhorse function where I actually generate the Word document.
export async function exportBCGToWord(
  year: string,
  indicators: Indicator[],
  entries: ReportEntry[],
  reportMonthMap: Record<string, string>,
  preparedBy: string,
  brgy: string,
): Promise<Buffer> {
  // First, I'm setting up a dictionary to group all my entries by their indicator ID, and then by month.
  const dataMap: Record<string, Record<string, { m: number; f: number }>> = {};

  indicators.forEach((ind) => {
    dataMap[ind.id] = {};
  });

  // Now I'm looping through the raw entries to populate my dictionary.
  // I also make sure to default missing values to 0 so I don't hit any `NaN` math errors later.
  entries.forEach((e) => {
    const month = reportMonthMap[e.report_id];
    if (month && dataMap[e.indicator_id]) {
      dataMap[e.indicator_id][month] = { m: e.value_m || 0, f: e.value_f || 0 };
    }
  });

  // I need to keep track of the bottom-line totals for each column, so I'm initializing an array of zeroes for each month.
  const colTotals = MONTHS.map(() => ({ m: 0, f: 0 }));
  let grandTotalM = 0;
  let grandTotalF = 0;

  // Here I'm transforming my dictionary into a clean array of row data that the table can easily map over.
  const rows = indicators.map((ind) => {
    const monthlyData = MONTHS.map((month, index) => {
      const data = dataMap[ind.id][month] || { m: 0, f: 0 };

      // I'm adding to my running column totals as I process each piece of data.
      colTotals[index].m += data.m;
      colTotals[index].f += data.f;

      return data;
    });

    // I'm calculating the horizontal totals (for the whole year) for this specific indicator.
    const totalM = monthlyData.reduce((sum, d) => sum + d.m, 0);
    const totalF = monthlyData.reduce((sum, d) => sum + d.f, 0);

    // I also need to update the grand totals for the very bottom right of the table.
    grandTotalM += totalM;
    grandTotalF += totalF;

    return { label: ind.label, monthlyData, totalM, totalF };
  });

  // Now I'm finally building the layout of the table using the `docx` components.
  const table = new Table({
    layout: TableLayoutType.AUTOFIT,
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 150, bottom: 150, left: 100, right: 100 },
    borders: {
      top: THICK_BORDER,
      bottom: THICK_BORDER,
      left: THICK_BORDER,
      right: THICK_BORDER,
      insideHorizontal: THIN_BORDER,
      insideVertical: THIN_BORDER,
    },
    rows: [
      // This is the first header row. It spans across columns to show the months and the "TOTAL" label.
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            verticalMerge: VerticalMergeType.RESTART,
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: HEADER_SHADING },
            borders: {
              right: THICK_BORDER,
              bottom: THICK_BORDER,
              top: THICK_BORDER,
              left: THICK_BORDER,
            },
            children: [
              baseParagraph("PROGRAM INDICATORS", AlignmentType.LEFT, true),
            ],
          }),

          // I'm mapping over my MONTHS constant to dynamically generate the top-level headers.
          ...MONTHS.map(
            (month) =>
              new TableCell({
                columnSpan: 2,
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: HEADER_SHADING },
                borders: {
                  right: THICK_BORDER,
                  bottom: THICK_BORDER,
                  top: THICK_BORDER,
                },
                children: [
                  baseParagraph(
                    month.substring(0, 3),
                    AlignmentType.CENTER,
                    true,
                  ),
                ],
              }),
          ),

          new TableCell({
            columnSpan: 2,
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: HEADER_SHADING },
            borders: {
              bottom: THICK_BORDER,
              top: THICK_BORDER,
              right: THICK_BORDER,
            },
            children: [baseParagraph("TOTAL", AlignmentType.CENTER, true)],
          }),
        ],
      }),

      // This is the second header row. It splits each month (and the total column) into Male ("M") and Female ("F") sub-columns.
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            verticalMerge: VerticalMergeType.CONTINUE,
            shading: { fill: HEADER_SHADING },
            borders: { right: THICK_BORDER, bottom: THICK_BORDER },
            children: [],
          }),

          // I'm using `flatMap` here because for every single month, I need to generate TWO distinct table cells (M and F).
          ...MONTHS.flatMap(() => [
            new TableCell({
              shading: { fill: HEADER_SHADING },
              borders: { bottom: THICK_BORDER },
              width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
              children: [baseParagraph("M", AlignmentType.CENTER, true)],
            }),
            new TableCell({
              shading: { fill: HEADER_SHADING },
              borders: { right: THICK_BORDER, bottom: THICK_BORDER },
              width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
              children: [baseParagraph("F", AlignmentType.CENTER, true)],
            }),
          ]),

          new TableCell({
            shading: { fill: HEADER_SHADING },
            borders: { bottom: THICK_BORDER },
            width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
            children: [baseParagraph("M", AlignmentType.CENTER, true)],
          }),
          new TableCell({
            shading: { fill: HEADER_SHADING },
            borders: { bottom: THICK_BORDER, right: THICK_BORDER },
            width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
            children: [baseParagraph("F", AlignmentType.CENTER, true)],
          }),
        ],
      }),

      // Here I'm finally mapping over the processed data rows to populate the body of the table.
      ...rows.map((row, rowIdx) => {
        // I apply a zebra-striping effect based on whether the row index is odd or even to make the data easier to read.
        const rowFill = rowIdx % 2 === 1 ? ZEBRA_SHADING : undefined;

        return new TableRow({
          children: [
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: rowFill },
              borders: { right: THICK_BORDER },
              children: [
                baseParagraph(
                  toSingleLine(row.label || "Unknown"),
                  AlignmentType.LEFT,
                ),
              ],
            }),

            // Just like the headers, I'm generating two cells (M and F) for every month of data in this specific row.
            ...row.monthlyData.flatMap((d, idx) => {
              // I'm checking if there's any data at all for this month to decide if I should show a "0" or just a dash "-".
              const monthHasData = colTotals[idx].m + colTotals[idx].f > 0;

              return [
                new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  shading: { fill: rowFill },
                  width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
                  children: [
                    baseParagraph(
                      d.m > 0 ? formatNum(d.m) : monthHasData ? "0" : "-",
                      AlignmentType.CENTER,
                    ),
                  ],
                }),
                new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  shading: { fill: rowFill },
                  borders: { right: THICK_BORDER },
                  width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
                  children: [
                    baseParagraph(
                      d.f > 0 ? formatNum(d.f) : monthHasData ? "0" : "-",
                      AlignmentType.CENTER,
                    ),
                  ],
                }),
              ];
            }),

            // These are the end-of-row total cells. I apply a separate TOTAL_SHADING so they stand out from the raw data.
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: TOTAL_SHADING },
              width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
              children: [
                baseParagraph(
                  row.totalM > 0
                    ? formatNum(row.totalM)
                    : grandTotalM + grandTotalF > 0
                      ? "0"
                      : "-",
                  AlignmentType.CENTER,
                  true,
                ),
              ],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: TOTAL_SHADING },
              width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
              children: [
                baseParagraph(
                  row.totalF > 0
                    ? formatNum(row.totalF)
                    : grandTotalM + grandTotalF > 0
                      ? "0"
                      : "-",
                  AlignmentType.CENTER,
                  true,
                ),
              ],
            }),
          ],
        });
      }),
    ],
  });

  // Now I'm assembling the final document container, pushing it into landscape mode to fit the wide table.
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, right: 500, bottom: 720, left: 500 },
          },
        },
        children: [
          // This is the big, bold title at the very top of the page.
          new Paragraph({
            children: [
              new TextRun({
                text: `BARANGAY ${brgy.toUpperCase()} - BCG/HEPA B REPORT ${year}`,
                bold: true,
                size: 28,
                font: "Calibri",
                color: TITLE_COLOR,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          table,

          new Paragraph({ text: "", spacing: { after: 300 } }),

          // Finally, I'm appending the signature block at the bottom so we know who prepared the report.
          new Paragraph({
            children: [new TextRun({ text: "Prepared by:", font: "Calibri" })],
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: preparedBy.toUpperCase(),
                bold: true,
                font: "Calibri",
              }),
            ],
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  // I'm returning the fully constructed Word document as a Buffer so the server can send it to the client for download.
  return await Packer.toBuffer(doc);
}
