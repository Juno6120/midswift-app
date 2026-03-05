import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  AlignmentType,
  HeadingLevel,
  PageOrientation,
  VerticalAlign,
  TableLayoutType,
  TextRun,
  BorderStyle,
  VerticalMergeType,
} from "docx";

// I'm setting up a few quick interfaces here to get rid of those 'any' types.
// This helps TypeScript understand exactly what shape our data is in, giving us safer code and better autocomplete.
interface Indicator {
  id: string;
  label: string;
}

interface GenderData {
  m: number;
  f: number;
}

type DataMap = Record<string, Record<string, GenderData>>;

// Here, I'm defining our styling constants at the top so they're incredibly easy to tweak later
// if the client decides they want a different color scheme.
const TITLE_COLOR = "2E4D36";
const HEADER_SHADING = "D0E1D4";
const TOTAL_SHADING = "E9F2EB";
const ZEBRA_SHADING = "F4F9F5";

const THICK_BORDER = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "BDBDBD" };

const NUMERIC_COL_WIDTH = 600;

// I'm using this tiny helper to swap regular spaces with non-breaking spaces.
// It prevents our table row labels from wrapping onto multiple lines awkwardly.
const toSingleLine = (text: string): string =>
  text ? text.replace(/ /g, "\u00A0") : "";

// Just a quick formatter so I can add commas to our larger numbers automatically.
const formatNumber = (num: number): string =>
  num >= 1000 ? num.toLocaleString("en-US") : num.toString();

// I use this function to check if a specific month actually has any male or female data recorded.
// It bails out early if the ID is missing to save us some processing time.
const hasMonthData = (
  indId: string | null,
  month: string,
  dataMap: DataMap,
): boolean => {
  if (!indId) return false;
  const m = dataMap[indId]?.[month]?.m ?? 0;
  const f = dataMap[indId]?.[month]?.f ?? 0;
  return m > 0 || f > 0;
};

type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType];

// Instead of writing the same paragraph setup over and over, I created this base factory.
// It stamps out standardized text blocks with our preferred font and spacing.
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

// I wrote this finder to grab the right indicator ID by matching a label.
// I'm stripping out spaces and dashes so minor typos in the data don't break our matching.
function findIndicatorId(
  indicators: Indicator[],
  searchString: string,
): string | null {
  const normalize = (str: string) => str.replace(/[\s\-–]/g, "").toUpperCase();
  const search = normalize(searchString);
  const found = indicators.find((ind) => normalize(ind.label).includes(search));
  return found ? found.id : null;
}

export async function exportDewormingToWord(
  year: string,
  indicators: Indicator[],
  dataMap: DataMap,
  preparedBy: string,
  brgy: string,
): Promise<Buffer> {
  // I'm defining the exact row labels we expect for each program here.
  const DEWORMING_ROWS = [
    "1 - 19 Y/O GIVEN 2 DOSES",
    "1 - 4 DEWORMED",
    "5 - 9 DEWORMED",
    "10 - 19 DEWORMED",
    "GIVEN 1 DOSE",
  ];

  const VITAMIN_A_ROWS = [
    "6 - 11 MONTHS",
    "12 - 59 MONTHS",
    "NHTS 4P'S",
    "NHTS NON 4P'S",
    "NON NHTS",
  ];

  // This is the heavy lifter. I'm building out chunks of the table dynamically based on
  // the section title, the two comparison months, and the specific row labels.
  const buildSection = (
    sectionTitle: string,
    month1: string,
    month2: string,
    rowLabels: string[],
  ): TableRow[] => {
    const rows: TableRow[] = [];

    // First, I check if either month has any data at all across our specific row labels.
    // This helps me figure out whether to show a zero or a dash later on.
    const month1HasData = rowLabels.some((label) => {
      const id = findIndicatorId(indicators, label);
      return hasMonthData(id, month1, dataMap);
    });

    const month2HasData = rowLabels.some((label) => {
      const id = findIndicatorId(indicators, label);
      return hasMonthData(id, month2, dataMap);
    });

    // Here I'm pushing the very top header row for the section.
    // It spans multiple columns to center the month names nicely.
    rows.push(
      new TableRow({
        tableHeader: true,
        height: { value: 500, rule: "atLeast" },
        children: [
          new TableCell({
            verticalMerge: VerticalMergeType.RESTART,
            children: [baseParagraph(sectionTitle, AlignmentType.CENTER, true)],
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: HEADER_SHADING },
            borders: {
              right: THICK_BORDER,
              bottom: THICK_BORDER,
              top: THICK_BORDER,
              left: THICK_BORDER,
            },
            width: { size: 35, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [baseParagraph(month1, AlignmentType.CENTER, true)],
            columnSpan: 3,
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: HEADER_SHADING },
            borders: {
              right: THICK_BORDER,
              bottom: THICK_BORDER,
              top: THICK_BORDER,
            },
          }),
          new TableCell({
            children: [baseParagraph(month2, AlignmentType.CENTER, true)],
            columnSpan: 3,
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: HEADER_SHADING },
            borders: {
              right: THICK_BORDER,
              bottom: THICK_BORDER,
              top: THICK_BORDER,
            },
          }),
        ],
      }),
    );

    // Next up, I'm adding the sub-header row.
    // This gives us the "M", "F", and "T" columns underneath each month.
    rows.push(
      new TableRow({
        tableHeader: true,
        height: { value: 450, rule: "atLeast" },
        children: [
          new TableCell({
            verticalMerge: VerticalMergeType.CONTINUE,
            children: [],
            shading: { fill: HEADER_SHADING },
            borders: { right: THICK_BORDER, bottom: THICK_BORDER },
          }),
          ...["M", "F", "T", "M", "F", "T"].map(
            (label, idx) =>
              new TableCell({
                children: [baseParagraph(label, AlignmentType.CENTER, true)],
                shading: { fill: HEADER_SHADING },
                borders: {
                  bottom: THICK_BORDER,
                  right: idx === 2 || idx === 5 ? THICK_BORDER : THIN_BORDER,
                },
                width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
              }),
          ),
        ],
      }),
    );

    // Now I loop through the actual data labels to generate the rows.
    rowLabels.forEach((label, rowIdx) => {
      const indId = findIndicatorId(indicators, label);
      // I'm adding a zebra-stripe effect here for readability on every other row.
      const rowFill = rowIdx % 2 === 1 ? ZEBRA_SHADING : undefined;

      const m1_M = indId ? dataMap[indId]?.[month1]?.m || 0 : 0;
      const m1_F = indId ? dataMap[indId]?.[month1]?.f || 0 : 0;
      const m2_M = indId ? dataMap[indId]?.[month2]?.m || 0 : 0;
      const m2_F = indId ? dataMap[indId]?.[month2]?.f || 0 : 0;

      rows.push(
        new TableRow({
          height: { value: 420, rule: "atLeast" },
          children: [
            new TableCell({
              children: [
                baseParagraph(toSingleLine(label), AlignmentType.CENTER, false),
              ],
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: rowFill },
              borders: { right: THICK_BORDER },
            }),
            // I'm processing the first month's data columns.
            ...[m1_M, m1_F, m1_M + m1_F].map((val, idx) => {
              const text =
                val > 0 ? formatNumber(val) : month1HasData ? "0" : "-";

              return new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: idx === 2 ? TOTAL_SHADING : rowFill },
                borders: {
                  right: idx === 2 ? THICK_BORDER : THIN_BORDER,
                },
                children: [
                  baseParagraph(text, AlignmentType.CENTER, idx === 2),
                ],
              });
            }),
            // And now doing the exact same for the second month's data.
            ...[m2_M, m2_F, m2_M + m2_F].map((val, idx) => {
              const text =
                val > 0 ? formatNumber(val) : month2HasData ? "0" : "-";

              return new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: idx === 2 ? TOTAL_SHADING : rowFill },
                borders: {
                  right: idx === 2 ? THICK_BORDER : THIN_BORDER,
                },
                children: [
                  baseParagraph(text, AlignmentType.CENTER, idx === 2),
                ],
              });
            }),
          ],
        }),
      );
    });

    return rows;
  };

  const tableWidthPercent = 90;

  // I'm assembling the final table layout here, dropping in both the Deworming
  // and Vitamin A sections with an invisible row between them acting as a spacer.
  const table = new Table({
    layout: TableLayoutType.AUTOFIT,
    width: { size: tableWidthPercent, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    borders: {
      top: THICK_BORDER,
      bottom: THICK_BORDER,
      left: THICK_BORDER,
      right: THICK_BORDER,
      insideHorizontal: THIN_BORDER,
      insideVertical: THIN_BORDER,
    },
    rows: [
      ...buildSection("DEWORMING PROGRAM", "JANUARY", "JULY", DEWORMING_ROWS),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: "" })],
            columnSpan: 7,
            shading: { fill: "FFFFFF" },
            borders: {
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
            },
          }),
        ],
      }),
      ...buildSection("VITAMIN A PROGRAM", "APRIL", "OCTOBER", VITAMIN_A_ROWS),
    ],
  });

  // I'm calculating the specific offset here so our 'Prepared by' text aligns
  // perfectly with the left edge of our centered 90%-width table.
  const leftMarginTwips = 500;
  const pageWidthTwips = 15840;
  const usableWidth = pageWidthTwips - leftMarginTwips * 2;
  const tableWidthTwips = (usableWidth * tableWidthPercent) / 100;
  const offsetFromMargin = (usableWidth - tableWidthTwips) / 2;

  // Finally, I'm generating the actual document structure.
  // Setting the page to landscape, slapping our main title on top, dropping the table in,
  // and signing it off nicely at the bottom.
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
          new Paragraph({
            children: [
              new TextRun({
                text: `BARANGAY ${brgy.toUpperCase()} - DEWORMING & VITAMIN A REPORT ${year}`,
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

          new Paragraph({
            indent: { left: Math.round(offsetFromMargin) },
            children: [new TextRun({ text: "Prepared by:", font: "Calibri" })],
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            indent: { left: Math.round(offsetFromMargin) },
            children: [
              new TextRun({
                text: preparedBy.toUpperCase(),
                bold: true,
                font: "Calibri",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
