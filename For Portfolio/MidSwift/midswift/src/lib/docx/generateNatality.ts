import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  PageOrientation,
  VerticalAlign,
  BorderStyle,
  HeadingLevel,
  TableLayoutType,
} from "docx";

// I'm setting up our color palette and borders up top so we don't have magic strings and objects floating around the code.
// If we ever need to change the theme, we just do it here.
const TITLE_COLOR = "2E4D36";
const HEADER_SHADING = "D0E1D4";
const TOTAL_SHADING = "FFF2CC";
const ZEBRA_SHADING = "F4F9F5";

const THICK_BORDER = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "BDBDBD" };

// Here I'm defining our structural constants to guarantee the rows and columns always output in the exact same order.
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

const COLUMN_ORDER = [
  "NO. OF LB",
  "MD",
  "RN",
  "RHM",
  "HILOT",
  "RHU",
  "BMONC OTHERS",
  "PRIV. L-IN",
  "CNPH",
  "LDH",
  "PRIV. HOSP.",
  "HOME",
  ">2500",
  "<2500",
  "Unknown",
  "LB",
  "FD",
  "AB",
  "NSD",
  "CS",
];

// I use this array to know exactly which columns need a thick right border to separate our major sections.
const SECTION_END_INDEXES = [0, 4, 11, 14, 17, 19];

type AlignmentValue = (typeof AlignmentType)[keyof typeof AlignmentType];

// I added these interfaces to replace the `any` types we had before.
// Now TypeScript will actually help us catch typos when we pass data into our main function!
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

// I'm defining a custom type for our TextRun options so we can drop the `any` type later in the paragraph helper.
interface CustomRunOpts {
  text: string;
  bold: boolean;
  font: string;
  size: number;
  break?: number;
}

// Just a quick helper to make sure our numbers get those nice, readable commas.
const formatNumber = (num: number) => num.toLocaleString("en-US");

// I built this paragraph helper because Word doesn't handle text-wrapping inside tight table cells very well.
const baseParagraph = (
  text: string,
  align: AlignmentValue = AlignmentType.CENTER,
  bold: boolean = false,
  isHeader: boolean = false,
) => {
  let displayText = text;

  // I'm manually inserting line breaks for a couple of specific headers so they stack nicely in the column.
  if (text === "BMONC OTHERS") {
    displayText = "BMONC\nOTHERS";
  } else if (text === "PRIV. HOSP.") {
    displayText = "PRIV.\nHOSP.";
  }

  // Word loves to aggressively wrap text on spaces and hyphens.
  // I'm preventing that by replacing them with their non-breaking Unicode equivalents.
  const unbreakableText = displayText
    .replace(/ /g, "\u00A0")
    .replace(/-/g, "\u2011");

  // Here, I'm mimicking a "shrink to fit" feature.
  // Depending on how long the text is, I scale the font down so it doesn't overflow the cell boundaries.
  let fontSize = 16;
  if (isHeader) {
    fontSize = 14;
  } else {
    if (text.length > 18) {
      fontSize = 10;
    } else if (text.length > 13) {
      fontSize = 12;
    } else if (text.length > 8) {
      fontSize = 14;
    }
  }

  // Because docx requires explicit breaks for newlines, I'm splitting our text and creating a new TextRun for each line.
  const textRuns = unbreakableText.split("\n").map((line, index) => {
    const runOpts: CustomRunOpts = {
      text: line,
      bold,
      font: "Calibri",
      size: fontSize,
    };

    // I only apply the break if it's not the first line, otherwise we get weird top-spacing.
    if (index > 0) {
      runOpts.break = 1;
    }
    return new TextRun(runOpts);
  });

  return new Paragraph({
    alignment: align,
    spacing: { before: 40, after: 40 },
    children: textRuns,
  });
};

// I created this wrapper around TableCell to cut down on massive amounts of boilerplate.
// Instead of defining margins, vertical alignment, and complex borders every time, we just pass in simple config options.
function createCell(
  text: string,
  opts?: {
    colSpan?: number;
    rowSpan?: number;
    bold?: boolean;
    bg?: string;
    align?: AlignmentValue;
    thickTop?: boolean;
    thickBottom?: boolean;
    thickLeft?: boolean;
    thickRight?: boolean;
    isHeader?: boolean;
  },
) {
  return new TableCell({
    columnSpan: opts?.colSpan || 1,
    rowSpan: opts?.rowSpan || 1,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    shading: opts?.bg ? { fill: opts.bg } : undefined,
    borders: {
      top: opts?.thickTop ? THICK_BORDER : THIN_BORDER,
      bottom: opts?.thickBottom ? THICK_BORDER : THIN_BORDER,
      left: opts?.thickLeft ? THICK_BORDER : THIN_BORDER,
      right: opts?.thickRight ? THICK_BORDER : THIN_BORDER,
    },
    children: [
      baseParagraph(
        text,
        opts?.align ?? AlignmentType.CENTER,
        opts?.bold,
        opts?.isHeader,
      ),
    ],
  });
}

// This is the main function that pulls everything together and spits out our Word document buffer.
export async function exportNatalityToWord(
  year: string,
  indicators: Indicator[],
  entries: ReportEntry[],
  reportMonthMap: Record<string, string>,
  preparedBy: string,
  brgy: string,
): Promise<Buffer> {
  // First, I need a place to store our aggregated data, broken down by month, column label, and gender.
  const dataByMonth: Record<
    string,
    Record<string, { m: number; f: number }>
  > = {};

  // I'm setting up a lookup dictionary so I can easily grab the indicator name using its ID later.
  const idToLabelMap: Record<string, string> = {};

  // I'll also need to keep track of the grand totals for the very bottom row of the table.
  const columnGrandTotals: Record<string, { m: number; f: number }> = {};
  COLUMN_ORDER.forEach((label) => {
    columnGrandTotals[label] = { m: 0, f: 0 };
  });

  // Here I'm pre-filling our data object with zeroes for every single month and column.
  // This ensures our table won't crash if a month is totally missing from the database.
  MONTHS.forEach((month) => {
    dataByMonth[month] = {};
    COLUMN_ORDER.forEach((label) => {
      dataByMonth[month][label] = { m: 0, f: 0 };
    });
  });

  // Populating my indicator lookup map.
  indicators.forEach((ind) => {
    idToLabelMap[ind.id] = ind.label;
  });

  // Now I'm looping through every entry to tally up our male and female values.
  entries.forEach((e) => {
    const month = reportMonthMap[e.report_id];
    const label = idToLabelMap[e.indicator_id];

    if (month && label && dataByMonth[month]?.[label]) {
      const mVal = e.value_m || 0;
      const fVal = e.value_f || 0;

      dataByMonth[month][label].m += mVal;
      dataByMonth[month][label].f += fVal;

      columnGrandTotals[label].m += mVal;
      columnGrandTotals[label].f += fVal;
    }
  });

  // I want to know if a month actually has any data at all, so I can display dashes ("-") for empty months.
  const monthHasAnyData: Record<string, boolean> = {};
  MONTHS.forEach((month) => {
    monthHasAnyData[month] = COLUMN_ORDER.some((label) => {
      const val = dataByMonth[month][label];
      return val.m > 0 || val.f > 0;
    });
  });

  // Time to build the table!
  // I'm starting with the topmost header row. Notice how I'm using column spans to group our sub-categories together.
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      createCell("MONTHS", {
        rowSpan: 3,
        bold: true,
        bg: HEADER_SHADING,
        thickTop: true,
        thickLeft: true,
        thickRight: true,
        isHeader: true,
      }),
      createCell("GENERAL", {
        colSpan: 2,
        bold: true,
        bg: HEADER_SHADING,
        thickTop: true,
        thickRight: true,
        isHeader: true,
      }),
      createCell("ATTENDANT AT BIRTH", {
        colSpan: 8,
        bold: true,
        bg: HEADER_SHADING,
        thickTop: true,
        thickRight: true,
        isHeader: true,
      }),
      createCell("PLACE OF BIRTH", {
        colSpan: 14,
        bold: true,
        bg: HEADER_SHADING,
        thickTop: true,
        thickRight: true,
        isHeader: true,
      }),
      createCell("BIRTH WEIGHT", {
        colSpan: 6,
        bold: true,
        bg: HEADER_SHADING,
        thickTop: true,
        thickRight: true,
        isHeader: true,
      }),
      createCell("PREGNANCY OUTCOME", {
        colSpan: 6,
        bold: true,
        bg: HEADER_SHADING,
        thickTop: true,
        thickRight: true,
        isHeader: true,
      }),
      createCell("DELIVERY TYPE", {
        colSpan: 4,
        bold: true,
        bg: HEADER_SHADING,
        thickTop: true,
        thickRight: true,
        isHeader: true,
      }),
      createCell("TOTAL", {
        colSpan: 2,
        rowSpan: 2,
        bold: true,
        bg: HEADER_SHADING,
        thickTop: true,
        thickRight: true,
        isHeader: true,
      }),
    ],
  });

  // This is the second header tier where the specific indicator names are listed.
  const headerRow2 = new TableRow({
    tableHeader: true,
    children: COLUMN_ORDER.map((label, index) =>
      createCell(label, {
        colSpan: 2,
        bold: true,
        bg: HEADER_SHADING,
        thickRight: SECTION_END_INDEXES.includes(index),
        isHeader: true,
      }),
    ),
  });

  // The third header tier splits everything into Male (M) and Female (F) columns.
  const headerRow3 = new TableRow({
    tableHeader: true,
    children: [
      ...COLUMN_ORDER.flatMap((_, index) => [
        createCell("M", {
          bg: HEADER_SHADING,
          isHeader: true,
        }),
        createCell("F", {
          bg: HEADER_SHADING,
          thickRight: SECTION_END_INDEXES.includes(index),
          isHeader: true,
        }),
      ]),
      createCell("M", { bg: HEADER_SHADING, isHeader: true }),
      createCell("F", { bg: HEADER_SHADING, thickRight: true, isHeader: true }),
    ],
  });

  // I'm declaring these right before the loop to accumulate our total M/F sums across the entire year.
  let grandTotalM = 0;
  let grandTotalF = 0;

  // Now I'm generating the actual data rows. I iterate over every single month...
  const dataRows = MONTHS.map((month, idx) => {
    // I apply a zebra-striping effect to alternating rows to make the table easier to read across the page.
    const zebra = idx % 2 === 1 ? ZEBRA_SHADING : undefined;
    const hasData = monthHasAnyData[month];

    const rowCells = [
      createCell(month, {
        bold: true,
        bg: zebra,
        thickLeft: true,
        thickRight: true,
        align: AlignmentType.CENTER,
        isHeader: true,
      }),
    ];

    let rowTotalM = 0;
    let rowTotalF = 0;

    // ...and then I iterate through every column in that month to output the values.
    COLUMN_ORDER.forEach((label, index) => {
      const val = dataByMonth[month][label];

      // If the month is empty, I'm dropping in a dash. Otherwise, I format the number nicely.
      const mDisplay = hasData ? formatNumber(val.m) : "-";
      const fDisplay = hasData ? formatNumber(val.f) : "-";

      rowCells.push(createCell(mDisplay, { bg: zebra, isHeader: true }));
      rowCells.push(
        createCell(fDisplay, {
          bg: zebra,
          thickRight: SECTION_END_INDEXES.includes(index),
          isHeader: true,
        }),
      );

      rowTotalM += val.m;
      rowTotalF += val.f;
    });

    // Don't forget the horizontal totals for the current month row!
    rowCells.push(
      createCell(formatNumber(rowTotalM), {
        bg: TOTAL_SHADING,
        isHeader: true,
      }),
    );
    rowCells.push(
      createCell(formatNumber(rowTotalF), {
        bg: TOTAL_SHADING,
        thickRight: true,
        isHeader: true,
      }),
    );

    // I add this month's totals to the year-long grand totals before moving on.
    grandTotalM += rowTotalM;
    grandTotalF += rowTotalF;

    return new TableRow({
      cantSplit: true,
      children: rowCells,
    });
  });

  // Finally, I'm constructing the very bottom row that summarizes everything.
  const grandTotalRow = new TableRow({
    cantSplit: true,
    children: [
      createCell("GRAND TOTAL", {
        bold: true,
        bg: TOTAL_SHADING,
        thickLeft: true,
        thickBottom: true,
        thickRight: true,
        align: AlignmentType.CENTER,
        isHeader: true,
      }),
      ...COLUMN_ORDER.flatMap((label, index) => {
        const col = columnGrandTotals[label];
        return [
          createCell(formatNumber(col.m), {
            bg: TOTAL_SHADING,
            thickBottom: true,
            isHeader: true,
          }),
          createCell(formatNumber(col.f), {
            bg: TOTAL_SHADING,
            thickRight: SECTION_END_INDEXES.includes(index),
            thickBottom: true,
            isHeader: true,
          }),
        ];
      }),
      createCell(formatNumber(grandTotalM), {
        bold: true,
        bg: TOTAL_SHADING,
        thickBottom: true,
        isHeader: true,
      }),
      createCell(formatNumber(grandTotalF), {
        bold: true,
        bg: TOTAL_SHADING,
        thickRight: true,
        thickBottom: true,
        isHeader: true,
      }),
    ],
  });

  // Here is where I assemble the table. I'm hardcoding the column widths to keep things rigid and uniform.
  const table = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1000, ...Array(42).fill(327)],
    borders: {
      top: THICK_BORDER,
      bottom: THICK_BORDER,
      left: THICK_BORDER,
      right: THICK_BORDER,
      insideHorizontal: THIN_BORDER,
      insideVertical: THIN_BORDER,
    },
    rows: [headerRow1, headerRow2, headerRow3, ...dataRows, grandTotalRow],
  });

  // Now I take that table and drop it into a landscape Word Document along with the titles and signatures.
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
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: `BARANGAY ${brgy.toUpperCase()} - NATALITY REPORT ${year}`,
                bold: true,
                size: 28,
                font: "Calibri",
                color: TITLE_COLOR,
              }),
            ],
          }),
          table,
          new Paragraph({ text: "", spacing: { after: 300 } }),
          new Paragraph({
            children: [new TextRun({ text: "Prepared by:", font: "Calibri" })],
          }),
          new Paragraph({
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

  // Done! I package it all up into a Buffer and send it back out.
  return await Packer.toBuffer(doc);
}
