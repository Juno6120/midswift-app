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
} from "docx";

// I like to keep my reference arrays and styling constants up top.
// It makes them super easy to find and tweak later if the design requirements change.
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
const MONTH_COL_WIDTH = 1100;

const TITLE_COLOR = "2E4D36";
const HEADER_SHADING = "D0E1D4";
const TOTAL_SHADING = "E9F2EB";
const ZEBRA_SHADING = "F4F9F5";

const THICK_BORDER = { style: BorderStyle.SINGLE, size: 8, color: "000000" };
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "BDBDBD" };

// I'm setting up some explicit interfaces here so we can drop the 'any' types.
// This way, TypeScript will actually have our backs and warn us if we pass in the wrong data shape.
export interface Indicator {
  id: string;
  label: string;
}

export interface GenderData {
  m?: number;
  f?: number;
}

export interface MonthlyData {
  [month: string]: GenderData;
}

export interface DataMap {
  [indicatorId: string]: MonthlyData;
}

type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType];

// I built this little helper function to quickly stamp out standard paragraphs.
// It saves me from writing the exact same Calibri text configuration a hundred times throughout the file.
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

// This is the main engine of our module. I'm passing in our newly minted types for safety!
export async function exportTeenagePregnancyToWord(
  year: string,
  indicators: Indicator[],
  dataMap: DataMap,
  preparedBy: string,
  brgy: string,
) {
  // First things first, I'm checking if we got any specific indicators passed in.
  // If the array is empty or missing, I'm falling back to a default list so the table doesn't break.
  const orderedInds =
    indicators && indicators.length > 0
      ? indicators
      : [
          { id: "1", label: "POP." },
          { id: "2", label: "PREG." },
          { id: "3", label: "TOTAL DEL" },
          { id: "4", label: "PRE-NATAL (1ST TRI)" },
          { id: "5", label: "POST-NATAL" },
        ];

  // I need to keep track of the grand totals for both male and female columns as we loop through the data.
  // I'm setting up a couple of arrays filled with zeros to act as our starting counters.
  const totalsM = new Array(orderedInds.length).fill(0);
  const totalsF = new Array(orderedInds.length).fill(0);

  // Now I'm scaffolding out the main table. I want it to be 100% width and feature some nice custom borders.
  const table = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    borders: {
      top: THICK_BORDER,
      bottom: THICK_BORDER,
      left: THICK_BORDER,
      right: THICK_BORDER,
      insideHorizontal: THIN_BORDER,
      insideVertical: THIN_BORDER,
    },
    rows: [
      // This is the very first row of our table header.
      // I'm using rowSpans and colSpans to neatly group the columns into our two main age brackets.
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            rowSpan: 2,
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: HEADER_SHADING },
            width: { size: MONTH_COL_WIDTH, type: WidthType.DXA },
            borders: { right: THICK_BORDER, bottom: THICK_BORDER },
            children: [baseParagraph("MONTHS", AlignmentType.CENTER, true)],
          }),
          new TableCell({
            columnSpan: orderedInds.length,
            shading: { fill: HEADER_SHADING },
            borders: {
              left: THICK_BORDER,
              right: THICK_BORDER,
              bottom: THICK_BORDER,
            },
            children: [
              baseParagraph("AGES 10 - 14 Y/O", AlignmentType.CENTER, true),
            ],
          }),
          new TableCell({
            columnSpan: orderedInds.length,
            shading: { fill: HEADER_SHADING },
            borders: {
              left: THICK_BORDER,
              right: THICK_BORDER,
              bottom: THICK_BORDER,
            },
            children: [
              baseParagraph("AGES 15 - 19 Y/O", AlignmentType.CENTER, true),
            ],
          }),
        ],
      }),

      // For the second header row, I'm just iterating through our indicators array twice:
      // once for the younger age group, and once for the older age group.
      new TableRow({
        tableHeader: true,
        children: [
          ...orderedInds.map(
            (ind, idx) =>
              new TableCell({
                shading: { fill: HEADER_SHADING },
                width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
                borders: {
                  left: idx === 0 ? THICK_BORDER : undefined,
                  right:
                    idx === orderedInds.length - 1 ? THICK_BORDER : undefined,
                },
                children: [
                  baseParagraph(ind.label, AlignmentType.CENTER, true),
                ],
              }),
          ),
          ...orderedInds.map(
            (ind, idx) =>
              new TableCell({
                shading: { fill: HEADER_SHADING },
                width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
                borders: {
                  left: idx === 0 ? THICK_BORDER : undefined,
                  right:
                    idx === orderedInds.length - 1 ? THICK_BORDER : undefined,
                },
                children: [
                  baseParagraph(ind.label, AlignmentType.CENTER, true),
                ],
              }),
          ),
        ],
      }),

      // Now for the real data! I'm mapping over each month to generate the table rows.
      ...MONTHS.map((month, rowIdx) => {
        // I'm throwing in a subtle zebra-stripe shading on alternate rows just to make the table easier to read.
        const rowFill = rowIdx % 2 === 1 ? ZEBRA_SHADING : undefined;

        // Here, I'm checking if this entire month row has at least ONE recorded value across all indicators.
        // This helps us decide if empty cells should be a '0' (data was tracked) or a '-' (no data yet).
        const hasDataForMonth = orderedInds.some(
          (ind) =>
            (dataMap[ind.id]?.[month]?.m || 0) > 0 ||
            (dataMap[ind.id]?.[month]?.f || 0) > 0,
        );

        // I'm starting off the row with the month name cell.
        const cells = [
          new TableCell({
            shading: { fill: rowFill },
            width: { size: MONTH_COL_WIDTH, type: WidthType.DXA },
            borders: { right: THICK_BORDER },
            children: [baseParagraph(month, AlignmentType.LEFT)],
          }),
        ];

        // Let's dig into our data map to grab the male counts.
        // I'm also adding this value to my running male total!
        orderedInds.forEach((ind, idx) => {
          const val = dataMap[ind.id]?.[month]?.m || 0;
          totalsM[idx] += val;

          // I'm using toLocaleString('en-US') here to automatically format 4+ digit numbers with commas!
          const displayVal =
            val > 0 ? val.toLocaleString("en-US") : hasDataForMonth ? "0" : "-";

          cells.push(
            new TableCell({
              shading: { fill: rowFill },
              width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
              borders: {
                left: idx === 0 ? THICK_BORDER : undefined,
                right:
                  idx === orderedInds.length - 1 ? THICK_BORDER : undefined,
              },
              children: [baseParagraph(displayVal, AlignmentType.CENTER)],
            }),
          );
        });

        // Now I'm doing the exact same thing, but for the female counts and the female running total.
        orderedInds.forEach((ind, idx) => {
          const val = dataMap[ind.id]?.[month]?.f || 0;
          totalsF[idx] += val;

          // Same logic: add commas for large numbers, use '0' if the month has data, otherwise '-'
          const displayVal =
            val > 0 ? val.toLocaleString("en-US") : hasDataForMonth ? "0" : "-";

          cells.push(
            new TableCell({
              shading: { fill: rowFill },
              width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
              borders: {
                left: idx === 0 ? THICK_BORDER : undefined,
                right:
                  idx === orderedInds.length - 1 ? THICK_BORDER : undefined,
              },
              children: [baseParagraph(displayVal, AlignmentType.CENTER)],
            }),
          );
        });

        return new TableRow({ children: cells });
      }),

      // After looping through all the months, I'm slapping one final row at the bottom to show our grand totals.
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: TOTAL_SHADING },
            width: { size: MONTH_COL_WIDTH, type: WidthType.DXA },
            borders: { right: THICK_BORDER },
            children: [baseParagraph("TOTAL", AlignmentType.CENTER, true)],
          }),
          // I'm formatting the totals with commas too, and defaulting to "0" if the total is somehow entirely empty.
          ...totalsM.map(
            (t, idx) =>
              new TableCell({
                shading: { fill: TOTAL_SHADING },
                width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
                borders: {
                  left: idx === 0 ? THICK_BORDER : undefined,
                  right:
                    idx === orderedInds.length - 1 ? THICK_BORDER : undefined,
                },
                children: [
                  baseParagraph(
                    t > 0 ? t.toLocaleString("en-US") : "0",
                    AlignmentType.CENTER,
                    true,
                  ),
                ],
              }),
          ),
          ...totalsF.map(
            (t, idx) =>
              new TableCell({
                shading: { fill: TOTAL_SHADING },
                width: { size: NUMERIC_COL_WIDTH, type: WidthType.DXA },
                borders: {
                  left: idx === 0 ? THICK_BORDER : undefined,
                  right:
                    idx === orderedInds.length - 1 ? THICK_BORDER : undefined,
                },
                children: [
                  baseParagraph(
                    t > 0 ? t.toLocaleString("en-US") : "0",
                    AlignmentType.CENTER,
                    true,
                  ),
                ],
              }),
          ),
        ],
      }),
    ],
  });

  // Finally, I'm pulling it all together! I'm creating a landscape document, dropping in our big title,
  // throwing in the giant table we just built, and signing off at the bottom with the preparer's name.
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 500, right: 400, bottom: 500, left: 400 },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `BARANGAY ${brgy.toUpperCase()} - TEENAGE PREGNANCY REPORT ${year}`,
                bold: true,
                size: 24,
                font: "Calibri",
                color: TITLE_COLOR,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          table,
          new Paragraph({ text: "", spacing: { after: 150 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "Prepared by:", font: "Calibri", size: 20 }),
            ],
            spacing: { before: 150, after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: preparedBy.toUpperCase(),
                bold: true,
                font: "Calibri",
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Everything looks good to go. I'm packing up the doc into a buffer so the calling function can download or save it.
  return await Packer.toBuffer(doc);
}
