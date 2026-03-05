/*
  I built this file to handle all the raw HTML generation for our reports. 
  The goal here is to output HTML tables that look exactly like our Word documents.
  I usually pass this HTML over to html2canvas when the user clicks the Export Year 
  button so we can snap a clean PDF or PNG of the data.
*/

export interface Indicator {
  id: string | number;
  label: string;
  ref_sections?: { name: string };
  section_name?: string;
  has_gender_split?: boolean;
}

export interface Entry {
  report_id: string | number;
  indicator_id?: string | number;
  indicator?: { id: string | number };
  id?: string | number;
  value_m?: number | string;
  value_f?: number | string;
  value?: number | string;
}

export interface ReportData {
  year: string | number;
  brgy: string;
  preparedBy: string;
  indicators: Indicator[];
  entries: Entry[];
  reportMonthMap: Record<string, string>;
}

/* I'm keeping these month arrays and color palettes up top as constants 
  so I don't have to hardcode them inside every single function. 
*/
const MONTHS_UPPER = [
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

const MONTHS_TITLE = [
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

const TITLE_COLOR = "#2E4D36";
const HEADER_BG = "#D0E1D4";
const TOTAL_BG = "#E9F2EB";
const ZEBRA_BG = "#F4F9F5";
const NATALITY_TOTAL_BG = "#FFF2CC";
const GENERAL_ZEBRA_BG = "#F5F5F5";
const GENERAL_TOTAL_BG = "#F9F9F9";

/* This is my base stylesheet. I'm injecting it into every HTML string 
  so they all share the same typography, borders, and general layout.
*/
const BASE = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 20px;
    font-family: Calibri, Arial, sans-serif;
    background: #fff;
    color: #111;
  }
  h2 {
    text-align: center;
    color: ${TITLE_COLOR};
    font-size: 17px;
    font-weight: bold;
    margin: 0 0 18px 0;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th, td {
    border: 1px solid #BDBDBD;
    padding: 3px 5px;
    text-align: center;
    vertical-align: middle;
    white-space: nowrap;
    font-size: 9px;
  }
  th { background: ${HEADER_BG}; font-weight: bold; }
  .thick-r { border-right: 3px solid #000 !important; }
  .thick-l { border-left:  3px solid #000 !important; }
  .thick-t { border-top:   3px solid #000 !important; }
  .thick-b { border-bottom:3px solid #000 !important; }
  .total-bg { background: ${TOTAL_BG}; font-weight: bold; }
  .zebra    { background: ${ZEBRA_BG}; }
  .footer   { margin-top: 14px; font-size: 11px; }
`;

/* Just a quick helper to format numbers. If the value is greater than zero, 
  I add commas for readability; otherwise, I just return "0". 
*/
function fmt(n: number): string {
  return n > 0 ? n.toLocaleString("en-US") : "0";
}

/* Here I'm generating the BCG/HEPA B report. 
  I take the raw data, group the entries by their indicators and months, 
  and then loop through to build out the rows.
*/
export function buildBCGHtml(data: ReportData): string {
  const { year, brgy, preparedBy, indicators, entries, reportMonthMap } = data;

  const dataMap: Record<string, Record<string, { m: number; f: number }>> = {};

  indicators.forEach((ind) => {
    dataMap[String(ind.id)] = {};
  });

  entries.forEach((e) => {
    const month = reportMonthMap[String(e.report_id)];
    const indId = String(e.indicator_id);
    if (month && dataMap[indId]) {
      dataMap[indId][month] = {
        m: Number(e.value_m) || 0,
        f: Number(e.value_f) || 0,
      };
    }
  });

  const colTotals = MONTHS_UPPER.map(() => ({ m: 0, f: 0 }));

  const rows = indicators.map((ind) => {
    const monthly = MONTHS_UPPER.map((m, i) => {
      const d = dataMap[String(ind.id)][m] || { m: 0, f: 0 };
      colTotals[i].m += d.m;
      colTotals[i].f += d.f;
      return d;
    });

    return {
      label: ind.label,
      monthly,
      totalM: monthly.reduce((s, d) => s + d.m, 0),
      totalF: monthly.reduce((s, d) => s + d.f, 0),
    };
  });

  const hasAny = rows.some((r) => r.totalM + r.totalF > 0);

  const monthTH1 = MONTHS_UPPER.map(
    (m) => `<th colspan="2" class="thick-r">${m.substring(0, 3)}</th>`,
  ).join("");

  const monthTH2 = MONTHS_UPPER.map(
    () => `<th>M</th><th class="thick-r">F</th>`,
  ).join("");

  const dataRows = rows
    .map((row, ri) => {
      const cells = row.monthly
        .map((d, mi) => {
          const mHas = colTotals[mi].m + colTotals[mi].f > 0;
          const mTxt = d.m > 0 ? fmt(d.m) : mHas ? "0" : "-";
          const fTxt = d.f > 0 ? fmt(d.f) : mHas ? "0" : "-";
          return `<td>${mTxt}</td><td class="thick-r">${fTxt}</td>`;
        })
        .join("");

      const mTot = row.totalM > 0 ? fmt(row.totalM) : hasAny ? "0" : "-";
      const fTot = row.totalF > 0 ? fmt(row.totalF) : hasAny ? "0" : "-";

      return `<tr class="${ri % 2 === 1 ? "zebra" : ""}">
      <td class="thick-r" style="text-align:left">${row.label}</td>
      ${cells}
      <td class="total-bg">${mTot}</td>
      <td class="total-bg thick-r">${fTot}</td>
    </tr>`;
    })
    .join("");

  return `<html><head><style>${BASE}</style></head><body>
    <h2>BARANGAY ${brgy?.toUpperCase()} - BCG/HEPA B REPORT ${year}</h2>
    <table style="border:3px solid #000">
      <thead>
        <tr>
          <th rowspan="2" class="thick-r thick-t thick-b" style="text-align:left">PROGRAM INDICATORS</th>
          ${monthTH1}
          <th colspan="2" class="thick-r thick-t thick-b">TOTAL</th>
        </tr>
        <tr>${monthTH2}<th>M</th><th class="thick-r">F</th></tr>
      </thead>
      <tbody>${dataRows}</tbody>
    </table>
    <div class="footer">
      <div>Prepared by:</div>
      <strong>${preparedBy?.toUpperCase()}</strong>
    </div>
  </body></html>`;
}

/* For the teenage pregnancy report, I'm flipping the axes slightly.
  The months become the rows, and the indicators stretch across the top 
  as the columns. 
*/
export function buildTeenageHtml(data: ReportData): string {
  const { year, brgy, preparedBy, indicators, entries, reportMonthMap } = data;

  const dataMap: Record<string, Record<string, { m: number; f: number }>> = {};

  indicators.forEach((ind) => {
    dataMap[String(ind.id)] = {};
  });

  entries.forEach((e) => {
    const month = reportMonthMap[String(e.report_id)];
    const indId = String(e.indicator_id);
    if (month && dataMap[indId]) {
      dataMap[indId][month] = {
        m: Number(e.value_m) || 0,
        f: Number(e.value_f) || 0,
      };
    }
  });

  const totalsM = new Array(indicators.length).fill(0);
  const totalsF = new Array(indicators.length).fill(0);

  const indHeaders = indicators
    .map((ind) => `<th style="font-size:8px">${ind.label}</th>`)
    .join("");

  const dataRows = MONTHS_UPPER.map((month, ri) => {
    const mCells = indicators
      .map((ind, i) => {
        const v = dataMap[String(ind.id)]?.[month]?.m || 0;
        totalsM[i] += v;
        return `<td>${v > 0 ? v : ""}</td>`;
      })
      .join("");

    const fCells = indicators
      .map((ind, i) => {
        const v = dataMap[String(ind.id)]?.[month]?.f || 0;
        totalsF[i] += v;
        return `<td>${v > 0 ? v : ""}</td>`;
      })
      .join("");

    return `<tr class="${ri % 2 === 1 ? "zebra" : ""}">
      <td class="thick-r" style="text-align:left">${month}</td>
      ${mCells}${fCells}
    </tr>`;
  }).join("");

  const totalRow = `<tr style="background:${TOTAL_BG};font-weight:bold">
    <td class="thick-r">TOTAL</td>
    ${totalsM.map((t) => `<td>${t > 0 ? t : ""}</td>`).join("")}
    ${totalsF.map((t) => `<td>${t > 0 ? t : ""}</td>`).join("")}
  </tr>`;

  return `<html><head><style>${BASE}</style></head><body>
    <h2>BARANGAY ${brgy?.toUpperCase()} - TEENAGE PREGNANCY REPORT ${year}</h2>
    <table style="border:3px solid #000">
      <thead>
        <tr>
          <th rowspan="2" class="thick-r">MONTHS</th>
          <th colspan="${indicators.length}" class="thick-r">AGES 10 - 14 Y/O</th>
          <th colspan="${indicators.length}" class="thick-r">AGES 15 - 19 Y/O</th>
        </tr>
        <tr>${indHeaders}${indHeaders}</tr>
      </thead>
      <tbody>${dataRows}${totalRow}</tbody>
    </table>
    <div class="footer">
      <div>Prepared by:</div>
      <strong>${preparedBy?.toUpperCase()}</strong>
    </div>
  </body></html>`;
}

/* The Deworming & Vitamin A report is unique because I need to split it 
  into two distinct sections stacked on top of each other. I created a 
  small internal helper function here to render those isolated blocks.
*/
export function buildDewormingHtml(data: ReportData): string {
  const { year, brgy, preparedBy, indicators, entries, reportMonthMap } = data;

  const dataMap: Record<string, Record<string, { m: number; f: number }>> = {};

  indicators.forEach((ind) => {
    dataMap[String(ind.id)] = {};
  });

  entries.forEach((e) => {
    const month = reportMonthMap[String(e.report_id)];
    const indId = String(e.indicator_id);
    if (month && dataMap[indId]) {
      dataMap[indId][month] = {
        m: Number(e.value_m) || 0,
        f: Number(e.value_f) || 0,
      };
    }
  });

  const findId = (label: string): string | null => {
    const norm = (s: string) => s.replace(/[\s\-–]/g, "").toUpperCase();
    const match = indicators.find((i) => norm(i.label).includes(norm(label)));
    return match ? String(match.id) : null;
  };

  const buildSection = (
    title: string,
    month1: string,
    month2: string,
    labels: string[],
  ) => {
    const m1Has = labels.some((l) => {
      const id = findId(l);
      return (
        id &&
        (dataMap[id]?.[month1]?.m || 0) + (dataMap[id]?.[month1]?.f || 0) > 0
      );
    });

    const m2Has = labels.some((l) => {
      const id = findId(l);
      return (
        id &&
        (dataMap[id]?.[month2]?.m || 0) + (dataMap[id]?.[month2]?.f || 0) > 0
      );
    });

    const headerRows = `
      <tr>
        <th rowspan="2" class="thick-r thick-t thick-b thick-l" style="width:35%">${title}</th>
        <th colspan="3" class="thick-r thick-t">${month1}</th>
        <th colspan="3" class="thick-r thick-t">${month2}</th>
      </tr>
      <tr>
        <th class="thick-b">M</th><th class="thick-b">F</th><th class="thick-r thick-b total-bg">T</th>
        <th class="thick-b">M</th><th class="thick-b">F</th><th class="thick-r thick-b total-bg">T</th>
      </tr>`;

    const rows = labels
      .map((label, ri) => {
        const id = findId(label);
        const m1m = id ? dataMap[id]?.[month1]?.m || 0 : 0;
        const m1f = id ? dataMap[id]?.[month1]?.f || 0 : 0;
        const m2m = id ? dataMap[id]?.[month2]?.m || 0 : 0;
        const m2f = id ? dataMap[id]?.[month2]?.f || 0 : 0;

        const m1t = fmt(m1m + m1f);
        const m2t = fmt(m2m + m2f);

        const m1mTxt = m1m > 0 ? fmt(m1m) : m1Has ? "0" : "-";
        const m1fTxt = m1f > 0 ? fmt(m1f) : m1Has ? "0" : "-";
        const m2mTxt = m2m > 0 ? fmt(m2m) : m2Has ? "0" : "-";
        const m2fTxt = m2f > 0 ? fmt(m2f) : m2Has ? "0" : "-";

        return `<tr class="${ri % 2 === 1 ? "zebra" : ""}">
        <td class="thick-r thick-l">${label}</td>
        <td>${m1mTxt}</td><td>${m1fTxt}</td>
        <td class="thick-r" style="background:${TOTAL_BG};font-weight:bold">${m1t}</td>
        <td>${m2mTxt}</td><td>${m2fTxt}</td>
        <td class="thick-r" style="background:${TOTAL_BG};font-weight:bold">${m2t}</td>
      </tr>`;
      })
      .join("");

    return headerRows + rows;
  };

  const dewRows = buildSection("DEWORMING PROGRAM", "JANUARY", "JULY", [
    "1 - 19 Y/O GIVEN 2 DOSES",
    "1 - 4 DEWORMED",
    "5 - 9 DEWORMED",
    "10 - 19 DEWORMED",
    "GIVEN 1 DOSE",
  ]);

  const vitRows = buildSection("VITAMIN A PROGRAM", "APRIL", "OCTOBER", [
    "6 - 11 MONTHS",
    "12 - 59 MONTHS",
    "NHTS 4P'S",
    "NHTS NON 4P'S",
    "NON NHTS",
  ]);

  return `<html><head><style>${BASE}</style></head><body>
    <h2>BARANGAY ${brgy?.toUpperCase()} - DEWORMING & VITAMIN A REPORT ${year}</h2>
    <table style="border:3px solid #000;width:90%;margin:0 auto">
      <tbody>
        ${dewRows}
        <tr><td colspan="7" style="border:none;height:10px;background:#fff"></td></tr>
        ${vitRows}
      </tbody>
    </table>
    <div class="footer" style="margin-left:5%">
      <div>Prepared by:</div>
      <strong>${preparedBy?.toUpperCase()}</strong>
    </div>
  </body></html>`;
}

/* The Natality table is massive. Because of its sheer width, I have to be 
  very strict about the column order, so I explicitly map them out here.
  I'm also keeping track of where the vertical borders need to be thicker 
  to group related data visually.
*/
export function buildNatalityHtml(data: ReportData): string {
  const { year, brgy, preparedBy, indicators, entries, reportMonthMap } = data;

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

  const SECTION_ENDS = new Set([0, 4, 11, 14, 17, 19]);

  const idToLabel: Record<string, string> = {};
  indicators.forEach((ind) => {
    idToLabel[String(ind.id)] = ind.label;
  });

  const dataByMonth: Record<
    string,
    Record<string, { m: number; f: number }>
  > = {};
  const colGrandTotals: Record<string, { m: number; f: number }> = {};

  COLUMN_ORDER.forEach((l) => {
    colGrandTotals[l] = { m: 0, f: 0 };
  });

  MONTHS_UPPER.forEach((m) => {
    dataByMonth[m] = {};
    COLUMN_ORDER.forEach((l) => {
      dataByMonth[m][l] = { m: 0, f: 0 };
    });
  });

  entries.forEach((e) => {
    const month = reportMonthMap[String(e.report_id)];
    const label = idToLabel[String(e.indicator_id)];
    if (month && label && dataByMonth[month]?.[label]) {
      const valM = Number(e.value_m) || 0;
      const valF = Number(e.value_f) || 0;
      dataByMonth[month][label].m += valM;
      dataByMonth[month][label].f += valF;
      colGrandTotals[label].m += valM;
      colGrandTotals[label].f += valF;
    }
  });

  const monthHasData: Record<string, boolean> = {};
  MONTHS_UPPER.forEach((m) => {
    monthHasData[m] = COLUMN_ORDER.some(
      (l) => dataByMonth[m][l].m + dataByMonth[m][l].f > 0,
    );
  });

  const hdr1 = `
    <th rowspan="3" style="background:${HEADER_BG};border:3px solid #000;font-size:8px">MONTHS</th>
    <th colspan="2"  class="thick-r thick-t" style="background:${HEADER_BG}">GENERAL</th>
    <th colspan="8"  class="thick-r thick-t" style="background:${HEADER_BG}">ATTENDANT AT BIRTH</th>
    <th colspan="14" class="thick-r thick-t" style="background:${HEADER_BG}">PLACE OF BIRTH</th>
    <th colspan="6"  class="thick-r thick-t" style="background:${HEADER_BG}">BIRTH WEIGHT</th>
    <th colspan="6"  class="thick-r thick-t" style="background:${HEADER_BG}">PREGNANCY OUTCOME</th>
    <th colspan="4"  class="thick-r thick-t" style="background:${HEADER_BG}">DELIVERY TYPE</th>
    <th colspan="2"  rowspan="2" class="thick-r thick-t" style="background:${HEADER_BG}">TOTAL</th>`;

  const hdr2 = COLUMN_ORDER.map(
    (col, i) =>
      `<th colspan="2" class="${SECTION_ENDS.has(i) ? "thick-r" : ""}" style="background:${HEADER_BG};font-size:7px">${col}</th>`,
  ).join("");

  const hdr3 =
    COLUMN_ORDER.flatMap((col, i) => [
      `<th style="background:${HEADER_BG};font-size:7px">M</th>`,
      `<th class="${SECTION_ENDS.has(i) ? "thick-r" : ""}" style="background:${HEADER_BG};font-size:7px">F</th>`,
    ]).join("") +
    `<th style="background:${HEADER_BG};font-size:7px">M</th><th class="thick-r" style="background:${HEADER_BG};font-size:7px">F</th>`;

  let grandTotalM = 0,
    grandTotalF = 0;

  const dataRows = MONTHS_UPPER.map((month, ri) => {
    const hasData = monthHasData[month];
    let rowM = 0,
      rowF = 0;

    const cells = COLUMN_ORDER.map((label, i) => {
      const v = dataByMonth[month][label];
      rowM += v.m;
      rowF += v.f;
      const mTxt = hasData ? fmt(v.m) : "-";
      const fTxt = hasData ? fmt(v.f) : "-";
      const thickR = SECTION_ENDS.has(i) ? "thick-r" : "";
      return `<td style="font-size:7px">${mTxt}</td><td class="${thickR}" style="font-size:7px">${fTxt}</td>`;
    }).join("");

    grandTotalM += rowM;
    grandTotalF += rowF;
    const zebra = ri % 2 === 1 ? `background:${ZEBRA_BG}` : "";

    return `<tr style="${zebra}">
      <td class="thick-r thick-l" style="font-weight:bold;font-size:7px">${month}</td>
      ${cells}
      <td style="background:${NATALITY_TOTAL_BG};font-size:7px">${fmt(rowM)}</td>
      <td class="thick-r" style="background:${NATALITY_TOTAL_BG};font-size:7px">${fmt(rowF)}</td>
    </tr>`;
  }).join("");

  const grandCells = COLUMN_ORDER.map((label, i) => {
    const col = colGrandTotals[label];
    const thickR = SECTION_ENDS.has(i) ? "thick-r" : "";
    return `<td style="background:${NATALITY_TOTAL_BG};font-size:7px">${fmt(col.m)}</td>
            <td class="${thickR}" style="background:${NATALITY_TOTAL_BG};font-size:7px">${fmt(col.f)}</td>`;
  }).join("");

  return `<html><head><style>${BASE}</style></head><body>
    <h2>BARANGAY ${brgy?.toUpperCase()} - NATALITY REPORT ${year}</h2>
    <table style="border:3px solid #000;table-layout:fixed">
      <colgroup>
        <col style="width:80px">
        ${Array(42).fill('<col style="width:26px">').join("")}
      </colgroup>
      <thead>
        <tr>${hdr1}</tr>
        <tr>${hdr2}</tr>
        <tr>${hdr3}</tr>
      </thead>
      <tbody>
        ${dataRows}
        <tr>
          <td class="thick-r thick-l thick-b" style="background:${NATALITY_TOTAL_BG};font-weight:bold;font-size:7px">GRAND TOTAL</td>
          ${grandCells}
          <td class="thick-b" style="background:${NATALITY_TOTAL_BG};font-weight:bold;font-size:7px">${fmt(grandTotalM)}</td>
          <td class="thick-r thick-b" style="background:${NATALITY_TOTAL_BG};font-weight:bold;font-size:7px">${fmt(grandTotalF)}</td>
        </tr>
      </tbody>
    </table>
    <div class="footer">
      <div>Prepared by:</div>
      <strong>${preparedBy?.toUpperCase()}</strong>
    </div>
  </body></html>`;
}

/* For the general report, I need to parse a hierarchical structure. 
  These are the rules dictating which sub-items belong to which parent items.
*/
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

export type TreeNode = { item: Indicator; children: TreeNode[] };
export type FlatNode = { item: Indicator; depth: number };

/* I'm looping through the flat array of indicators and restructuring them 
  into a tree based on their names. This lets me know exactly how much 
  left-padding to apply when rendering them in the table so it looks nested.
*/
function buildTree(inds: Indicator[]): TreeNode[] {
  const tree: TreeNode[] = [];
  let currentLevel1: TreeNode | null = null;
  let currentLevel2: TreeNode | null = null;

  inds.forEach((ind) => {
    const cleanLabel = ind.label.trim();
    const upperLabel = cleanLabel.toUpperCase();
    const isNumbered = /^\d+\./.test(cleanLabel);

    if (isNumbered) {
      currentLevel1 = { item: ind, children: [] };
      tree.push(currentLevel1);
      currentLevel2 = null;
    } else {
      const matchedParentKey = Object.keys(LEVEL_2_PARENTS).find((k) =>
        upperLabel.includes(k),
      );
      if (matchedParentKey) {
        currentLevel2 = { item: ind, children: [] };
        currentLevel1
          ? currentLevel1.children.push(currentLevel2)
          : tree.push(currentLevel2);
      } else {
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
        if (!addedToLevel2) {
          currentLevel2 = null;
          currentLevel1
            ? currentLevel1.children.push({ item: ind, children: [] })
            : tree.push({ item: ind, children: [] });
        }
      }
    }
  });
  return tree;
}

/* Once my tree is built, I flatten it back out but attach a "depth" number 
  to each item. It's much easier to render a flat array in an HTML table than 
  it is to recursively render table rows.
*/
function flattenTree(nodes: TreeNode[], depth = 0): FlatNode[] {
  let result: FlatNode[] = [];
  nodes.forEach((node) => {
    result.push({ item: node.item, depth });
    if (node.children.length > 0) {
      result = result.concat(flattenTree(node.children, depth + 1));
    }
  });
  return result;
}

export function buildGeneralHtml(data: ReportData): string {
  const { year, brgy, preparedBy, indicators, entries, reportMonthMap } = data;

  const dataMap: Record<string, Record<string, { m: number; f: number }>> = {};

  indicators.forEach((ind) => {
    dataMap[String(ind.id)] = {};
    MONTHS_TITLE.forEach((m) => {
      dataMap[String(ind.id)][m] = { m: 0, f: 0 };
    });
  });

  entries.forEach((entry) => {
    const rawId = entry.indicator_id || entry.indicator?.id || entry.id;
    const indId = String(rawId);
    const month = reportMonthMap[String(entry.report_id)];
    const normalizedMonth = MONTHS_TITLE.find(
      (m) => m.toLowerCase() === month?.toLowerCase(),
    );
    if (normalizedMonth && dataMap[indId]) {
      dataMap[indId][normalizedMonth].m +=
        Number(entry.value_m) || Number(entry.value) || 0;
      dataMap[indId][normalizedMonth].f += Number(entry.value_f) || 0;
    }
  });

  const getSectionName = (ind: Indicator) =>
    ind.ref_sections?.name || ind.section_name || "";

  const singleValueInds = indicators.filter(
    (i) =>
      getSectionName(i) === "General Report - Single Value" ||
      i.has_gender_split === false,
  );

  const splitValueInds = indicators.filter(
    (i) =>
      getSectionName(i) === "General Report - Split Value" ||
      i.has_gender_split === true,
  );

  const singleFlat = flattenTree(buildTree(singleValueInds));
  const splitFlat = flattenTree(buildTree(splitValueInds));

  const monthTHs = MONTHS_TITLE.map(
    (m) =>
      `<th style="background:${HEADER_BG}">${m.substring(0, 3).toUpperCase()}</th>`,
  ).join("");

  let singleGroupIndex = -1;
  const singleRows = singleFlat
    .map(({ item: ind, depth }) => {
      if (depth === 0) singleGroupIndex++;
      const isZebra = singleGroupIndex % 2 === 1;
      const labelText = ind.label.trim().toUpperCase();
      const isNumbered = /^\d+\./.test(labelText);
      const indent = depth * 16;
      let yearTotal = 0;

      const cells = MONTHS_TITLE.map((m) => {
        const v = dataMap[String(ind.id)][m].m;
        yearTotal += v;
        return `<td style="${isZebra ? `background:${GENERAL_ZEBRA_BG}` : ""};font-size:8px">${v > 0 ? v : "-"}</td>`;
      }).join("");

      return `<tr>
      <td style="${isZebra ? `background:${GENERAL_ZEBRA_BG};` : ""}padding-left:${6 + indent}px;font-weight:${isNumbered ? "bold" : "normal"};font-size:8px;text-align:left">${labelText}</td>
      ${cells}
      <td style="background:${GENERAL_TOTAL_BG};font-weight:bold;font-size:8px">${yearTotal > 0 ? yearTotal : "-"}</td>
    </tr>`;
    })
    .join("");

  let splitGroupIndex = -1;
  const splitRows = splitFlat
    .map(({ item: ind, depth }) => {
      if (depth === 0) splitGroupIndex++;
      const isZebra = splitGroupIndex % 2 === 1;
      const labelText = ind.label.trim().toUpperCase();
      const isNumbered = /^\d+\./.test(labelText);
      const indent = depth * 16;
      let yearTotalM = 0,
        yearTotalF = 0;

      const cells = MONTHS_TITLE.map((m) => {
        const v = dataMap[String(ind.id)][m];
        yearTotalM += v.m;
        yearTotalF += v.f;
        return `<td style="${isZebra ? `background:${GENERAL_ZEBRA_BG}` : ""};font-size:8px">${v.m > 0 ? v.m : "-"}</td>
              <td style="${isZebra ? `background:${GENERAL_ZEBRA_BG}` : ""};font-size:8px">${v.f > 0 ? v.f : "-"}</td>`;
      }).join("");

      const total = yearTotalM + yearTotalF;
      return `<tr>
      <td style="${isZebra ? `background:${GENERAL_ZEBRA_BG};` : ""}padding-left:${6 + indent}px;font-weight:${isNumbered ? "bold" : "normal"};font-size:8px;text-align:left">${labelText}</td>
      ${cells}
      <td style="font-size:8px">${yearTotalM > 0 ? yearTotalM : "-"}</td>
      <td style="font-size:8px">${yearTotalF > 0 ? yearTotalF : "-"}</td>
      <td style="background:${GENERAL_TOTAL_BG};font-weight:bold;font-size:8px">${total > 0 ? total : "-"}</td>
    </tr>`;
    })
    .join("");

  const splitMonthTHs = MONTHS_TITLE.map(
    (m) =>
      `<th colspan="2" style="background:${HEADER_BG}">${m.substring(0, 3).toUpperCase()}</th>`,
  ).join("");

  const splitMFTHs = MONTHS_TITLE.flatMap(() => [
    `<th style="background:${HEADER_BG}">M</th>`,
    `<th style="background:${HEADER_BG}">F</th>`,
  ]).join("");

  return `<html><head><style>${BASE}</style></head><body>
    <h2>BARANGAY ${brgy?.toUpperCase()} - GENERAL REPORT ${year}</h2>

    <table style="border:2px solid #000;margin-bottom:14px">
      <thead>
        <tr>
          <th style="background:${HEADER_BG};text-align:left;width:25%">INDICATOR</th>
          ${monthTHs}
          <th style="background:${HEADER_BG};font-weight:bold">TOTAL</th>
        </tr>
      </thead>
      <tbody>${singleRows}</tbody>
    </table>

    <table style="border:2px solid #000">
      <thead>
        <tr>
          <th rowspan="2" style="background:${HEADER_BG};text-align:left;width:25%">INDICATOR</th>
          ${splitMonthTHs}
          <th colspan="3" style="background:${HEADER_BG};font-weight:bold">TOTAL</th>
        </tr>
        <tr>
          ${splitMFTHs}
          <th style="background:${HEADER_BG}">M</th>
          <th style="background:${HEADER_BG}">F</th>
          <th style="background:${HEADER_BG};font-weight:bold">T</th>
        </tr>
      </thead>
      <tbody>${splitRows}</tbody>
    </table>

    <div class="footer">
      <div>PREPARED BY:</div>
      <strong>${preparedBy?.toUpperCase()}</strong>
    </div>
  </body></html>`;
}

/* Finally, this is just a simple router. Instead of picking the specific 
  generator from outside this file, I pass the string 'type' into here and let 
  this function decide which HTML string to build and return.
*/
export function buildHtmlForType(type: string, data: ReportData): string {
  if (type === "BCG/HEPA B") return buildBCGHtml(data);
  if (type === "TEENAGE PREGNANCY") return buildTeenageHtml(data);
  if (type === "DEWORMING AND VITAMIN A" || type === "DEWORMING")
    return buildDewormingHtml(data);
  if (type === "NATALITY") return buildNatalityHtml(data);
  if (type === "GENERAL REPORT" || type === "GENERAL")
    return buildGeneralHtml(data);
  return buildBCGHtml(data);
}
