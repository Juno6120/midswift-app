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
  Header,
  HeadingLevel,
} from "docx";

// I'm keeping your exact Indicator type because it perfectly mirrors the data shape coming from the form.
export type Indicator = {
  id: string;
  label: string;
  has_gender_split?: boolean;
  ref_sections?: { name: string };
  section_name?: string;
};

// I'm creating a new interface to represent the raw entries.
// This replaces the 'any' type in the main function and gives us proper TypeScript safety!
export interface ReportEntry {
  id?: string | number;
  indicator_id?: string | number;
  indicator?: { id: string | number };
  report_id: string;
  value_m?: string | number | null;
  value?: string | number;
  value_f?: string | number | null;
}

// I use this generic node structure so I can easily build out parent-child relationships for the report items.
type TreeNode = {
  item: Indicator;
  children: TreeNode[];
};

// Here, I'm setting up a dictionary to map specific parent labels to their allowed child labels.
// This makes it super easy to categorize indicators under headings like "ANTI PNEUMONIA" or "OPV 1".
const LEVEL_2_PARENTS: Record<string, string[]> = {
  "PREG ASSESSED (1ST TRI)": [
    "NORMAL BMI",
    "LOW BMI",
    "HIGH BMI",
    "- NORMAL BMI",
    "- LOW BMI",
    "- HIGH BMI",
  ],
  "PENTA 1": ["- 2", "- 3", "2", "3"],
  "OPV 1": ["- 2", "- 3", "2", "3"],
  "PCV 1": ["- 2", "- 3", "2", "3"],
  "IPV 1": ["- 2", "2"],
  "MCV 1": ["- 2", "2"],
  "HPV 1": ["- 2", "2"],
  "ANTI PNEUMONIA": [
    "BELOW 60 Y/O",
    "ABOVE 60 Y/O",
    "BELOW 60",
    "ABOVE 60",
    "- BELOW 60 Y/O",
    "- ABOVE 60 Y/O",
  ],
  "ANTI FLU": [
    "BELOW 60 Y/O",
    "ABOVE 60 Y/O",
    "BELOW 60",
    "ABOVE 60",
    "- BELOW 60 Y/O",
    "- ABOVE 60 Y/O",
  ],
  "VISUAL TEST": [
    "(20 - 59 Y/O)",
    "(60 Y/O ABOVE)",
    "- (20 - 59 Y/O)",
    "- (60 Y/O ABOVE)",
  ],
  "NEW PHILPEN RISK ASSESSED (20-59)": [
    "- SMOKER",
    "- DRINKER",
    "- OBESE",
    "- HPN",
    "- DM",
    "SMOKER",
    "DRINKER",
    "OBESE",
    "HPN",
    "DM",
  ],
  "NEW PHILPEN RISK ASSESSED (60 UP)": [
    "- SMOKER",
    "- DRINKER",
    "- OBESE",
    "- HPN",
    "- DM",
    "SMOKER",
    "DRINKER",
    "OBESE",
    "HPN",
    "DM",
  ],
};

const TITLE_COLOR = "2E4D36";

// I'm building a two-level tree structure from a flat array of indicators here.
// By looping through each one, I check its label to figure out if it's a top-level item or a sub-item.
const buildTree = (inds: Indicator[]) => {
  const tree: TreeNode[] = [];
  let currentLevel1: TreeNode | null = null;
  let currentLevel2: TreeNode | null = null;

  inds.forEach((ind) => {
    const cleanLabel = ind.label.trim();
    const upperLabel = cleanLabel.toUpperCase();

    // I'm using this regex to catch any label that starts with a number. If it does, it's a Level 1 parent!
    const isNumbered = /^\d+\./.test(cleanLabel);

    if (isNumbered) {
      currentLevel1 = { item: ind, children: [] };
      tree.push(currentLevel1);
      currentLevel2 = null;
    } else {
      // If it isn't numbered, I'm checking if its label matches one of our predefined Level 2 parents.
      const matchedParentKey = Object.keys(LEVEL_2_PARENTS).find((k) =>
        upperLabel.includes(k),
      );

      if (matchedParentKey) {
        currentLevel2 = { item: ind, children: [] };
        if (currentLevel1) {
          currentLevel1.children.push(currentLevel2);
        } else {
          tree.push(currentLevel2);
        }
      } else {
        // If it's a child, I'll attempt to tuck it under the current Level 2 parent if it's an allowed child.
        let addedToLevel2 = false;
        if (currentLevel2) {
          const parentKey = Object.keys(LEVEL_2_PARENTS).find((k) =>
            currentLevel2!.item.label.toUpperCase().includes(k),
          );
          if (parentKey) {
            const allowedChildren = LEVEL_2_PARENTS[parentKey];
            if (allowedChildren.some((c) => upperLabel.includes(c))) {
              currentLevel2.children.push({ item: ind, children: [] });
              addedToLevel2 = true;
            }
          }
        }

        // If it couldn't be added to Level 2, I fall back to pushing it to Level 1 or straight into the root tree.
        if (!addedToLevel2) {
          currentLevel2 = null;
          if (currentLevel1) {
            currentLevel1.children.push({ item: ind, children: [] });
          } else {
            tree.push({ item: ind, children: [] });
          }
        }
      }
    }
  });

  return tree;
};

// I need to track how deep we are in the tree when we flatten it, so I'm pairing the indicator with its depth level.
type FlatNode = { item: Indicator; depth: number };

// This takes our nice nested tree and crushes it back into a flat list.
// The depth property lets me know exactly how much I should indent the text later when rendering the Word doc.
const flattenTree = (nodes: TreeNode[], depth = 0): FlatNode[] => {
  let result: FlatNode[] = [];
  nodes.forEach((node, idx) => {
    result.push({ item: node.item, depth });
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenTree(node.children, depth + 1));
    }
  });
  return result;
};

// Just a quick helper I wrote to grab the section name safely. It handles both older and newer form data structures.
const getSectionName = (ind: Indicator): string => {
  return ind.ref_sections?.name || ind.section_name || "";
};

// I'm adding this quick little helper to perfectly format any number 1000 and above with a comma!
const formatNum = (num: number): string => {
  return num.toLocaleString("en-US");
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// I'm setting up standard table borders here so our final Word document looks sharp and uniform.
const thinB = { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" };
const thickB = { style: BorderStyle.SINGLE, size: 12, color: "000000" };

const getBorder = (
  top: boolean,
  bottom: boolean,
  left: boolean,
  right: boolean,
) => ({
  top: top ? thickB : thinB,
  bottom: bottom ? thickB : thinB,
  left: left ? thickB : thinB,
  right: right ? thickB : thinB,
});

// For Table 1, I only want thick borders on the far left and right edges.
const getT1Border = (isTop: boolean, isBottom: boolean, colIdx: number) => {
  return getBorder(isTop, isBottom, colIdx === 0, colIdx === 13);
};

// Table 2 gets a bit more complex. I'm pre-calculating all these header borders so the table cells below stay clean.
const bT2H1Ind = getBorder(true, false, true, true);
const bT2H1Month = getBorder(true, false, true, true);
const bT2H1Total = getBorder(true, false, true, true);

const bT2H2M = getBorder(false, false, true, false);
const bT2H2F = getBorder(false, false, false, true);
const bT2H2TotM = getBorder(false, false, true, false);
const bT2H2TotF = getBorder(false, false, false, false);
const bT2H2TotT = getBorder(false, false, false, true);

const bT2IndData = (isLast: boolean) => getBorder(false, isLast, true, true);
const bT2MData = (isLast: boolean) => getBorder(false, isLast, true, false);
const bT2FData = (isLast: boolean) => getBorder(false, isLast, false, true);
const bT2TotMData = (isLast: boolean) => getBorder(false, isLast, true, false);
const bT2TotFData = (isLast: boolean) => getBorder(false, isLast, false, false);
const bT2TotTData = (isLast: boolean) => getBorder(false, isLast, false, true);

const ZEBRA_FILL = "F5F5F5";
const TOTAL_FILL = "F9F9F9";

// This is the main engine! Notice I've swapped out the `any[]` types for `Indicator[]` and our new `ReportEntry[]`.
// It's much safer now, and TypeScript will catch our typos.
export async function exportGeneralToWord(
  year: string,
  indicators: Indicator[],
  entries: ReportEntry[],
  reportMonthMap: Record<string, string>,
  preparedBy: string,
  barangay: string = "NAPAOD",
  reportType: string = "GENERAL REPORT",
): Promise<Buffer> {
  // I'm scaffolding a massive dictionary here. For every indicator, I want a zeroed-out count for males and females for every month.
  const dataMap: Record<string, Record<string, { m: number; f: number }>> = {};

  indicators.forEach((ind) => {
    dataMap[String(ind.id)] = {};
    MONTHS.forEach((m) => {
      dataMap[String(ind.id)][m] = { m: 0, f: 0 };
    });
  });

  // Now, I'm looping over every actual data entry from the database.
  entries.forEach((entry) => {
    // Handling the fact that the ID might be hiding in a few different places depending on how the frontend formatted it.
    const rawId = entry.indicator_id || entry.indicator?.id || entry.id;
    const indId = String(rawId);

    // I'm matching the report ID to figure out what month this entry belongs to.
    const month = reportMonthMap[entry.report_id];
    const normalizedMonth = MONTHS.find(
      (m) => m.toLowerCase() === month?.toLowerCase(),
    );

    // If it's a valid month and indicator, I tally up the values.
    // I'm treating undefined or missing values as a clean '0'.
    if (normalizedMonth && dataMap[indId]) {
      const valM = Number(entry.value_m) || Number(entry.value) || 0;
      const valF = Number(entry.value_f) || 0;

      dataMap[indId][normalizedMonth].m += valM;
      dataMap[indId][normalizedMonth].f += valF;
    }
  });

  // I need to split the data into two groups: indicators that are single values vs. those split by gender.
  const singleValueInds = indicators.filter((i) => {
    const section = getSectionName(i);
    return (
      section === "General Report - Single Value" ||
      i.has_gender_split === false
    );
  });

  const splitValueInds = indicators.filter((i) => {
    const section = getSectionName(i);
    return (
      section === "General Report - Split Value" || i.has_gender_split === true
    );
  });

  // I'm passing both filtered groups through the tree builder and flattener so we have ordered, indented lists ready to print.
  const singleValueFlat = flattenTree(buildTree(singleValueInds));
  const splitValueFlat = flattenTree(buildTree(splitValueInds));

  // I'm taking a quick peek ahead to see which month columns actually have data.
  // If a column has at least one value across the table, I'll default empty cells to '0' instead of '-'.
  const singleMonthHasData = MONTHS.map((m) =>
    singleValueFlat.some(({ item }) => dataMap[String(item.id)][m].m > 0),
  );

  const splitMonthHasData = MONTHS.map((m) =>
    splitValueFlat.some(
      ({ item }) =>
        dataMap[String(item.id)][m].m > 0 || dataMap[String(item.id)][m].f > 0,
    ),
  );

  // Setting up the header that will magically appear at the top of every landscape page.
  const docHeader = new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `BARANGAY ${barangay.toUpperCase()} - ${reportType.toUpperCase()} ${year}`,
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
    ],
  });

  // I'm assembling the top header row for our first table (Single Values). Indicator column on the left, months across the top.
  const table1Header = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "INDICATOR", font: "Calibri" })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { fill: "D0E1D4" },
        verticalAlign: VerticalAlign.CENTER,
        borders: getT1Border(true, false, 0),
      }),
      ...MONTHS.map(
        (m, mi) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: m.substring(0, 3).toUpperCase(),
                    font: "Calibri",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 5.5, type: WidthType.PERCENTAGE },
            shading: { fill: "D0E1D4" },
            verticalAlign: VerticalAlign.CENTER,
            borders: getT1Border(true, false, mi + 1),
          }),
      ),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "TOTAL", bold: true, font: "Calibri" }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 9, type: WidthType.PERCENTAGE },
        shading: { fill: "D0E1D4" },
        verticalAlign: VerticalAlign.CENTER,
        borders: getT1Border(true, false, 13),
      }),
    ],
  });

  // I want to add a nice "zebra" shading effect. This groups parent-child rows together under the same background color.
  let singleGroupIndex = -1;

  const singleValueRows = singleValueFlat.map(({ item: ind, depth }, idx) => {
    const isLast = idx === singleValueFlat.length - 1;
    if (depth === 0) singleGroupIndex++;

    let yearTotal = 0;
    // Pushing the text inwards based on how deep it is in the tree.
    const leftIndent = depth * 360;
    const isZebra = singleGroupIndex % 2 === 1;

    const labelText = ind.label.trim().toUpperCase();
    const isNumbered = /^\d+\./.test(labelText);

    // I'm generating a cell for each month. If there's value, it gets formatted with commas.
    // If not, it becomes '0' or '-' depending on whether that column has any data globally.
    const monthCells = MONTHS.map((m, mi) => {
      const val = dataMap[String(ind.id)][m].m;
      yearTotal += val;

      const displayVal =
        val > 0 ? formatNum(val) : singleMonthHasData[mi] ? "0" : "-";

      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: displayVal,
                font: "Calibri",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: isZebra ? { fill: ZEBRA_FILL } : undefined,
        borders: getT1Border(false, isLast, mi + 1),
      });
    });

    return new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: labelText,
                  font: "Calibri",
                  bold: isNumbered,
                }),
              ],
              indent: { left: leftIndent },
            }),
          ],
          shading: isZebra ? { fill: ZEBRA_FILL } : undefined,
          borders: getT1Border(false, isLast, 0),
        }),
        ...monthCells,
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: yearTotal > 0 ? formatNum(yearTotal) : "-",
                  bold: true,
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: TOTAL_FILL },
          borders: getT1Border(false, isLast, 13),
        }),
      ],
    });
  });

  // Table 2 handles the split values (Male/Female). It needs a double-decker header row.
  const table2HeaderRow1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "INDICATOR", font: "Calibri" })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 25, type: WidthType.PERCENTAGE },
        rowSpan: 2,
        shading: { fill: "D0E1D4" },
        verticalAlign: VerticalAlign.CENTER,
        borders: bT2H1Ind,
      }),
      ...MONTHS.map(
        (m) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: m.substring(0, 3).toUpperCase(),
                    font: "Calibri",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 5.5, type: WidthType.PERCENTAGE },
            columnSpan: 2,
            shading: { fill: "D0E1D4" },
            verticalAlign: VerticalAlign.CENTER,
            borders: bT2H1Month,
          }),
      ),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "TOTAL", bold: true, font: "Calibri" }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 9, type: WidthType.PERCENTAGE },
        columnSpan: 3,
        shading: { fill: "D0E1D4" },
        verticalAlign: VerticalAlign.CENTER,
        borders: bT2H1Total,
      }),
    ],
  });

  // This second header row provides the M / F labels directly underneath their respective month columns.
  const table2HeaderRow2 = new TableRow({
    tableHeader: true,
    children: [
      ...MONTHS.flatMap(() => [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "M", font: "Calibri" })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 2.75, type: WidthType.PERCENTAGE },
          shading: { fill: "D0E1D4" },
          verticalAlign: VerticalAlign.CENTER,
          borders: bT2H2M,
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "F", font: "Calibri" })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 2.75, type: WidthType.PERCENTAGE },
          shading: { fill: "D0E1D4" },
          verticalAlign: VerticalAlign.CENTER,
          borders: bT2H2F,
        }),
      ]),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "M", font: "Calibri" })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 3, type: WidthType.PERCENTAGE },
        shading: { fill: "D0E1D4" },
        borders: bT2H2TotM,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "F", font: "Calibri" })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 3, type: WidthType.PERCENTAGE },
        shading: { fill: "D0E1D4" },
        borders: bT2H2TotF,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "T", bold: true, font: "Calibri" })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 3, type: WidthType.PERCENTAGE },
        shading: { fill: "D0E1D4" },
        borders: bT2H2TotT,
      }),
    ],
  });

  // Repeating my zebra shading logic here for Table 2, separating out males and females for the totals.
  let splitGroupIndex = -1;

  const splitValueRows = splitValueFlat.map(({ item: ind, depth }, idx) => {
    const isLast = idx === splitValueFlat.length - 1;
    if (depth === 0) splitGroupIndex++;

    let yearTotalM = 0;
    let yearTotalF = 0;
    const leftIndent = depth * 360;
    const isZebra = splitGroupIndex % 2 === 1;

    const labelText = ind.label.trim().toUpperCase();
    const isNumbered = /^\d+\./.test(labelText);

    const cells: TableCell[] = [];

    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: labelText,
                font: "Calibri",
                bold: isNumbered,
              }),
            ],
            indent: { left: leftIndent },
          }),
        ],
        shading: isZebra ? { fill: ZEBRA_FILL } : undefined,
        borders: bT2IndData(isLast),
      }),
    );

    // Tallying up the M/F split for each respective month, checking if we format numbers, default to '0', or stick with '-'.
    MONTHS.forEach((m, mi) => {
      const valM = dataMap[String(ind.id)][m].m;
      const valF = dataMap[String(ind.id)][m].f;
      yearTotalM += valM;
      yearTotalF += valF;

      const displayM =
        valM > 0 ? formatNum(valM) : splitMonthHasData[mi] ? "0" : "-";
      const displayF =
        valF > 0 ? formatNum(valF) : splitMonthHasData[mi] ? "0" : "-";

      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: displayM,
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: isZebra ? { fill: ZEBRA_FILL } : undefined,
          borders: bT2MData(isLast),
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: displayF,
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: isZebra ? { fill: ZEBRA_FILL } : undefined,
          borders: bT2FData(isLast),
        }),
      );
    });

    // Pushing the formatted final totals into the very end columns.
    cells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: yearTotalM > 0 ? formatNum(yearTotalM) : "-",
                font: "Calibri",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        borders: bT2TotMData(isLast),
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: yearTotalF > 0 ? formatNum(yearTotalF) : "-",
                font: "Calibri",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        borders: bT2TotFData(isLast),
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text:
                  yearTotalM + yearTotalF > 0
                    ? formatNum(yearTotalM + yearTotalF)
                    : "-",
                bold: true,
                font: "Calibri",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: { fill: TOTAL_FILL },
        borders: bT2TotTData(isLast),
      }),
    );

    return new TableRow({ children: cells });
  });

  // Finally, I'm weaving it all together into the Word Document object!
  // I'm forcing Calibri as the default font and setting the page to Landscape so those 12 months actually fit.
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        headers: {
          default: docHeader,
        },
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [table1Header, ...singleValueRows],
          }),
          new Paragraph({ text: "", spacing: { before: 100, after: 100 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [table2HeaderRow1, table2HeaderRow2, ...splitValueRows],
          }),
          new Paragraph({ text: "", spacing: { after: 300 } }),
          new Paragraph({
            children: [new TextRun({ text: "PREPARED BY:", font: "Calibri" })],
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

  // The final step: taking our completed document tree, packing it down, and throwing back a buffer for the frontend to download!
  const b64string = await Packer.toBase64String(doc);
  return Buffer.from(b64string, "base64");
}
