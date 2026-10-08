/** S.E.A. Metal Component Register API — paste this entire file into a Cloudflare Worker. */
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// db/store.ts
import { env } from "cloudflare:workers";

// lib/product-codes.ts
function productCodeBase(component) {
  const label = component.name.toUpperCase().replace(/\bOPEN TOP\b/g, "OT").replace(/\bPLASTIC HANDLE\b/g, "PH").replace(/\bBRIDGE HANDLE\b/g, "BH").replace(/\bMETAL WIRE\b/g, "MW").replace(/\bINNER SEAL\b/g, "IS").replace(/\bSCREW CAP\b/g, "SC").replace(/\bSCREW NECK\b/g, "SN").replace(/\bEAR PLUG\b/g, "EP").replace(/\bPLAIN\b/g, "PL").replace(/\bRECTANGULAR\b/g, "RECT").replace(/\bTAPERED\b/g, "TAP").replace(/\b([12])\s*W\s*\/\s*H\b/g, "$1WH").replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
  return `CMP-${label || "ITEM"}`;
}
__name(productCodeBase, "productCodeBase");
var codeKey = /* @__PURE__ */ __name((value) => value.trim().toUpperCase(), "codeKey");
function assignProductCodes(components) {
  const all = components.map((c) => ({ ...c }));
  const reserved = new Set(all.flatMap((c) => [c.id, c.stockCode ?? "", ...(c.aliases ?? []).filter((s) => /^CMP-/i.test(s))]).filter(Boolean).map(codeKey));
  const active = all.filter((c) => !c.retired && !c.mergedInto).sort((a, b) => a.id.localeCompare(b.id, "en"));
  const assigned = /* @__PURE__ */ new Set();
  for (const c of active) {
    if (!c.stockCode?.trim()) continue;
    const key = codeKey(c.stockCode);
    if (assigned.has(key)) {
      c.aliases = Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], c.stockCode]));
      c.stockCode = void 0;
    } else assigned.add(key);
  }
  for (const c of active) {
    if (c.stockCode?.trim()) continue;
    const base = productCodeBase(c);
    let code = base, suffix = 2;
    while (reserved.has(codeKey(code))) code = `${base}-${String(suffix++).padStart(2, "0")}`;
    c.stockCode = code;
    c.generatedStockCode = true;
    reserved.add(codeKey(code));
  }
  return all;
}
__name(assignProductCodes, "assignProductCodes");

// lib/component-names.ts
var NAMING_VERSION = 2;
var finishLabels = { P: "Plain", "G/Lo": "GLQ", "C/Lo": "CLQ", "As Listed": "", "WC": "WC" };
function standardName(c) {
  const opening = c.opening === "screw-neck" && c.hole ? `ST${c.hole}` : c.opening === "flexispout" && c.hole ? `Flexi${c.hole}` : c.hole ? `M${c.hole}` : c.specificationCode;
  const family = (c.nameFamily ?? c.family).trim(), match = family.match(/^(\d+(?:\.\d+)?(?:kg|mm|L|G)?)(?:\s+(.*))?$/i);
  const dimension = match?.[1] ?? "", suffix = match?.[2] ?? (match ? "" : family), descriptors = [];
  for (const raw of [suffix, c.partType, c.colour, c.variant, c.tapered ? "Tapered" : ""]) {
    const part = (raw ?? "").trim();
    if (!part) continue;
    if (descriptors.some((value) => value.toLowerCase() === part.toLowerCase() || ` ${value.toLowerCase()} `.includes(` ${part.toLowerCase()} `))) continue;
    descriptors.push(part);
  }
  return [dimension, finishLabels[c.coating] ?? c.coating, ...descriptors, opening].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
__name(standardName, "standardName");
var descriptionFields = {
  "CMP-015": { nameFamily: "2kg Ink", partType: "Cover", variant: "" },
  "CMP-016": { nameFamily: "2kg Ink", partType: "Cover", variant: "" },
  "CMP-REG-014": { nameFamily: "Yam Cookies", partType: "Top", variant: "" },
  "CMP-REG-020": { nameFamily: "402", partType: "End", variant: "" },
  "CMP-REG-034": { nameFamily: "", partType: "Saddle", variant: "Besar" }
};
function normalizeDescription(component) {
  if (component.retired || component.mergedInto || component.descriptionVersion === 1) return component;
  const c = { ...component, ...descriptionFields[component.id] };
  if (!c.partType) return { ...c, descriptionVersion: 1 };
  const name = standardName(c);
  return { ...c, name, descriptionVersion: 1, aliases: Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], ...name !== component.name ? [component.name] : []])) };
}
__name(normalizeDescription, "normalizeDescription");
function nameFields(c) {
  if (c.partType) return {};
  const match = c.name.match(/^(\d+(?:L|G|kg|mm)?)\s+(Inner Seal|Ear Plug|D\/Ring|End|Top|Ring|Cover|PH)\b\s*(.*)$/i);
  if (!match) return {};
  let tail = match[3];
  for (const finish of ["B/S CLQ", "O/S CLQ", "Plain", "GLQ", "CLQ", "WC"]) tail = tail.replace(new RegExp(finish.replace("/", "\\/") + "\\b", "i"), "");
  tail = tail.replace(/\b(?:M\d+|S\/N\d+|PH48|Tapered)\b/gi, "").replace(/\s+/g, " ").trim();
  return { nameFamily: match[1], partType: match[2], variant: tail };
}
__name(nameFields, "nameFields");

// lib/904-catalogue.ts
var coats = [{ code: "P", key: "PLAIN" }, { code: "G/Lo", key: "GLQ" }, { code: "C/Lo", key: "CLQ" }];
var ends = ["CMP-001", "CMP-004", "CMP-END-FINISH-CMP-001-CLQ"];
var plans = [
  { ids: ["CMP-002", "CMP-005", "CMP-904-PH-CLQ-ST42"], sources: ["CMP-REG-021", "CMP-REG-015", "CMP-904-TOP-CLQ-ST48"], partType: "PH", variant: "", opening: "screw-neck", hole: 48, base: false, key: "PH" },
  { ids: ["CMP-011", "CMP-904-OPEN-TOP-1WH-GLQ", "CMP-904-OPEN-TOP-1WH-CLQ"], partType: "Open Top", variant: "1W/H", opening: void 0, hole: 0, base: false, key: "OPEN-TOP" },
  { ids: ["CMP-012", "CMP-904-OPEN-TOP-2WH-GLQ", "CMP-904-OPEN-TOP-2WH-CLQ"], partType: "Open Top", variant: "2W/H", opening: "screw-neck", hole: 48, base: false, key: "OPEN-TOP" },
  { ids: ["CMP-SHEET-P4-R02", "CMP-904-OPEN-TOP-GLQ-FLEXI35", "CMP-904-OPEN-TOP-CLQ-FLEXI35"], partType: "Open Top", variant: "PH", opening: "flexispout", hole: 35, base: true, key: "OPEN-TOP" },
  { ids: ["CMP-904-OPEN-TOP-PLAIN-FLEXI38", "CMP-904-OPEN-TOP-GLQ-FLEXI38", "CMP-904-OPEN-TOP-CLQ-FLEXI38"], partType: "Open Top", variant: "PH", opening: "flexispout", hole: 38, base: true, key: "OPEN-TOP" }
];
function confirmed904Welding(components) {
  const all = components.map((c) => ({ ...c }));
  const ensure = /* @__PURE__ */ __name((id, coat) => {
    let c = all.find((c2) => c2.id === id);
    if (!c) {
      c = { id, name: "", family: "904", coating: coat, hole: 0, tapered: false, pack: 1, reference: "904 components confirmed by Eugene \xB7 30/09/2026", namingVersion: 2, catalogueVersion: 1 };
      all.push(c);
    }
    return c;
  }, "ensure");
  const update = /* @__PURE__ */ __name((c, fields) => {
    if ((c.weldingVersion ?? 0) >= 4) return;
    const oldName = c.name;
    Object.assign(c, fields, { weldingVersion: 4, descriptionVersion: 1 });
    c.name = standardName(c);
    c.aliases = Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], ...oldName && oldName !== c.name ? [oldName] : []]));
  }, "update");
  for (const plan of plans) for (const [i, coat] of coats.entries()) {
    const originalId = plan.ids[i];
    const closure = plan.opening === "screw-neck" ? `ST${plan.hole}` : `FLEXI${plan.hole}`;
    const outputId = plan.base ? `CMP-904-${plan.key}-${coat.key}-PH-${closure}` : originalId;
    const rawId = "sources" in plan ? plan.sources[i] : plan.base ? originalId : `CMP-904-PREFORM-${originalId}`;
    const output = ensure(outputId, coat.code), raw = ensure(rawId, coat.code);
    const common = { family: "904", nameFamily: "904", coating: coat.code, hole: plan.hole, opening: plan.opening, specificationCode: void 0, punched: plan.hole > 0 };
    update(output, { ...common, partType: plan.partType, variant: plan.variant, punched: true, processingMode: "handle-welding", assemblyStage: void 0, assemblyFor: void 0, sourceId: ends[i], processingVersion: 1 });
    update(raw, { ...common, partType: plan.partType === "PH" ? "Top" : plan.partType, variant: "", processingMode: void 0, assemblyStage: void 0, assemblyFor: void 0, sourceId: ends[i], processingVersion: 1 });
  }
  if (!all.some((c) => c.id === "CMP-ACC-METAL-WIRE")) all.push({ id: "CMP-ACC-METAL-WIRE", name: "Metal Wire", family: "Accessories", nameFamily: "", partType: "Metal Wire", coating: "As Listed", hole: 0, tapered: false, pack: 1, namingVersion: 2, descriptionVersion: 1, catalogueVersion: 1, reference: "Wire handle for 904 open tops \xB7 30/09/2026" });
  for (const c of all) if (/s\s*\/\s*welding/i.test(c.name) && !["CMP-003", "CMP-006"].includes(c.id)) c.retired = true;
  return all;
}
__name(confirmed904Welding, "confirmed904Welding");

// lib/700-catalogue.ts
var finishes = [
  { code: "P", key: "PLAIN", sourceId: "CMP-REG-019" },
  { code: "G/Lo", key: "GLQ", sourceId: "CMP-END-FINISH-CMP-REG-019-GLQ" },
  { code: "C/Lo", key: "CLQ", sourceId: "CMP-SHEET-P3-R25" }
];
function confirmed700Processing(components) {
  const all = components.map((c) => ({ ...c }));
  for (const finish of finishes) for (const hole of [35, 42]) {
    const id = `CMP-PROC-700-PH-${finish.key}-M${hole}`;
    if (all.some((c) => c.id === id)) continue;
    const source = all.find((c) => c.id === finish.sourceId);
    if (!source || source.family !== "700" || source.coating !== finish.code || source.variant || source.retired || source.mergedInto) continue;
    const output = { id, name: "", family: "700", nameFamily: "700", partType: "PH", variant: "", coating: finish.code, hole, punched: true, tapered: false, pack: 1, sourceId: source.id, processingVersion: 1, namingVersion: 2, catalogueVersion: 1, descriptionVersion: 1, reference: "700 PH processing confirmed by Eugene \xB7 01/10/2026" };
    output.name = standardName(output);
    if (!all.some((c) => !c.retired && !c.mergedInto && c.name.toLowerCase() === output.name.toLowerCase())) all.push(output);
  }
  return all;
}
__name(confirmed700Processing, "confirmed700Processing");

// lib/open-top-catalogue.ts
var models = [
  { id: "CMP-011", key: "1WH", partType: "Open Top", nameFamily: "904", variant: "1W/H" },
  { id: "CMP-012", key: "2WH", partType: "Open Top", nameFamily: "904", variant: "2W/H" },
  { id: "CMP-014", key: "COVER", partType: "Cover", nameFamily: "904 Open Top", variant: "" }
];
var finishes2 = [{ code: "G/Lo", key: "GLQ" }, { code: "C/Lo", key: "CLQ" }];
function completeOpenTopFinishes(components) {
  const all = components.map((c) => ({ ...c }));
  const removed = all.find((c) => c.id === "CMP-013");
  if (removed) removed.retired = true;
  for (const model of models) {
    const original = all.find((c) => c.id === model.id);
    if (!original) continue;
    if (!original.openTopVersion) {
      const oldName = original.name;
      Object.assign(original, { family: "904", nameFamily: model.nameFamily, partType: model.partType, variant: model.variant, coating: "P", openTopVersion: 1 });
      original.name = standardName(original);
      original.aliases = Array.from(/* @__PURE__ */ new Set([...original.aliases ?? [], oldName]));
    }
    for (const finish of finishes2) {
      const id = `CMP-904-OPEN-TOP-${model.key}-${finish.key}`;
      if (all.some((c) => c.id === id)) continue;
      const fields = { ...original, family: "904", nameFamily: model.nameFamily, partType: model.partType, variant: model.variant, coating: finish.code };
      const name = standardName(fields);
      if (all.some((c) => !c.retired && !c.mergedInto && c.name.toLowerCase() === name.toLowerCase())) continue;
      all.push({ ...fields, id, name, aliases: [], stockCode: void 0, originalDescription: void 0, catalogueNote: void 0, sourceId: void 0, punched: false, mergedInto: void 0, retired: void 0, reference: "904 open-top finishes confirmed by Eugene \xB7 30/09/2026" });
    }
  }
  return all;
}
__name(completeOpenTopFinishes, "completeOpenTopFinishes");

// lib/component-merges.ts
var confirmedEndMerges = [
  { from: "CMP-007", to: "CMP-REG-020", name: "402 End Plain" },
  { from: "CMP-052", to: "CMP-END-FINISH-CMP-052-PLAIN", name: "603 End Plain Tall" }
];
var confirmedMerges = [
  { from: "CMP-REG-013", to: "CMP-021", name: "700 GLQ Ring" },
  { from: "CMP-REG-030", to: "CMP-020", name: "700 Plain Ring" },
  { from: "CMP-END-FINISH-CMP-SHEET-P3-R25-PLAIN", to: "CMP-REG-019", name: "700 Plain End" },
  { from: "CMP-END-FINISH-CMP-SHEET-P3-R25-GLQ", to: "CMP-END-FINISH-CMP-REG-019-GLQ", name: "700 GLQ End" },
  { from: "CMP-END-FINISH-CMP-REG-019-CLQ", to: "CMP-SHEET-P3-R25", name: "700 CLQ End" },
  { from: "CMP-SHEET-P6-R14", to: "CMP-SHEET-P6-R13", name: "39 Screw Cap" },
  { from: "CMP-REG-028", to: "CMP-REG-002", name: "48mm Inner Seal" },
  ...confirmedEndMerges,
  { from: "CMP-003", to: "CMP-002", name: "904 Plain PH ST48" },
  { from: "CMP-006", to: "CMP-005", name: "904 GLQ PH ST48" },
  ...[
    ["PLAIN", "Plain", "CMP-002", "CMP-REG-021"],
    ["GLQ", "GLQ", "CMP-005", "CMP-REG-015"],
    ["CLQ", "CLQ", "CMP-904-PH-CLQ-ST42", "CMP-904-TOP-CLQ-ST48"]
  ].flatMap(([coat, label, output, source]) => [
    { from: `CMP-904-TOP-${coat}-PH-ST48`, to: output, name: `904 ${label} PH ST48` },
    { from: `CMP-904-PREFORM-${output}`, to: source, name: `904 ${label} Top ST48` }
  ]),
  ...[
    ["CMP-REG-021", "904 Plain Top ST48"],
    ["CMP-REG-015", "904 GLQ Top ST48"],
    ["CMP-904-TOP-CLQ-ST48", "904 CLQ Top ST48"],
    ["CMP-SHEET-P4-R02", "904 Plain Open Top Flexi35"],
    ["CMP-904-OPEN-TOP-GLQ-FLEXI35", "904 GLQ Open Top Flexi35"],
    ["CMP-904-OPEN-TOP-CLQ-FLEXI35", "904 CLQ Open Top Flexi35"],
    ["CMP-904-OPEN-TOP-PLAIN-FLEXI38", "904 Plain Open Top Flexi38"],
    ["CMP-904-OPEN-TOP-GLQ-FLEXI38", "904 GLQ Open Top Flexi38"],
    ["CMP-904-OPEN-TOP-CLQ-FLEXI38", "904 CLQ Open Top Flexi38"]
  ].map(([to, name]) => ({ from: `CMP-904-PREFORM-${to}`, to, name }))
];
var canonicalComponentId = /* @__PURE__ */ __name((id) => confirmedMerges.find((m) => m.from === id)?.to ?? id, "canonicalComponentId");
var componentById = /* @__PURE__ */ __name((components, id) => components.find((c) => c.id === canonicalComponentId(id)), "componentById");
var activeComponents = /* @__PURE__ */ __name((components) => components.filter((c) => !c.mergedInto && !c.retired), "activeComponents");
var recordComponents = /* @__PURE__ */ __name((state) => [...state.components, ...state.archivedComponents ?? []], "recordComponents");
function mergeCatalogue(components) {
  const all = components.map((c) => ({ ...c }));
  for (const merge of confirmedMerges) {
    const source = all.find((c) => c.id === merge.from), target = all.find((c) => c.id === merge.to);
    if (!source || !target) continue;
    target.aliases = Array.from(new Set([...target.aliases ?? [], ...!source.mergedInto ? [target.name] : [], source.name, ...source.aliases ?? [], source.stockCode, source.originalDescription].filter((s) => Boolean(s))));
    if (!source.mergedInto) {
      target.name = merge.name;
      if (merge.to === "CMP-SHEET-P6-R13") target.nameFamily = "39";
    }
    source.mergedInto = target.id;
  }
  for (const c of all) if (c.sourceId) c.sourceId = canonicalComponentId(c.sourceId);
  return all;
}
__name(mergeCatalogue, "mergeCatalogue");
function pendingStockMerges(before, after, stocks) {
  const running = new Map(stocks.map((s) => [`${s.location}:${s.componentId}`, s.quantity]));
  return confirmedMerges.filter((m) => before.some((c) => c.id === m.from && !c.mergedInto) && after.some((c) => c.id === m.from && c.mergedInto === m.to)).map((m) => {
    const changes = [], stockBefore = [];
    for (const location of ["punching", "production"]) {
      const old = running.get(`${location}:${m.from}`) ?? 0;
      if (!old) continue;
      const current = running.get(`${location}:${m.to}`) ?? 0;
      const total = current + old;
      if (!Number.isSafeInteger(total) || total < 0 || total > 1e7) throw new Error(`Combined stock exceeds the supported quantity for ${m.name}.`);
      changes.push({ componentId: m.to, location, quantity: total }, { componentId: m.from, location, quantity: 0 });
      stockBefore.push({ componentId: m.to, location, quantity: current }, { componentId: m.from, location, quantity: old });
      running.set(`${location}:${m.to}`, total);
      running.set(`${location}:${m.from}`, 0);
    }
    return { ...m, source: before.find((c) => c.id === m.from), target: before.find((c) => c.id === m.to), stocks: changes, stockBefore };
  });
}
__name(pendingStockMerges, "pendingStockMerges");

// lib/end-catalogue.ts
var isEnd = /* @__PURE__ */ __name((c) => /^ends?$/i.test(c.partType ?? "") || /\bEnds?\b/i.test(c.name), "isEnd");
function diameterFamily(family) {
  if (/^(?:1\s*g|(?:1\s*)?gallon)$/i.test(family.trim())) return "402";
  if (/^1\s*l$/i.test(family.trim())) return "208";
  if (/^5\s*l$/i.test(family.trim())) return "700";
  if (/^18\s*l$/i.test(family.trim())) return "904";
  return family;
}
__name(diameterFamily, "diameterFamily");
function renameDiameter(c) {
  const family = diameterFamily(c.family);
  if (family === c.family) return c;
  const name = c.name.replace(/^(?:1\s*gallon|gallon|1\s*g|18\s*l|[15]\s*l)\b/i, family);
  return { ...c, family, nameFamily: (c.nameFamily ?? c.family).replace(/^(?:1\s*gallon|gallon|1\s*g|18\s*l|[15]\s*l)\b/i, family), name, aliases: Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], c.name, c.family, ...c.nameFamily ? [c.nameFamily] : []])) };
}
__name(renameDiameter, "renameDiameter");
function normalizeEndFinish(c) {
  if (!isEnd(c)) return c;
  const listed = /\b(?:Plain|GLQ|CLQ|WC)\b|[GC]\/L[oq]/i.test(c.name);
  const coating = c.coating === "As Listed" || !c.coating ? /\bB\/S CLQ\b/i.test(c.name) ? "B/S CLQ" : /\bO\/S CLQ\b/i.test(c.name) ? "O/S CLQ" : /\bGLQ\b|G\/L[oq]/i.test(c.name) ? "G/Lo" : /\bCLQ\b|C\/L[oq]/i.test(c.name) ? "C/Lo" : /\bWC\b/i.test(c.name) ? "WC" : "P" : c.coating;
  const label = { P: "Plain", "G/Lo": "GLQ", "C/Lo": "CLQ" }[coating] ?? coating;
  const name = listed ? c.name : c.name.replace(/\bEnds?\b/i, `End ${label}`);
  if (coating === c.coating && name === c.name) return c;
  return { ...c, coating, name, aliases: Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], c.name])) };
}
__name(normalizeEndFinish, "normalizeEndFinish");
var finishes3 = [{ code: "P", key: "PLAIN" }, { code: "G/Lo", key: "GLQ" }, { code: "C/Lo", key: "CLQ" }];
var endShape = /* @__PURE__ */ __name((c) => JSON.stringify([c.family, (c.variant ?? "").trim().toLowerCase(), c.tapered, c.hole, c.opening ?? "", c.specificationCode ?? "", c.colour ?? ""]), "endShape");
function completeEndFinishes(components) {
  const all = components.map(renameDiameter).map((c) => confirmedEndMerges.some((m) => m.from === c.id) ? c : normalizeEndFinish(c));
  const seeds = all.filter(isEnd);
  for (const seed of seeds) {
    for (const finish of finishes3) {
      if (all.some((c) => isEnd(c) && endShape(c) === endShape(seed) && c.coating === finish.code)) continue;
      const fields = { ...seed, partType: "End", coating: finish.code };
      const name = standardName(fields);
      if (all.some((c) => c.name.toLowerCase() === name.toLowerCase())) continue;
      all.push({ ...fields, id: `CMP-END-FINISH-${seed.id}-${finish.key}`, name, aliases: [], sourceId: void 0, punched: false, stockCode: void 0, originalDescription: void 0, catalogueNote: void 0, reference: "End finishes confirmed by Eugene \xB7 30/09/2026" });
    }
  }
  return all;
}
__name(completeEndFinishes, "completeEndFinishes");

// lib/confirmed-processing.ts
var reference = "Processing rules confirmed by Eugene \xB7 29/09/2026";
var coats2 = [{ code: "P", label: "Plain", key: "PLAIN" }, { code: "G/Lo", label: "GLQ", key: "GLQ" }, { code: "C/Lo", label: "CLQ", key: "CLQ" }];
var plans2 = [
  { key: "211", family: "211", label: "211", sources: ["CMP-034", "CMP-END-FINISH-CMP-034-GLQ", "CMP-END-FINISH-CMP-034-CLQ"], specs: ["ST39"], outputs: {} },
  { key: "300", family: "300", label: "300", sources: ["", "CMP-065", ""], specs: ["M35", "ST39"], outputs: { GLQ_M35: "CMP-SHEET-P4-R15", CLQ_M35: "CMP-SHEET-P4-R14" } },
  { key: "307", family: "307", label: "307", sources: ["CMP-REG-024", "CMP-066", "CMP-REG-010"], specs: ["M35", "M42", "ST39"], outputs: { GLQ_M35: "CMP-044", GLQ_M42: "CMP-045", PLAIN_M42: "CMP-046" } },
  { key: "401", family: "401", label: "401", sources: ["CMP-401-END-PLAIN", "CMP-036", "CMP-REG-007"], specs: ["M35", "M42"], outputs: { GLQ_M35: "CMP-SHEET-P4-R28", GLQ_M42: "CMP-048", PLAIN_M42: "CMP-047" } },
  { key: "1L-RECT", family: "208", label: "208 Rectangular", sources: ["CMP-REG-022", "CMP-REG-016", "CMP-REG-009"], specs: ["M35", "M42", "ST39"], outputs: {} },
  { key: "1GALLON", family: "402", label: "402", sources: ["CMP-REG-020", "", ""], specs: ["M35", "M42", "ST39", "ST48"], outputs: {} }
];
function confirmedProcessing(existing) {
  const all = existing.map((c) => ({ ...c }));
  const matches = /* @__PURE__ */ __name((c, t) => c.family === t.family && c.coating === t.coating && c.hole === t.hole && (c.opening ?? "") === (t.opening ?? "") && c.tapered === t.tapered && (c.partType || c.name.match(/\b(Bridge Handle|End|Top)\b/i)?.[1] || "").toLowerCase() === t.partType?.toLowerCase() && (c.variant ?? "").toLowerCase() === (t.variant ?? "").toLowerCase(), "matches");
  const ensure = /* @__PURE__ */ __name((template) => {
    template = { ...template, name: standardName(template) };
    const exactId = all.find((c) => c.id === template.id);
    if (exactId) return matches(exactId, template) ? exactId : void 0;
    const found = all.find((c) => (c.name.toLowerCase() === template.name.toLowerCase() || standardName(c).toLowerCase() === template.name.toLowerCase()) && matches(c, template));
    if (found) return found;
    if (all.some((c) => c.name.toLowerCase() === template.name.toLowerCase())) return void 0;
    all.push(template);
    return template;
  }, "ensure");
  ensure({ id: "CMP-ACC-BRIDGE-HANDLE", name: "Bridge Handle", family: "Accessories", nameFamily: "", partType: "Bridge Handle", coating: "As Listed", hole: 0, tapered: false, pack: 1, reference, namingVersion: 2, catalogueVersion: 1 });
  for (const plan of plans2) for (const [i, coat] of coats2.entries()) {
    const source = ensure({ id: plan.sources[i] || `CMP-PROC-${plan.key}-END-${coat.key}`, name: `${plan.label} End ${coat.label}`, family: plan.family, nameFamily: plan.label, partType: "End", variant: plan.key === "1L-RECT" ? "Rectangular" : "", coating: coat.code, hole: 0, tapered: false, pack: 1, reference, namingVersion: 2, catalogueVersion: 1 });
    if (!source || source.coating !== coat.code || source.hole || source.punched || source.sourceId) continue;
    for (const spec of plan.specs) {
      const hole = Number(spec.replace(/\D/g, "")), opening = spec.startsWith("ST") ? "screw-neck" : void 0;
      const output = ensure({ id: plan.outputs[`${coat.key}_${spec}`] || `CMP-PROC-${plan.key}-TOP-${coat.key}-${spec}`, name: `${plan.label} Top ${coat.label} ${opening ? `ST ${hole}mm` : spec}`, family: plan.family, nameFamily: plan.label, partType: "Top", variant: plan.key === "1L-RECT" ? "Rectangular" : "", coating: coat.code, hole, opening, punched: true, tapered: false, pack: 1, reference: ["211", "300"].includes(plan.key) && spec === "ST39" ? "Processing rules confirmed by Eugene \xB7 30/09/2026" : reference, namingVersion: 2, catalogueVersion: 1 });
      if (output && !output.processingVersion && output.coating === source.coating && output.family === source.family && !output.tapered && !all.some((c) => c.sourceId === output.id)) {
        output.sourceId = source.id;
        output.processingVersion = 1;
      }
    }
  }
  return all;
}
__name(confirmedProcessing, "confirmedProcessing");

// lib/stock-sheet-reference.ts
var matched = {
  "CMP-034": {
    "stockCode": "CMP-EB-211(PLAIN)",
    "originalDescription": "DIA 211 PLAIN END",
    "aliases": [
      "DIA 211 PLAIN END",
      "CMP-EB-211(PLAIN)"
    ]
  },
  "CMP-044": {
    "originalDescription": "DIA 307 G/LQ WITH MOUTH 35MM END TOP",
    "aliases": [
      "DIA 307 G/LQ WITH MOUTH 35MM END TOP"
    ]
  },
  "CMP-069": {
    "originalDescription": "DIA 307 PLAIN TAPPER WITH MOUTH 35MM END",
    "aliases": [
      "DIA 307 PLAIN TAPPER WITH MOUTH 35MM END"
    ]
  },
  "CMP-045": {
    "originalDescription": "DIA-307 G/LQ WITH MOUTH 42MM END TOP",
    "aliases": [
      "DIA-307 G/LQ WITH MOUTH 42MM END TOP"
    ]
  },
  "CMP-046": {
    "originalDescription": "DIA 307 PLAIN WITH MOUTH 42MM END TOP",
    "aliases": [
      "DIA 307 PLAIN WITH MOUTH 42MM END TOP"
    ]
  },
  "CMP-071": {
    "originalDescription": "DIA 401 PLAIN TAPPER WITH MOUTH 35MM END",
    "aliases": [
      "DIA 401 PLAIN TAPPER WITH MOUTH 35MM END"
    ]
  },
  "CMP-048": {
    "originalDescription": "DIA 401 GOLD LACQUER WITH MOUTH 42MM EN\u2026",
    "aliases": [
      "DIA 401 GOLD LACQUER WITH MOUTH 42MM EN\u2026"
    ]
  },
  "CMP-047": {
    "originalDescription": "DIA 401 PLAIN WITH MOUTH 42MM END TOP",
    "aliases": [
      "DIA 401 PLAIN WITH MOUTH 42MM END TOP"
    ],
    "catalogueNote": "Existing catalogue pack is 2000; photo indicates 1700. Preserve existing pack pending confirmation."
  },
  "CMP-073": {
    "originalDescription": "DIA 401 GOLD LACQUER TAPPER WITH MOUTH 4\u2026",
    "aliases": [
      "DIA 401 GOLD LACQUER TAPPER WITH MOUTH 4\u2026"
    ]
  },
  "CMP-REG-014": {
    "originalDescription": "GOLD LACQUER YAM COOKIES END TOP",
    "aliases": [
      "GOLD LACQUER YAM COOKIES END TOP"
    ]
  },
  "CMP-019": {
    "stockCode": "CMP-RG-202(PLAIN)",
    "originalDescription": "DIA 202 PLAIN RING",
    "aliases": [
      "DIA 202 PLAIN RING",
      "CMP-RG-202(PLAIN)"
    ]
  },
  "CMP-027": {
    "stockCode": "CMP-RG-300(PLAIN)",
    "originalDescription": "DIA 300 PLAIN RING",
    "aliases": [
      "DIA 300 PLAIN RING",
      "CMP-RG-300(PLAIN)"
    ]
  },
  "CMP-029": {
    "stockCode": "CMP-RG-307(G/LQ)",
    "originalDescription": "DIA 307 GOLD LACQUER RING",
    "aliases": [
      "DIA 307 GOLD LACQUER RING",
      "CMP-RG-307(G/LQ)"
    ]
  },
  "CMP-028": {
    "stockCode": "CMP-RG-307(PLAIN)",
    "originalDescription": "DIA 307 PLAIN RING",
    "aliases": [
      "DIA 307 PLAIN RING",
      "CMP-RG-307(PLAIN)"
    ]
  },
  "CMP-030": {
    "stockCode": "CMP-RG-401(G/LQ)",
    "originalDescription": "DIA 401 GOLD LACQUER RING",
    "aliases": [
      "DIA 401 GOLD LACQUER RING",
      "CMP-RG-401(G/LQ)"
    ]
  },
  "CMP-068": {
    "stockCode": "CMP-RG-404(PLAIN)",
    "originalDescription": "DIA 404 PLAIN RING",
    "aliases": [
      "DIA 404 PLAIN RING",
      "CMP-RG-404(PLAIN)"
    ]
  },
  "CMP-REG-025": {
    "originalDescription": "PLAIN DIA 406 PLAIN D/RING",
    "aliases": [
      "PLAIN DIA 406 PLAIN D/RING"
    ],
    "catalogueNote": "CMP-031 is a separate unspecified-coating D/Ring identity; leave untouched. Printed stock code is clipped."
  },
  "CMP-033": {
    "stockCode": "CMP-RG-409(G/LQ)",
    "originalDescription": "DIA 409 GOLD LACQUER RING",
    "aliases": [
      "DIA 409 GOLD LACQUER RING",
      "CMP-RG-409(G/LQ)"
    ]
  },
  "CMP-032": {
    "stockCode": "CMP-RG-409(PLAIN)",
    "originalDescription": "DIA 409 PLAIN RING",
    "aliases": [
      "DIA 409 PLAIN RING",
      "CMP-RG-409(PLAIN)"
    ]
  },
  "CMP-REG-032": {
    "stockCode": "CMP-RG-603(PLAIN)",
    "originalDescription": "DIA 603 PLAIN RING",
    "aliases": [
      "DIA 603 PLAIN RING",
      "CMP-RG-603(PLAIN)"
    ]
  },
  "CMP-REG-012": {
    "stockCode": "CMP-RG-603BT(C/LQ)",
    "originalDescription": "603 BISCUIT RING C/LQ",
    "aliases": [
      "603 BISCUIT RING C/LQ",
      "CMP-RG-603BT(C/LQ)"
    ]
  },
  "CMP-022": {
    "stockCode": "CMP-RG-611(PLAIN)",
    "originalDescription": "PLAIN 611 RING",
    "aliases": [
      "PLAIN 611 RING",
      "CMP-RG-611(PLAIN)"
    ]
  },
  "CMP-021": {
    "stockCode": "CMP-RG-700(G/LQ)",
    "originalDescription": "DIA 700 GOLD LACQUER RING",
    "aliases": [
      "DIA 700 GOLD LACQUER RING",
      "CMP-RG-700(G/LQ)"
    ]
  },
  "CMP-020": {
    "stockCode": "CMP-RG-700(PLAIN)",
    "originalDescription": "DIA 700 PLAIN RING",
    "aliases": [
      "DIA 700 PLAIN RING",
      "CMP-RG-700(PLAIN)"
    ]
  }
};
var additions = [
  {
    "id": "CMP-SHEET-P3-R01",
    "name": "",
    "nameFamily": "20L",
    "family": "20L",
    "partType": "Bottom",
    "coating": "P",
    "colour": "",
    "variant": "Pail",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 3, row 1",
    "originalDescription": "20L PAIL PLAIN END BOTTAM",
    "aliases": [
      "20L PAIL PLAIN END BOTTAM",
      "CMP-EB-20L(PLAIN)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-EB-20L(PLAIN)"
  },
  {
    "id": "CMP-SHEET-P3-R13",
    "name": "",
    "nameFamily": "409",
    "family": "409",
    "partType": "Bottom",
    "coating": "C/Lo",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 3, row 13",
    "originalDescription": "DIA 409 CLEAR LACQUER END BOTTOM",
    "aliases": [
      "DIA 409 CLEAR LACQUER END BOTTOM",
      "CMP-EB-409(C/LQ)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-EB-409(C/LQ)"
  },
  {
    "id": "CMP-SHEET-P3-R22",
    "name": "",
    "nameFamily": "611",
    "family": "611",
    "partType": "End",
    "coating": "C/Lo",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 3, row 22",
    "originalDescription": "CLEAR LACQUER 611 END",
    "aliases": [
      "CLEAR LACQUER 611 END",
      "CMP-EB-611(C/LQ)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-EB-611(C/LQ)"
  },
  {
    "id": "CMP-SHEET-P3-R23",
    "name": "",
    "nameFamily": "611",
    "family": "611",
    "partType": "End",
    "coating": "G/Lo",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 3, row 23",
    "originalDescription": "GLOD LACQUER 611 END",
    "aliases": [
      "GLOD LACQUER 611 END",
      "CMP-EB-611(G/LQ)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-EB-611(G/LQ)"
  },
  {
    "id": "CMP-SHEET-P3-R25",
    "name": "",
    "nameFamily": "700",
    "family": "700",
    "partType": "End",
    "coating": "C/Lo",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 3, row 25",
    "originalDescription": "CLEAR LACQUER 700 END",
    "aliases": [
      "CLEAR LACQUER 700 END",
      "CMP-EB-700(C/LQ)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-EB-700(C/LQ)"
  },
  {
    "id": "CMP-SHEET-P4-R02",
    "name": "",
    "nameFamily": "18L",
    "family": "18L",
    "partType": "Open Top",
    "coating": "P",
    "colour": "",
    "variant": "",
    "hole": 35,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 4, row 2",
    "originalDescription": "18 LIT PLAIN OPEN TOP WITH FLEXI MOUTH 35",
    "aliases": [
      "18 LIT PLAIN OPEN TOP WITH FLEXI MOUTH 35"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "opening": "flexispout"
  },
  {
    "id": "CMP-SHEET-P4-R14",
    "name": "",
    "nameFamily": "300",
    "family": "300",
    "partType": "Top",
    "coating": "C/Lo",
    "colour": "",
    "variant": "",
    "hole": 35,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 4, row 14",
    "originalDescription": "DIA 300 C/LQ END TOP WITH MOUTH 35MM",
    "aliases": [
      "DIA 300 C/LQ END TOP WITH MOUTH 35MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P4-R15",
    "name": "",
    "nameFamily": "300",
    "family": "300",
    "partType": "Top",
    "coating": "G/Lo",
    "colour": "",
    "variant": "",
    "hole": 35,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 4, row 15",
    "originalDescription": "DIA 300 G/LQ END TOP WITH MOUTH 35MM",
    "aliases": [
      "DIA 300 G/LQ END TOP WITH MOUTH 35MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P4-R17",
    "name": "",
    "nameFamily": "300",
    "family": "300",
    "partType": "Top",
    "coating": "P",
    "colour": "",
    "variant": "",
    "hole": 35,
    "tapered": true,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 4, row 17",
    "originalDescription": "DIA 300 PLAIN TAPPER WITH MOUTH 35MM END",
    "aliases": [
      "DIA 300 PLAIN TAPPER WITH MOUTH 35MM END"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P4-R18",
    "name": "",
    "nameFamily": "300",
    "family": "300",
    "partType": "Top",
    "coating": "P",
    "colour": "",
    "variant": "",
    "hole": 42,
    "tapered": true,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 4, row 18",
    "originalDescription": "DIA 300 PLAIN TAPPER WITH MOUTH 42MM END",
    "aliases": [
      "DIA 300 PLAIN TAPPER WITH MOUTH 42MM END"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P4-R28",
    "name": "",
    "nameFamily": "401",
    "family": "401",
    "partType": "Top",
    "coating": "G/Lo",
    "colour": "",
    "variant": "",
    "hole": 35,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 4, row 28",
    "originalDescription": "DIA 401 GOLD LACQUER MOUTH 35MM END TOP",
    "aliases": [
      "DIA 401 GOLD LACQUER MOUTH 35MM END TOP"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P5-R04",
    "name": "",
    "nameFamily": "401",
    "family": "401",
    "partType": "Top",
    "coating": "P",
    "colour": "",
    "variant": "",
    "hole": 42,
    "tapered": true,
    "pack": 1500,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 4",
    "originalDescription": "DIA 401 PLAIN TAPPER WITH MOUTH 42MM END\u2026",
    "aliases": [
      "DIA 401 PLAIN TAPPER WITH MOUTH 42MM END\u2026"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "packUnit": "box"
  },
  {
    "id": "CMP-SHEET-P5-R14",
    "name": "",
    "nameFamily": "Yam Cookies",
    "family": "Yam",
    "partType": "Top",
    "coating": "P",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 14",
    "originalDescription": "PLAIN YAM COOKIES END TOP",
    "aliases": [
      "PLAIN YAM COOKIES END TOP"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P5-R15",
    "name": "",
    "nameFamily": "39mm",
    "family": "39mm",
    "partType": "Inner Seal",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 15",
    "originalDescription": "39MM INNER SEAL",
    "aliases": [
      "39MM INNER SEAL",
      "CMP-IS-39MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-IS-39MM",
    "catalogueNote": "A red handwritten F-like mark appears beside this and the 48 mm row; its meaning is not established."
  },
  {
    "id": "CMP-SHEET-P5-R17",
    "name": "",
    "nameFamily": "60mm",
    "family": "60mm",
    "partType": "Inner Seal",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 17",
    "originalDescription": "60MM INNER SEAL",
    "aliases": [
      "60MM INNER SEAL",
      "CMP-IS-60MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-IS-60MM"
  },
  {
    "id": "CMP-SHEET-P5-R18",
    "name": "",
    "nameFamily": "17kg",
    "family": "17kg",
    "partType": "Plastic Handle",
    "coating": "As Listed",
    "colour": "",
    "variant": "ND",
    "hole": 0,
    "tapered": false,
    "pack": 1500,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 18",
    "originalDescription": "17KG (ND) PLASTIC HANDLE X 1500 PCS",
    "aliases": [
      "17KG (ND) PLASTIC HANDLE X 1500 PCS",
      "CMP-PH-17KG"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-PH-17KG",
    "packUnit": "bag"
  },
  {
    "id": "CMP-SHEET-P5-R19",
    "name": "",
    "nameFamily": "330mm",
    "family": "330mm",
    "partType": "Plastic Handle",
    "coating": "As Listed",
    "colour": "White",
    "variant": "JT",
    "hole": 0,
    "tapered": false,
    "pack": 1500,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 19",
    "originalDescription": "330MM (JT) WHITE PLASTIC HANDLE X 1500 PCS",
    "aliases": [
      "330MM (JT) WHITE PLASTIC HANDLE X 1500 PCS",
      "CMP-PH-330MM(JT)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-PH-330MM(JT)",
    "packUnit": "bag"
  },
  {
    "id": "CMP-SHEET-P5-R20",
    "name": "",
    "nameFamily": "330mm",
    "family": "330mm",
    "partType": "Plastic Handle",
    "coating": "As Listed",
    "colour": "Red",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1500,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 20",
    "originalDescription": "330MM RED PLASTIC HANDLE X 1500 PCS",
    "aliases": [
      "330MM RED PLASTIC HANDLE X 1500 PCS",
      "CMP-PH-330MM(RED)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-PH-330MM(RED)",
    "packUnit": "bag"
  },
  {
    "id": "CMP-SHEET-P5-R21",
    "name": "",
    "nameFamily": "380mm",
    "family": "380mm",
    "partType": "Plastic Handle",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1500,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 21",
    "originalDescription": "380MM PLASTIC HANDLE X 1500 PCS",
    "aliases": [
      "380MM PLASTIC HANDLE X 1500 PCS",
      "CMP-PH-380MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-PH-380MM",
    "packUnit": "bag"
  },
  {
    "id": "CMP-SHEET-P5-R22",
    "name": "",
    "nameFamily": "5kg",
    "family": "5kg",
    "partType": "Plastic Handle",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 4e3,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 22",
    "originalDescription": "5KG PLASTIC HANDLE X 4000 PCS",
    "aliases": [
      "5KG PLASTIC HANDLE X 4000 PCS",
      "CMP-PH-5KG"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-PH-5KG"
  },
  {
    "id": "CMP-SHEET-P5-R30",
    "name": "",
    "nameFamily": "409",
    "family": "409",
    "partType": "Ring",
    "coating": "C/Lo",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 500,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 5, row 30",
    "originalDescription": "DIA 409 CLEAR LACQUER RING",
    "aliases": [
      "DIA 409 CLEAR LACQUER RING",
      "CMP-RG-409(C/LQ)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-RG-409(C/LQ)",
    "packUnit": "bag"
  },
  {
    "id": "CMP-SHEET-P6-R07",
    "name": "",
    "nameFamily": "611",
    "family": "611",
    "partType": "Ring",
    "coating": "C/Lo",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 7",
    "originalDescription": "CLEAR LACQUER 611 RING",
    "aliases": [
      "CLEAR LACQUER 611 RING",
      "CMP-RG-611(C/LQ)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-RG-611(C/LQ)"
  },
  {
    "id": "CMP-SHEET-P6-R08",
    "name": "",
    "nameFamily": "611",
    "family": "611",
    "partType": "Ring",
    "coating": "G/Lo",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 600,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 8",
    "originalDescription": "GOLD LACQUER 611 RING",
    "aliases": [
      "GOLD LACQUER 611 RING",
      "CMP-RG-611(G/LQ)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-RG-611(G/LQ)"
  },
  {
    "id": "CMP-SHEET-P6-R10",
    "name": "",
    "nameFamily": "700",
    "family": "700",
    "partType": "Ring",
    "coating": "C/Lo",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 10",
    "originalDescription": "CLEAR LACQUER 700 RING",
    "aliases": [
      "CLEAR LACQUER 700 RING",
      "CMP-RG-700(C/LQ)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-RG-700(C/LQ)"
  },
  {
    "id": "CMP-SHEET-P6-R13",
    "name": "",
    "nameFamily": "39mm",
    "family": "39mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 3300,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 13",
    "originalDescription": "39MM SCREW CAP X 3300PCS",
    "aliases": [
      "39MM SCREW CAP X 3300PCS",
      "CMP-SC-39MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SC-39MM",
    "packUnit": "carton"
  },
  {
    "id": "CMP-SHEET-P6-R14",
    "name": "",
    "nameFamily": "39mm",
    "family": "39mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "",
    "variant": "H",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 14",
    "originalDescription": "39MM SCREW CAP (H)",
    "aliases": [
      "39MM SCREW CAP (H)",
      "CMP-SC-39MM (H)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SC-39MM (H)"
  },
  {
    "id": "CMP-SHEET-P6-R15",
    "name": "",
    "nameFamily": "42mm",
    "family": "42mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "Red",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1200,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 15",
    "originalDescription": "42MM RED SCREW CAP",
    "aliases": [
      "42MM RED SCREW CAP",
      "CMP-SC-42MM(RED)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SC-42MM(RED)",
    "packUnit": "carton"
  },
  {
    "id": "CMP-SHEET-P6-R16",
    "name": "",
    "nameFamily": "42mm",
    "family": "42mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "White",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1200,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 16",
    "originalDescription": "42MM WHITE SCREW CAP",
    "aliases": [
      "42MM WHITE SCREW CAP"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "packUnit": "carton"
  },
  {
    "id": "CMP-SHEET-P6-R17",
    "name": "",
    "nameFamily": "42mm",
    "family": "42mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "Yellow",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 17",
    "originalDescription": "42MM YELLOW SCREW CAP",
    "aliases": [
      "42MM YELLOW SCREW CAP"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P6-R18",
    "name": "",
    "nameFamily": "48mm",
    "family": "48mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 4e3,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 18",
    "originalDescription": "48MM SCREW CAP X 4000 PCS",
    "aliases": [
      "48MM SCREW CAP X 4000 PCS",
      "CMP-SC-48MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SC-48MM",
    "packUnit": "carton"
  },
  {
    "id": "CMP-SHEET-P6-R19",
    "name": "",
    "nameFamily": "48mm",
    "family": "48mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "",
    "variant": "Tall",
    "hole": 0,
    "tapered": false,
    "pack": 2100,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 19",
    "originalDescription": "48MM SCREW CAP TALL X 2100 PCS",
    "aliases": [
      "48MM SCREW CAP TALL X 2100 PCS",
      "CMP-SC-48MM TALL"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SC-48MM TALL",
    "packUnit": "carton"
  },
  {
    "id": "CMP-SHEET-P6-R20",
    "name": "",
    "nameFamily": "48mm",
    "family": "48mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "",
    "variant": "UM",
    "hole": 0,
    "tapered": false,
    "pack": 1500,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 20",
    "originalDescription": "48MM SCREW CAP X 1500 PCS (UM)",
    "aliases": [
      "48MM SCREW CAP X 1500 PCS (UM)",
      "CMP-SC-48MM(UM)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SC-48MM(UM)",
    "packUnit": "carton"
  },
  {
    "id": "CMP-SHEET-P6-R21",
    "name": "",
    "nameFamily": "60mm",
    "family": "60mm",
    "partType": "Screw Cap",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 21",
    "originalDescription": "60MM SCREW CAP",
    "aliases": [
      "60MM SCREW CAP",
      "CMP-SC-60MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SC-60MM"
  },
  {
    "id": "CMP-SHEET-P6-R23",
    "name": "",
    "nameFamily": "35mm",
    "family": "35mm",
    "partType": "Flexispout",
    "coating": "As Listed",
    "colour": "Red",
    "variant": "Special Size",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 23",
    "originalDescription": "35MM RED FLEXISPROUT - SPECIAL SIZE",
    "aliases": [
      "35MM RED FLEXISPROUT - SPECIAL SIZE"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P6-R24",
    "name": "",
    "nameFamily": "38mm",
    "family": "38mm",
    "partType": "Flexispout",
    "coating": "As Listed",
    "colour": "Red",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 24",
    "originalDescription": "38MM RED FLEXISPROUT",
    "aliases": [
      "38MM RED FLEXISPROUT",
      "CMP-SF-38MM(RED)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SF-38MM(RED)"
  },
  {
    "id": "CMP-SHEET-P6-R25",
    "name": "",
    "nameFamily": "42mm",
    "family": "42mm",
    "partType": "Flexispout",
    "coating": "As Listed",
    "colour": "Black",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 2e3,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 25",
    "originalDescription": "42MM BLACK FLEXISPROUT X 2000PCS",
    "aliases": [
      "42MM BLACK FLEXISPROUT X 2000PCS",
      "CMP-SF-42MM(BLACK)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SF-42MM(BLACK)",
    "packUnit": "carton"
  },
  {
    "id": "CMP-SHEET-P6-R26",
    "name": "",
    "nameFamily": "42mm",
    "family": "42mm",
    "partType": "Flexispout",
    "coating": "As Listed",
    "colour": "Red",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 26",
    "originalDescription": "42MM RED FLEXISPROUT",
    "aliases": [
      "42MM RED FLEXISPROUT",
      "CMP-SF-42MM(RED)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SF-42MM(RED)"
  },
  {
    "id": "CMP-SHEET-P6-R27",
    "name": "",
    "nameFamily": "42mm",
    "family": "42mm",
    "partType": "Flexispout",
    "coating": "As Listed",
    "colour": "White",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 2e3,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 27",
    "originalDescription": "42MM WHITE FLEXISPROUT X 2000PCS",
    "aliases": [
      "42MM WHITE FLEXISPROUT X 2000PCS",
      "CMP-SF-42MM(WHITE)"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SF-42MM(WHITE)",
    "packUnit": "carton"
  },
  {
    "id": "CMP-SHEET-P6-R28",
    "name": "",
    "nameFamily": "42mm",
    "family": "42mm",
    "partType": "Flexispout",
    "coating": "As Listed",
    "colour": "Yellow",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 28",
    "originalDescription": "42MM YELLOW FLEXISPROUT",
    "aliases": [
      "42MM YELLOW FLEXISPROUT"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1
  },
  {
    "id": "CMP-SHEET-P6-R29",
    "name": "",
    "nameFamily": "39mm",
    "family": "39mm",
    "partType": "Screw Neck",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 1600,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 29",
    "originalDescription": "39MM SCREW NECK X 1600 PCS",
    "aliases": [
      "39MM SCREW NECK X 1600 PCS",
      "CMP-SN-39MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SN-39MM"
  },
  {
    "id": "CMP-SHEET-P6-R30",
    "name": "",
    "nameFamily": "48mm",
    "family": "48mm",
    "partType": "Screw Neck",
    "coating": "As Listed",
    "colour": "",
    "variant": "",
    "hole": 0,
    "tapered": false,
    "pack": 2e3,
    "reference": "Stock Take Sheet 25/09/2026 \xB7 page 6, row 30",
    "originalDescription": "48MM SCREW NECK X 2000 PCS",
    "aliases": [
      "48MM SCREW NECK X 2000 PCS",
      "CMP-SN-48MM"
    ],
    "namingVersion": 2,
    "catalogueVersion": 1,
    "stockCode": "CMP-SN-48MM",
    "packUnit": "carton"
  }
];
var stockSheetAdditions = additions.map((c) => ({ ...c, name: standardName(c) }));
function enrichFromStockSheet(c) {
  if (c.catalogueVersion) return c;
  const entry = matched[c.id];
  if (!entry) return { ...c, catalogueVersion: 1 };
  return { ...c, ...entry, stockCode: c.stockCode || entry.stockCode, aliases: Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], ...entry.aliases ?? []])), catalogueVersion: 1 };
}
__name(enrichFromStockSheet, "enrichFromStockSheet");

// lib/catalogue-names.ts
var catalogueNames = {
  "CMP-001": {
    "name": "18L End Plain",
    "aliases": [
      "18L End P",
      "P .18L end",
      "P 18 L end",
      "P 18L end"
    ]
  },
  "CMP-002": {
    "name": "18L PH New",
    "aliases": [
      "18L PH New",
      "18L PH Baru"
    ]
  },
  "CMP-003": {
    "name": "18L PH S/Welding",
    "aliases": [
      "18L PH S/Welding"
    ]
  },
  "CMP-004": {
    "name": "18L End GLQ",
    "aliases": [
      "18L End G/Lo",
      "GLQ 18L end"
    ]
  },
  "CMP-005": {
    "name": "18L PH GLQ",
    "aliases": [
      "18L PH G/Lo"
    ]
  },
  "CMP-006": {
    "name": "18L PH S/Welding GLQ",
    "aliases": [
      "18L PH G/Lo S/Welding"
    ]
  },
  "CMP-007": {
    "name": "1G End",
    "aliases": [
      "1G End"
    ]
  },
  "CMP-008": {
    "name": "1G Top M35",
    "aliases": [
      "1G Top M35"
    ]
  },
  "CMP-009": {
    "name": "1G Top M39",
    "aliases": [
      "1G Top M39"
    ]
  },
  "CMP-010": {
    "name": "1G Top M42",
    "aliases": [
      "1G Top M42"
    ]
  },
  "CMP-011": {
    "name": "Open Top 1W/H",
    "aliases": [
      "Open Top 1W/H"
    ]
  },
  "CMP-012": {
    "name": "Open Top 2W/H",
    "aliases": [
      "Open Top 2W/H"
    ]
  },
  "CMP-013": {
    "name": "Open Top S/Welding",
    "aliases": [
      "Open Top S/Welding"
    ]
  },
  "CMP-014": {
    "name": "Open Top Cover",
    "aliases": [
      "Open Top Cover"
    ]
  },
  "CMP-015": {
    "name": "2kg Ink Cover Plain",
    "aliases": [
      "Ink Cover 2kg P"
    ]
  },
  "CMP-016": {
    "name": "2kg Ink Cover GLQ",
    "aliases": [
      "Ink Cover 2kg G/Lo"
    ]
  },
  "CMP-017": {
    "name": "213 Top M30",
    "aliases": [
      "213 Top M30"
    ]
  },
  "CMP-018": {
    "name": "202 End Plain",
    "aliases": [
      "202 End P"
    ]
  },
  "CMP-019": {
    "name": "202 Ring Plain",
    "aliases": [
      "202 Ring P"
    ]
  },
  "CMP-020": {
    "name": "700 Ring Plain",
    "aliases": [
      "700 Ring P"
    ]
  },
  "CMP-021": {
    "name": "700 Ring GLQ",
    "aliases": [
      "700 Ring G/Lo"
    ]
  },
  "CMP-022": {
    "name": "611 Ring Plain",
    "aliases": [
      "611 Ring P"
    ]
  },
  "CMP-023": {
    "name": "611 End Plain",
    "aliases": [
      "611 End P"
    ]
  },
  "CMP-024": {
    "name": "300 Top M35",
    "aliases": [
      "300 Top M35"
    ]
  },
  "CMP-025": {
    "name": "307 Top M35",
    "aliases": [
      "307 Top M35"
    ]
  },
  "CMP-026": {
    "name": "401 Top M35",
    "aliases": [
      "401 Top M35"
    ]
  },
  "CMP-027": {
    "name": "300 Ring Plain",
    "aliases": [
      "300 Ring P"
    ]
  },
  "CMP-028": {
    "name": "307 Ring Plain",
    "aliases": [
      "307 Ring P"
    ]
  },
  "CMP-029": {
    "name": "307 Ring GLQ",
    "aliases": [
      "307 Ring G/Lo"
    ]
  },
  "CMP-030": {
    "name": "401 Ring GLQ",
    "aliases": [
      "401 Ring G/Lo"
    ]
  },
  "CMP-031": {
    "name": "406 D/Ring",
    "aliases": [
      "406 D Ring"
    ]
  },
  "CMP-032": {
    "name": "409 Ring Plain",
    "aliases": [
      "409 Ring P",
      "P 409 ring"
    ]
  },
  "CMP-033": {
    "name": "409 Ring GLQ",
    "aliases": [
      "409 Ring G/Lo"
    ]
  },
  "CMP-034": {
    "name": "211 End Plain",
    "aliases": [
      "211 End P"
    ]
  },
  "CMP-035": {
    "name": "305 End CLQ",
    "aliases": [
      "305 End C/Lo"
    ]
  },
  "CMP-036": {
    "name": "401 End GLQ",
    "aliases": [
      "401 End G/Lo",
      "GLQ 401 end"
    ]
  },
  "CMP-037": {
    "name": "406 End CLQ",
    "aliases": [
      "406 End C/Lo"
    ]
  },
  "CMP-038": {
    "name": "409 End GLQ",
    "aliases": [
      "409 End G/Lo"
    ]
  },
  "CMP-039": {
    "name": "307 Top 2PC Plain M41",
    "aliases": [
      "307 Top 2PC P M41"
    ]
  },
  "CMP-040": {
    "name": "300 Top S/N39",
    "aliases": [
      "300 Top S/N39"
    ]
  },
  "CMP-041": {
    "name": "307 Top S/N39",
    "aliases": [
      "307 Top S/N39"
    ]
  },
  "CMP-042": {
    "name": "1L Top S/N39",
    "aliases": [
      "1L Top S/N39"
    ]
  },
  "CMP-043": {
    "name": "1L Top Plain M42",
    "aliases": [
      "1L Top P M42"
    ]
  },
  "CMP-044": {
    "name": "307 Top GLQ M35",
    "aliases": [
      "307 Top G/Lo M35"
    ]
  },
  "CMP-045": {
    "name": "307 Top GLQ M42",
    "aliases": [
      "307 Top G/Lo M42"
    ]
  },
  "CMP-046": {
    "name": "307 Top Plain M42",
    "aliases": [
      "307 Top P M42"
    ]
  },
  "CMP-047": {
    "name": "401 Top Plain M42",
    "aliases": [
      "401 Top P M42"
    ]
  },
  "CMP-048": {
    "name": "401 Top GLQ M42",
    "aliases": [
      "401 Top G/Lo M42"
    ]
  },
  "CMP-049": {
    "name": "603 End Plain",
    "aliases": [
      "603 End P"
    ]
  },
  "CMP-050": {
    "name": "603 End CLQ",
    "aliases": [
      "603 End C/Lo"
    ]
  },
  "CMP-051": {
    "name": "603 End GLQ",
    "aliases": [
      "603 End G/Lo"
    ]
  },
  "CMP-052": {
    "name": "603 End Tall",
    "aliases": [
      "603 End Tall"
    ]
  },
  "CMP-053": {
    "name": "603 Ring Biscuit",
    "aliases": [
      "603 Biskut Ring"
    ]
  },
  "CMP-054": {
    "name": "603 Ring Biasa",
    "aliases": [
      "603 Ring Biasa"
    ]
  },
  "CMP-055": {
    "name": "1L End Plain",
    "aliases": [
      "1L End P"
    ]
  },
  "CMP-056": {
    "name": "1L Top Plain M35",
    "aliases": [
      "1L Top P M35"
    ]
  },
  "CMP-057": {
    "name": "1L End GLQ",
    "aliases": [
      "1L End G/Lo"
    ]
  },
  "CMP-058": {
    "name": "1L Top GLQ M35",
    "aliases": [
      "1L Top G/Lo M35"
    ]
  },
  "CMP-059": {
    "name": "700 End PU Plain",
    "aliases": [
      "700 End PU P"
    ]
  },
  "CMP-060": {
    "name": "700 End PU GLQ",
    "aliases": [
      "700 End PU G/Lo"
    ]
  },
  "CMP-061": {
    "name": "700 Top PU Plain M35",
    "aliases": [
      "700 Top PU P M35"
    ]
  },
  "CMP-062": {
    "name": "700 Top PU Plain M42",
    "aliases": [
      "700 Top PU P M42"
    ]
  },
  "CMP-063": {
    "name": "700 Top PU Plain M48",
    "aliases": [
      "700 Top PU P M48"
    ]
  },
  "CMP-064": {
    "name": "603 Top PU Plain M42",
    "aliases": [
      "603 Top PU P M42"
    ]
  },
  "CMP-065": {
    "name": "300 End GLQ",
    "aliases": [
      "300 End G/Lo"
    ]
  },
  "CMP-066": {
    "name": "307 End GLQ",
    "aliases": [
      "307 End G/Lo",
      "GLQ 307 End",
      "GLQ 307 end"
    ]
  },
  "CMP-067": {
    "name": "404 End Plain",
    "aliases": [
      "404 End P"
    ]
  },
  "CMP-068": {
    "name": "404 Ring Plain",
    "aliases": [
      "404 Ring P"
    ]
  },
  "CMP-069": {
    "name": "307 Top Tapered Plain M35",
    "aliases": [
      "307 Top P M35 Tapper"
    ]
  },
  "CMP-070": {
    "name": "307 Top Tapered GLQ M35",
    "aliases": [
      "307 Top G/Lo M35 Tapper",
      "GLQ 307  Tapper Top 35"
    ]
  },
  "CMP-071": {
    "name": "401 Top Tapered Plain M35",
    "aliases": [
      "401 Top P M35 Tapper"
    ]
  },
  "CMP-072": {
    "name": "401 Top Tapered GLQ M35",
    "aliases": [
      "401 Top G/Lo M35 Tapper",
      "GLQ 401 Tapper Top 35"
    ]
  },
  "CMP-073": {
    "name": "401 Top Tapered GLQ M42",
    "aliases": [
      "401 Top G/Lo M42 Tapper"
    ]
  },
  "CMP-REG-001": {
    "name": "213 Top Dome",
    "aliases": [
      "213  Top Dom"
    ]
  },
  "CMP-REG-002": {
    "name": "48mm Inner Seal",
    "aliases": [
      "48 inner seal"
    ]
  },
  "CMP-REG-003": {
    "name": "5L Cover KTH",
    "aliases": [
      "5L Cover kTH",
      "5L cover  KTH"
    ]
  },
  "CMP-REG-004": {
    "name": "603 End Biscuit B/S CLQ",
    "aliases": [
      "B /S  CLQ 603 End Biskut",
      "B/S CLQ 603 End Biskut",
      "B/S CLQ 603 end Biskut",
      "B/S CLq 603 End Biskut",
      "B/S CLq 603 end Biskut"
    ]
  },
  "CMP-REG-005": {
    "name": "603 Cover Biscuit B/S CLQ",
    "aliases": [
      "B/S  CLQ  603 Cover  Biskut",
      "B/S  CLQ 603 Cover Biskut",
      "B/S CLQ 603  Cover Biskut",
      "B/S CLQ 603 Cover Biskut",
      "B/S CLq 603 Cover Biskut"
    ]
  },
  "CMP-REG-006": {
    "name": "603 End B/S CLQ",
    "aliases": [
      "B/S CLQ  603  End"
    ]
  },
  "CMP-REG-007": {
    "name": "401 End CLQ",
    "aliases": [
      "CLQ  401 End",
      "CLQ 401 End"
    ]
  },
  "CMP-REG-008": {
    "name": "603 End Tall CLQ",
    "aliases": [
      "CLQ  603 End Toll",
      "CLQ 603 end toll"
    ]
  },
  "CMP-REG-009": {
    "name": "1L End Rectangular CLQ",
    "aliases": [
      "CLQ 1L Rect end",
      "CLq 1 Rect end"
    ]
  },
  "CMP-REG-010": {
    "name": "307 End CLQ",
    "aliases": [
      "CLQ 307 End",
      "CLQ 307 end"
    ]
  },
  "CMP-REG-011": {
    "name": "603 End Biscuit CLQ",
    "aliases": [
      "CLQ 603  End Biskut"
    ]
  },
  "CMP-REG-012": {
    "name": "603 Ring Biscuit CLQ",
    "aliases": [
      "CLQ 603 Ring Biskut"
    ]
  },
  "CMP-REG-013": {
    "name": "5L Ring GLQ",
    "aliases": [
      "G LQ 5L ring",
      "GLQ 5L Ring",
      "GLq 5L ring"
    ]
  },
  "CMP-REG-014": {
    "name": "Yam Cookies Top GLQ",
    "aliases": [
      "GLQ  Yam cookies Top",
      "GLQ Yam cookies Top",
      "GLQ yam cookies Top"
    ]
  },
  "CMP-REG-015": {
    "name": "18L Top GLQ PH48",
    "aliases": [
      "GLQ 18L Top ph48"
    ]
  },
  "CMP-REG-016": {
    "name": "1L End Rectangular GLQ",
    "aliases": [
      "GLQ 1L Rect end"
    ]
  },
  "CMP-REG-017": {
    "name": "603 Cover Ink Can GLQ",
    "aliases": [
      "GLQ 603  ink can Cover",
      "GLQ 603 Cover ink cam",
      "GLq 603  ink con cover"
    ]
  },
  "CMP-REG-018": {
    "name": "213 Top Dome GLQ",
    "aliases": [
      "GLq 213 Top Dom"
    ]
  },
  "CMP-REG-019": {
    "name": "5L End Plain",
    "aliases": [
      "P  5L end",
      "P 5L end"
    ]
  },
  "CMP-REG-020": {
    "name": "Gallon End Plain",
    "aliases": [
      "P  Gallon end",
      "P Gallon end"
    ]
  },
  "CMP-REG-021": {
    "name": "18L Top Plain PH48",
    "aliases": [
      "P 18L Top ph48"
    ]
  },
  "CMP-REG-022": {
    "name": "1L End Rectangular Plain",
    "aliases": [
      "P 1L Rect end"
    ]
  },
  "CMP-REG-023": {
    "name": "213 Top Dome Plain",
    "aliases": [
      "P 213 Top Dom"
    ]
  },
  "CMP-REG-024": {
    "name": "307 End Plain",
    "aliases": [
      "P 307 End"
    ]
  },
  "CMP-REG-025": {
    "name": "406 D/Ring Plain",
    "aliases": [
      "P 406 D/ring",
      "P406 D/Ring"
    ]
  },
  "CMP-REG-026": {
    "name": "406 End Plain",
    "aliases": [
      "P 406 end"
    ]
  },
  "CMP-REG-027": {
    "name": "409 End Plain",
    "aliases": [
      "P 409 End",
      "P 409 end"
    ]
  },
  "CMP-REG-028": {
    "name": "48mm Inner Seal Plain",
    "aliases": [
      "P 48 inner seal",
      "48 Inner Seal Plain"
    ]
  },
  "CMP-REG-029": {
    "name": "5L Ear Plug Plain",
    "aliases": [
      "P 5L EAR pLug",
      "P 5L EAR plug"
    ]
  },
  "CMP-REG-030": {
    "name": "5L Ring Plain",
    "aliases": [
      "P 5L Ring",
      "P 5L ring"
    ]
  },
  "CMP-REG-031": {
    "name": "603 Ring Biasa Plain",
    "aliases": [
      "P 603 Ring Biasa",
      "P 603 ring biasa"
    ]
  },
  "CMP-REG-032": {
    "name": "603 Ring Plain",
    "aliases": [
      "P 603 ring"
    ]
  },
  "CMP-REG-033": {
    "name": "611 Cover Plain",
    "aliases": [
      "P 611 Cover",
      "P611 cover"
    ]
  },
  "CMP-REG-034": {
    "name": "Saddle Besar Plain",
    "aliases": [
      "P saddle besar"
    ]
  },
  "CMP-REG-035": {
    "name": "406 Cover D/R WC",
    "aliases": [
      "WC 406 D/R Cover"
    ]
  },
  "CMP-REG-036": {
    "name": "406 Cover WC",
    "aliases": [
      "WC 406 cover"
    ]
  },
  "CMP-REG-037": {
    "name": "409 Cover WC",
    "aliases": [
      "WC 409 Cover"
    ]
  },
  "CMP-REG-038": {
    "name": "5L Cover WC",
    "aliases": [
      "WC 5L Cover",
      "WC 5L cover"
    ]
  },
  "CMP-REG-039": {
    "name": "611 Cover WC",
    "aliases": [
      "WC 611 Cover"
    ]
  },
  "CMP-401-END-PLAIN": {
    "name": "401 End Plain",
    "aliases": [
      "401 End P"
    ]
  }
};
var registerComponents = [
  {
    "id": "CMP-REG-001",
    "name": "213 Top Dome",
    "family": "213",
    "coating": "As Listed",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-002",
    "name": "48mm Inner Seal",
    "family": "48",
    "coating": "As Listed",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-003",
    "name": "5L Cover KTH",
    "family": "5L",
    "coating": "As Listed",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-004",
    "name": "603 End Biscuit B/S CLQ",
    "family": "603",
    "coating": "B/S CLQ",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-005",
    "name": "603 Cover Biscuit B/S CLQ",
    "family": "603",
    "coating": "B/S CLQ",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-006",
    "name": "603 End B/S CLQ",
    "family": "603",
    "coating": "B/S CLQ",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-007",
    "name": "401 End CLQ",
    "family": "401",
    "coating": "C/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-008",
    "name": "603 End Tall CLQ",
    "family": "603",
    "coating": "C/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-009",
    "name": "1L End Rectangular CLQ",
    "family": "1L",
    "coating": "C/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-010",
    "name": "307 End CLQ",
    "family": "307",
    "coating": "C/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-011",
    "name": "603 End Biscuit CLQ",
    "family": "603",
    "coating": "C/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-012",
    "name": "603 Ring Biscuit CLQ",
    "family": "603",
    "coating": "C/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-013",
    "name": "5L Ring GLQ",
    "family": "5L",
    "coating": "G/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-014",
    "name": "Yam Cookies Top GLQ",
    "family": "Yam",
    "coating": "G/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-015",
    "name": "18L Top GLQ PH48",
    "family": "18L",
    "coating": "G/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-016",
    "name": "1L End Rectangular GLQ",
    "family": "1L",
    "coating": "G/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-017",
    "name": "603 Cover Ink Can GLQ",
    "family": "603",
    "coating": "G/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-018",
    "name": "213 Top Dome GLQ",
    "family": "213",
    "coating": "G/Lo",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-019",
    "name": "5L End Plain",
    "family": "5L",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-020",
    "name": "Gallon End Plain",
    "family": "Gallon",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-021",
    "name": "18L Top Plain PH48",
    "family": "18L",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-022",
    "name": "1L End Rectangular Plain",
    "family": "1L",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-023",
    "name": "213 Top Dome Plain",
    "family": "213",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-024",
    "name": "307 End Plain",
    "family": "307",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-025",
    "name": "406 D/Ring Plain",
    "family": "406",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-026",
    "name": "406 End Plain",
    "family": "406",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-027",
    "name": "409 End Plain",
    "family": "409",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-028",
    "name": "48mm Inner Seal Plain",
    "family": "48",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-029",
    "name": "5L Ear Plug Plain",
    "family": "5L",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-030",
    "name": "5L Ring Plain",
    "family": "5L",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-031",
    "name": "603 Ring Biasa Plain",
    "family": "603",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-032",
    "name": "603 Ring Plain",
    "family": "603",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-033",
    "name": "611 Cover Plain",
    "family": "611",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-034",
    "name": "Saddle Besar Plain",
    "family": "Saddle",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-035",
    "name": "406 Cover D/R WC",
    "family": "406",
    "coating": "WC",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-036",
    "name": "406 Cover WC",
    "family": "406",
    "coating": "WC",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-037",
    "name": "409 Cover WC",
    "family": "409",
    "coating": "WC",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-038",
    "name": "5L Cover WC",
    "family": "5L",
    "coating": "WC",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-REG-039",
    "name": "611 Cover WC",
    "family": "611",
    "coating": "WC",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "transfer-register-2026-09-24.csv \xB7 component description"
  },
  {
    "id": "CMP-401-END-PLAIN",
    "name": "401 End Plain",
    "family": "401",
    "coating": "P",
    "hole": 0,
    "tapered": false,
    "pack": 1,
    "reference": "Confirmed by Eugene \xB7 401 plain end for M42"
  }
];

// lib/catalog.ts
var rows = [
  ["18L End P", 300, 1],
  ["18L PH New", 220, 1],
  ["18L PH S/Welding", 70, 1],
  ["18L End G/Lo", 300, 1],
  ["18L PH G/Lo", 220, 1],
  ["18L PH G/Lo S/Welding", 70, 1],
  ["1G End", 700, 1],
  ["1G Top M35", 200, 1],
  ["1G Top M39", 170, 1],
  ["1G Top M42", 200, 1],
  ["Open Top 1W/H", 120, 1],
  ["Open Top 2W/H", 110, 1],
  ["Open Top S/Welding", 200, 1],
  ["Open Top Cover", 50, 1],
  ["Ink Cover 2kg P", 200, 1],
  ["Ink Cover 2kg G/Lo", 200, 1],
  ["213 Top M30", 3e3, 1],
  ["202 End P", 2500, 1],
  ["202 Ring P", 3500, 1],
  ["700 Ring P", 250, 2],
  ["700 Ring G/Lo", 250, 2],
  ["611 Ring P", 200, 2],
  ["611 End P", 600, 2],
  ["300 Top M35", 3e3, 2],
  ["307 Top M35", 2500, 2],
  ["401 Top M35", 2e3, 2],
  ["300 Ring P", 2e3, 2],
  ["307 Ring P", 1500, 2],
  ["307 Ring G/Lo", 1500, 2],
  ["401 Ring G/Lo", 1500, 2],
  ["406 D Ring", 500, 2],
  ["409 Ring P", 500, 2],
  ["409 Ring G/Lo", 500, 2],
  ["211 End P", 2500, 2],
  ["305 End C/Lo", 2500, 2],
  ["401 End G/Lo", 2200, 2],
  ["406 End C/Lo", 2200, 2],
  ["409 End G/Lo", 2200, 2],
  ["307 Top 2PC P M41", 2500, 2],
  ["300 Top S/N39", 500, 2],
  ["307 Top S/N39", 700, 2],
  ["1L Top S/N39", 500, 2],
  ["1L Top P M42", 2e3, 2],
  ["307 Top G/Lo M35", 2e3, 2],
  ["307 Top G/Lo M42", 2e3, 2],
  ["307 Top P M42", 2e3, 2],
  ["401 Top P M42", 2e3, 2],
  ["401 Top G/Lo M42", 2e3, 2],
  ["603 End P", 1e3, 2],
  ["603 End C/Lo", 1e3, 2],
  ["603 End G/Lo", 1e3, 2],
  ["603 End Tall", 250, 2],
  ["603 Biskut Ring", 600, 2],
  ["603 Ring Biasa", 200, 2],
  ["1L End P", 2500, 2],
  ["1L Top P M35", 2e3, 2],
  ["1L End G/Lo", 2500, 2],
  ["1L Top G/Lo M35", 2e3, 2],
  ["700 End PU P", 1e3, 3],
  ["700 End PU G/Lo", 1e3, 3],
  ["700 Top PU P M35", 500, 3],
  ["700 Top PU P M42", 500, 3],
  ["700 Top PU P M48", 500, 3],
  ["603 Top PU P M42", 500, 3],
  ["300 End G/Lo", 230, 3],
  ["307 End G/Lo", 230, 3],
  ["404 End P", 230, 3],
  ["404 Ring P", 70, 3],
  ["307 Top P M35 Tapper", 1500, 3],
  ["307 Top G/Lo M35 Tapper", 1500, 3],
  ["401 Top P M35 Tapper", 1500, 3],
  ["401 Top G/Lo M35 Tapper", 1500, 3],
  ["401 Top G/Lo M42 Tapper", 1500, 3]
];
function correctCatalogueEntry(component) {
  const c = { ...component };
  if (c.id === "CMP-002" && c.name === "18L PH Baru") c.name = "18L PH New";
  if (["CMP-040", "CMP-041", "CMP-042"].includes(c.id) && /\bS\/N39\b/.test(c.name) && (c.hole === 0 || c.hole === 39)) {
    c.hole = 39;
    c.opening = "screw-neck";
    c.punched = true;
  }
  if (c.tapered || c.id === "CMP-039") c.uncommon = true;
  if (!c.namingVersion) {
    const entry = catalogueNames[c.id];
    const original = c.name;
    const key = /* @__PURE__ */ __name((value) => value.toLowerCase().replace(/\s+/g, " ").trim(), "key");
    if (entry && [entry.name, ...entry.aliases].some((name) => key(name) === key(original))) c.name = entry.name;
    else c.name = c.name.replace(/\s+/g, " ").trim();
    c.aliases = Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], ...entry?.aliases ?? [], original]));
    c.namingVersion = 1;
  }
  if ((c.namingVersion ?? 0) < NAMING_VERSION) {
    const entry = catalogueNames[c.id], key = /* @__PURE__ */ __name((value) => value.toLowerCase().replace(/\s+/g, " ").trim(), "key");
    const recognized = entry && [entry.name, ...entry.aliases].some((name) => key(name) === key(c.name));
    if (recognized) {
      const original = c.name;
      Object.assign(c, nameFields(c));
      if (c.partType) c.name = standardName(c);
      c.aliases = Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], original]));
    }
    c.namingVersion = NAMING_VERSION;
  }
  if (["CMP-REG-002", "CMP-REG-028"].includes(c.id) && /^48 Inner Seal(?: Plain)?$/i.test(c.name)) {
    c.aliases = Array.from(/* @__PURE__ */ new Set([...c.aliases ?? [], c.name]));
    c.name = c.name.replace(/^48 /, "48mm ");
    c.nameFamily = "48mm";
  }
  return renameDiameter(enrichFromStockSheet(c));
}
__name(correctCatalogueEntry, "correctCatalogueEntry");
var originalCatalogue = [...rows.map(([name, pack, page], i) => ({ id: `CMP-${String(i + 1).padStart(3, "0")}`, name, family: name.startsWith("Open") ? "Open Top" : name.startsWith("Ink") ? "Ink" : name.split(" ")[0], coating: name.includes("G/Lo") ? "G/Lo" : name.includes("C/Lo") ? "C/Lo" : /\bP\b/.test(name) ? "P" : "As Listed", hole: Number(name.match(/\bM(\d+)/)?.[1] || 0), tapered: name.includes("Tapper"), pack, reference: `Component - Manicudar.pdf \xB7 page ${page}` })), ...registerComponents.map((c) => ({ ...c, .../\bPH48\b/.test(c.name) ? { specificationCode: "PH48" } : {} })), ...stockSheetAdditions].map(correctCatalogueEntry);
for (const c of originalCatalogue) {
  if (["CMP-008", "CMP-009", "CMP-010"].includes(c.id)) c.sourceId = "CMP-007";
}
originalCatalogue.find((c) => c.id === "CMP-047").sourceId = "CMP-401-END-PLAIN";
originalCatalogue.find((c) => c.id === "CMP-048").sourceId = "CMP-036";
var finalizeCatalogue = /* @__PURE__ */ __name((components) => mergeCatalogue(confirmed700Processing(confirmed904Welding(completeOpenTopFinishes(completeEndFinishes(confirmedProcessing(components)))))).map(normalizeDescription), "finalizeCatalogue");
var catalogue = assignProductCodes(finalizeCatalogue(originalCatalogue));
function catalogueChanges(existing) {
  const corrected = finalizeCatalogue(existing.map(correctCatalogueEntry));
  const existingCount = existing.length;
  const proposedNames = corrected.map((c) => c.name.toLowerCase());
  for (let i = 0; i < existingCount; i++) {
    if (!corrected[i].mergedInto && !corrected[i].retired && corrected[i].name !== existing[i].name && proposedNames.some((name, j) => j !== i && !corrected[j].mergedInto && !corrected[j].retired && name === proposedNames[i])) corrected[i].name = existing[i].name;
  }
  const additions2 = [...corrected.slice(existingCount), ...catalogue.filter((seed) => !corrected.some((c) => c.id === seed.id || c.name.toLowerCase() === seed.name.toLowerCase())).map((c) => ({ ...c, ...c.generatedStockCode ? { stockCode: void 0 } : {} }))];
  const all = [...corrected, ...additions2];
  for (const output of corrected.slice(0, existingCount)) {
    if (existing.find((c) => c.id === output.id)?.namingVersion || output.sourceId) continue;
    const sourceName = output.id === "CMP-047" ? "401 End Plain" : output.id === "CMP-048" ? "401 End GLQ" : void 0;
    const sourceId = output.id === "CMP-047" ? "CMP-401-END-PLAIN" : output.id === "CMP-048" ? "CMP-036" : void 0;
    const compatible = /* @__PURE__ */ __name((c) => c.family === "401" && c.coating === output.coating && c.hole === 0 && !c.punched, "compatible");
    const source = all.find((c) => c.id === sourceId && compatible(c)) ?? all.find((c) => c.name === sourceName && compatible(c));
    if (source) output.sourceId = source.id;
  }
  const assigned = assignProductCodes([...corrected.slice(0, existingCount), ...additions2]);
  return { updates: assigned.slice(0, existingCount).filter((c, i) => JSON.stringify(c) !== JSON.stringify(existing[i])), additions: assigned.slice(existingCount) };
}
__name(catalogueChanges, "catalogueChanges");
var initialPics = ["Aung King", "Nadia", "Lina", "Lalit", "Yati", "Eugene", "Manicudar"];

// lib/types.ts
var names = { punching: "Component Processing", production: "Production", incoming: "Delivery From Main Factory", issue: "Issue to Production", return: "Return to Component Processing", punch: "Processing", usage: "Production Usage", count: "Stock Count", receipt: "Transfer Received", cancel: "Transfer Cancelled", component: "Component Updated", pic: "PIC Added", "process-map": "Processing Setup", "component-merge": "Component Merged", correction: "Entry Corrected", "bulk-count": "Stocktake", recipe: "Recipe Updated", minimum: "Minimum Stock Updated", plan: "Production Plan" };
var quantity = /* @__PURE__ */ __name((state, id, location) => state.stocks.find((s) => s.componentId === canonicalComponentId(id) && s.location === location)?.quantity || 0, "quantity");
var isPunched = /* @__PURE__ */ __name((c) => c.hole > 0 || c.punched === true, "isPunched");
var isProcessingSource = /* @__PURE__ */ __name((c) => !c.retired && !c.mergedInto && !c.sourceId && isEnd(c) && !isPunched(c), "isProcessingSource");
function compatibleProcessing(source, output) {
  return source.id !== output.id && isProcessingSource(source) && !output.retired && !output.mergedInto && !isEnd(output) && source.family === output.family && sameCoating(source, output);
}
__name(compatibleProcessing, "compatibleProcessing");
function configuredPunchingSource(components, outputId) {
  const output = components.find((c) => c.id === outputId), source = components.find((c) => c.id === output?.sourceId);
  return output && source && compatibleProcessing(source, output) ? source : void 0;
}
__name(configuredPunchingSource, "configuredPunchingSource");
var sameCoating = /* @__PURE__ */ __name((source, output) => source.coating !== "As Listed" && output.coating !== "As Listed" && source.coating === output.coating, "sameCoating");

// lib/roles.ts
var picRoles = {
  Manicudar: "punching",
  "Aung King": "production",
  Eugene: "admin"
};
var roleOf = /* @__PURE__ */ __name((pic) => Object.hasOwn(picRoles, pic) ? picRoles[pic] : void 0, "roleOf");
var receivingArea = /* @__PURE__ */ __name((transfer) => transfer.kind === "issue" ? "production" : "punching", "receivingArea");
var sendingArea = /* @__PURE__ */ __name((transfer) => transfer.kind === "return" ? "production" : "punching", "sendingArea");
function canAct(pic, kind, context = {}) {
  const role = roleOf(pic);
  if (!role) return false;
  if (!["incoming", "issue", "return", "receipt", "punch", "usage", "count", "cancel", "component", "pic", "process-map", "correction", "bulk-count", "recipe", "minimum", "plan"].includes(kind)) return false;
  if (role === "admin") return true;
  if (["component", "pic", "process-map", "correction", "bulk-count", "recipe", "minimum", "plan"].includes(kind)) return false;
  if (kind === "count") return context.location === role;
  if (kind === "receipt") return !!context.transfer && receivingArea(context.transfer) === role;
  if (kind === "cancel") return !!context.transfer && sendingArea(context.transfer) === role;
  return role === "punching" ? ["incoming", "issue", "punch"].includes(kind) : ["usage", "return"].includes(kind);
}
__name(canAct, "canAct");

// lib/process-mapping.ts
var mappingCandidates = /* @__PURE__ */ __name((components, sourceId) => {
  const source = components.find((c) => c.id === sourceId);
  return source && isProcessingSource(source) ? components.filter((c) => !c.retired && !c.mergedInto && c.id !== source.id && !isEnd(c) && c.family === source.family).sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true })) : [];
}, "mappingCandidates");
var compatibleOutput = /* @__PURE__ */ __name((source, output) => compatibleProcessing(source, output), "compatibleOutput");
var mappingSnapshot = /* @__PURE__ */ __name((components, sourceId) => mappingCandidates(components, sourceId).map((c) => ({ componentId: c.id, sourceId: c.sourceId ?? null })), "mappingSnapshot");

// lib/component-groups.ts
var closureType = /^(?:(?:Plastic |Flexi ?)?Spout|Flexispout|Flexisprout|Screw Neck|Screw Cap|Inner Seal)$/i;
function componentGroup(c) {
  const type = c.partType?.trim() || c.name.match(/^\d+\s*(?:mm|kg)?\s+(Plastic Handle|Flexispout|Flexi Spout|Flexisprout|Plastic Spout|Spout|Screw Neck|Screw Cap|Inner Seal)\b/i)?.[1] || "";
  if (/^Bridge Handles?$/i.test(type) || /\bBridge Handle\b/i.test(c.name)) return "Accessories";
  if (/^Plastic Handles?$/i.test(type)) return "Plastic Handles";
  if (closureType.test(type)) return "Closures";
  return c.family === "Ink" ? "Ink Cover" : c.family;
}
__name(componentGroup, "componentGroup");
function componentSize(c) {
  const raw = (c.nameFamily || c.family).trim();
  const size = raw.match(/^(\d+(?:\.\d+)?)\s*(mm|kg)?$/i);
  if (size) return `${size[1]}${size[2]?.toLowerCase() || (componentGroup(c) === "Closures" ? "mm" : "")}`;
  return raw;
}
__name(componentSize, "componentSize");

// lib/processing-materials.ts
function processingRequirements(source, output) {
  if (!source || !output) return [];
  if (output.recipe) return output.recipe.materials.map((r) => ({ kind: `part:${r.componentId}`, label: r.label, partType: r.partType, componentId: r.componentId, perPiece: r.perPiece }));
  if (output.family === "700" && output.partType === "PH") return [
    { kind: "handle", label: "5kg Plastic Handle", partType: "Plastic Handle", componentId: "CMP-SHEET-P5-R22", perPiece: 1 },
    { kind: "saddle", label: "Saddle", partType: "Saddle", componentId: "CMP-REG-034", perPiece: 1 }
  ];
  if (output.processingMode === "handle-welding") {
    const wireCount = output.partType === "Open Top" ? Number(output.variant?.match(/([12])\s*W\s*\/\s*H/i)?.[1] ?? 0) : 0;
    return [{ kind: "handle", label: wireCount ? "Metal Wire" : "17kg Plastic Handle", partType: wireCount ? "Metal Wire" : "Plastic Handle", componentId: wireCount ? "CMP-ACC-METAL-WIRE" : "CMP-SHEET-P5-R18", perPiece: wireCount || 1 }, { kind: "saddle", label: "Saddle", partType: "Saddle", componentId: "CMP-REG-034", perPiece: wireCount || 1 }];
  }
  if (output.family === "904") return [];
  const isOneGallon = /* @__PURE__ */ __name((c) => /^(?:402|1\s*g|(?:1\s*)?gallon)$/i.test(c.family.trim()), "isOneGallon");
  const needsBridge = isOneGallon(source) && isOneGallon(output) && (source.partType === "End" || /\bEnds?\b/i.test(source.name)) && (output.partType === "Top" || /\bTop\b/i.test(output.name));
  const rows2 = needsBridge ? [{ kind: "bridge", label: "Bridge Handle", partType: "Bridge Handle" }] : [];
  return rows2;
}
__name(processingRequirements, "processingRequirements");
var processingRecipeKey = /* @__PURE__ */ __name((source, output) => JSON.stringify([source?.id, output?.recipe?.version ?? 0, processingRequirements(source, output)]), "processingRecipeKey");
function materialCandidates(components, requirement) {
  return components.filter((c) => !c.retired && !c.mergedInto && (!requirement.componentId || c.id === requirement.componentId) && (c.partType?.toLowerCase() === requirement.partType.toLowerCase() || !c.partType && new RegExp(`\\b${requirement.partType}\\b`, "i").test(c.name)) && (!requirement.size || componentSize(c) === `${requirement.size}mm`)).sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true }));
}
__name(materialCandidates, "materialCandidates");
function validateMaterials(state, source, output, good, rows2, reason) {
  const errors = {}, requirements = processingRequirements(source, output);
  if (!Array.isArray(rows2)) {
    if (requirements.length) errors["Components Used"] = "Review the required components before saving.";
    return errors;
  }
  if (rows2.length !== requirements.length || new Set(rows2.map((r) => r?.kind)).size !== requirements.length) errors["Components Used"] = "Review the required components before saving.";
  const seen = /* @__PURE__ */ new Set();
  for (const requirement of requirements) {
    const key = `Material ${requirement.kind}`, row = rows2.find((r) => r?.kind === requirement.kind), candidate = materialCandidates(state.components, requirement).find((c) => c.id === row?.componentId);
    if ((row?.quantity > 0 || row?.componentId) && (!candidate || candidate.id === source?.id || candidate.id === output?.id || seen.has(candidate.id))) errors[key] = `Choose the exact ${requirement.label.toLowerCase()} used.`;
    if (candidate) seen.add(candidate.id);
    const required = good * (requirement.perPiece ?? 1);
    if (!row || !Number.isSafeInteger(row.quantity) || row.quantity < required || row.quantity > 1e7) errors[key] = `Use at least ${required.toLocaleString()} pieces, plus any extra parts used.`;
    else if (candidate && row.quantity > (state.stocks.find((s) => s.componentId === candidate.id && s.location === "punching")?.quantity ?? 0)) errors[key] = `${candidate.name}: only ${(state.stocks.find((s) => s.componentId === candidate.id && s.location === "punching")?.quantity ?? 0).toLocaleString()} pieces available.`;
  }
  if (requirements.some((r) => rows2.find((row) => row?.kind === r.kind)?.quantity > good * (r.perPiece ?? 1)) && (typeof reason !== "string" || !reason.trim())) errors["Extra Parts Reason"] = "Explain the extra components used or damaged.";
  return errors;
}
__name(validateMaterials, "validateMaterials");

// lib/processing-batch.ts
function processingRows(input) {
  return input.processingLines !== void 0 ? Array.isArray(input.processingLines) ? input.processingLines : [] : [input];
}
__name(processingRows, "processingRows");
function processingDeductions(state, rows2) {
  const deductions = /* @__PURE__ */ new Map();
  const add = /* @__PURE__ */ __name((id, n) => {
    if (id && Number.isSafeInteger(n) && n >= 0) deductions.set(id, (deductions.get(id) ?? 0) + n);
  }, "add");
  for (const row of rows2) {
    if (!row) continue;
    const source = configuredPunchingSource(state.components, row.outputId);
    if (source) add(source.id, row.good + row.rejected);
    for (const r of Array.isArray(row.materials) ? row.materials : []) if (r) add(r.componentId, r.quantity);
  }
  return deductions;
}
__name(processingDeductions, "processingDeductions");
function validateProcessing(state, input) {
  const errors = {}, rows2 = processingRows(input), batch = input.processingLines !== void 0, seen = /* @__PURE__ */ new Set();
  if (!rows2.length || rows2.length > 30) return { "Processing Components": "Add between 1 and 30 finished components." };
  const find = /* @__PURE__ */ __name((id) => state.components.find((c) => c.id === id), "find");
  rows2.forEach((raw, index) => {
    const row = raw ?? {}, prefix = batch ? `Processing ${index + 1} ` : "", key = /* @__PURE__ */ __name((label) => prefix + label, "key");
    const output = find(row.outputId), source = configuredPunchingSource(state.components, row.outputId);
    if (!output || isEnd(output)) errors[key("Finished Component")] = "Choose a finished component. Ends are entered or adjusted in Stock Balances.";
    else if (!source) errors[key("Finished Component")] = "Confirm the starting component and same coating in Components before processing.";
    else if (row.sourceId !== void 0 && row.sourceId !== source.id) errors[key("Finished Component")] = "The starting component has changed. Review this finished component again.";
    if (output && source && row.recipeKey !== void 0 && row.recipeKey !== processingRecipeKey(source, output)) errors[key("Finished Component")] = "The recipe changed. Review this component again.";
    if (seen.has(row.outputId)) errors[key("Finished Component")] = "This finished component is already listed. Combine its quantities.";
    seen.add(row.outputId);
    const valid = /* @__PURE__ */ __name((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e7, "valid");
    for (const field of ["good", "rejected"]) if (!valid(row[field])) errors[key(field === "good" ? "Good Pieces" : "Rejected Pieces")] = "Enter a whole number from 0 to 10,000,000.";
    if (valid(row.good) && valid(row.rejected) && row.good + row.rejected === 0) errors[key("Good Pieces")] = "Enter the good or rejected quantity.";
    if (row.rejected > 0 && (typeof row.remarks !== "string" || !row.remarks.trim())) errors[key("Reason for Rejection (Required)")] = "Enter a reason for the rejected pieces.";
    if (typeof row.remarks === "string" && row.remarks.length > 500) errors[key("Reason for Rejection (Required)")] = "Keep the reason within 500 characters.";
    if (source && output && valid(row.good)) for (const [field, message] of Object.entries(validateMaterials(state, source, output, row.good, row.materials ?? [], row.materialReason))) errors[key(field)] = message;
    if (row.materialReason !== void 0 && (typeof row.materialReason !== "string" || row.materialReason.length > 500)) errors[key("Extra Parts Reason")] = "Keep the extra parts reason within 500 characters.";
  });
  for (const [id, total] of processingDeductions(state, rows2)) {
    const available = quantity(state, id, "punching");
    if (total > available) errors["Combined Stock Check"] = `${find(id)?.name ?? id}: ${total.toLocaleString()} pieces needed across this entry, but only ${available.toLocaleString()} available.`;
  }
  return errors;
}
__name(validateProcessing, "validateProcessing");

// lib/operation-errors.ts
var InputError = class extends Error {
  constructor() {
    super(...arguments);
    this.status = 400;
  }
  static {
    __name(this, "InputError");
  }
};
var PermissionError = class extends InputError {
  constructor() {
    super(...arguments);
    this.status = 403;
  }
  static {
    __name(this, "PermissionError");
  }
};

// lib/management-data.ts
var componentLabel = /* @__PURE__ */ __name((state, id) => componentById(recordComponents(state), id)?.name ?? id, "componentLabel");
var recipeKey = /* @__PURE__ */ __name((state, output) => processingRecipeKey(configuredPunchingSource(state.components, output.id), output), "recipeKey");
function recipeParts(state, output) {
  const source = configuredPunchingSource(state.components, output.id);
  return processingRequirements(source, output).map((r) => {
    const candidates = materialCandidates(state.components, r);
    return { componentId: r.componentId ?? (candidates.length === 1 ? candidates[0].id : ""), perPiece: r.perPiece ?? 1, label: r.label };
  });
}
__name(recipeParts, "recipeParts");
var allowedRecipePart = /* @__PURE__ */ __name((c) => !c.retired && !c.mergedInto && ["Plastic Handle", "Metal Wire", "Bridge Handle", "Saddle", "Ear Plug"].includes(c.partType ?? ""), "allowedRecipePart");
function productionRequirement(state, lines) {
  const materials = /* @__PURE__ */ new Map(), errors = [];
  const add = /* @__PURE__ */ __name((id, n) => materials.set(id, (materials.get(id) ?? 0) + n), "add");
  const combined = /* @__PURE__ */ new Map();
  for (const line of lines) {
    const id = canonicalComponentId(line.outputId), existing = combined.get(id);
    if (existing) {
      existing.quantity += line.quantity;
      errors.push("Combine duplicate finished components into one line.");
    } else combined.set(id, { ...line, outputId: id });
  }
  const rows2 = [...combined.values()].map((line) => {
    const output = state.components.find((c) => c.id === line.outputId), source = configuredPunchingSource(state.components, line.outputId);
    const available = output ? quantity(state, output.id, "punching") + quantity(state, output.id, "production") : 0;
    const toMake = Math.max(0, line.quantity - available);
    if (!output || !source) errors.push("Choose a finished component with a recipe.");
    else if (toMake) {
      add(source.id, toMake);
      for (const part of recipeParts(state, output)) {
        if (!part.componentId) errors.push(`${output.name}: confirm the ${part.label}.`);
        else add(part.componentId, toMake * part.perPiece);
      }
    }
    return { ...line, name: output?.name ?? "", available, toMake };
  });
  return { rows: rows2, errors, materials: [...materials].map(([componentId, required]) => ({ componentId, name: componentLabel(state, componentId), required, available: quantity(state, componentId, "punching"), short: Math.max(0, required - quantity(state, componentId, "punching")) })) };
}
__name(productionRequirement, "productionRequirement");
function latestPlans(events) {
  const plans3 = /* @__PURE__ */ new Map();
  for (const e of events) if (e.kind === "plan") plans3.set(e.payload.planId, e);
  return [...plans3.values()].reverse();
}
__name(latestPlans, "latestPlans");
function eventMovements(event) {
  const groups = /* @__PURE__ */ new Map();
  for (const s of event.payload.stockChanges ?? []) {
    if (!Number.isSafeInteger(s.before) || !Number.isSafeInteger(s.quantity) || !["punching", "production"].includes(s.location)) continue;
    const componentId = canonicalComponentId(s.componentId), key = `${s.location}:${componentId}`, old = groups.get(key);
    groups.set(key, { componentId, location: s.location, change: (old?.change ?? 0) + s.quantity - s.before });
  }
  return [...groups.values()];
}
__name(eventMovements, "eventMovements");
var processingEventRows = /* @__PURE__ */ __name((payload) => Array.isArray(payload.processingLines) ? payload.processingLines : payload.outputId ? [payload] : [], "processingEventRows");
function correctionContext(state, eventId) {
  const selected = state.events.find((e) => e.id === eventId), rootId = selected?.kind === "correction" ? selected.payload.originalEventId : eventId;
  const root = state.events.find((e) => e.id === rootId);
  if (!root || !["punch", "usage"].includes(root.kind)) return { error: "Choose a processing or usage entry." };
  const chain = state.events.filter((e) => e.kind === "correction" && e.payload.originalEventId === root.id), latest = chain.at(-1) ?? root;
  const value = latest.kind === "correction" ? latest.payload.after : root.payload;
  const rootIndex = state.events.findIndex((e) => e.id === root.id), affected = /* @__PURE__ */ new Set(), outputs = /* @__PURE__ */ new Set();
  const rows2 = processingEventRows(value);
  if (root.kind === "punch") for (const row of rows2) {
    affected.add(`punching:${canonicalComponentId(row.sourceId)}`);
    outputs.add(canonicalComponentId(row.outputId));
    affected.add(`punching:${canonicalComponentId(row.outputId)}`);
    for (const m of row.materials ?? []) affected.add(`punching:${canonicalComponentId(m.componentId)}`);
    for (const m of row.recipeSnapshot?.materials ?? []) affected.add(`punching:${canonicalComponentId(m.componentId)}`);
  }
  else affected.add(`production:${canonicalComponentId(value.componentId)}`);
  let blocked = "";
  for (const event of state.events.slice(rootIndex + 1)) {
    if (event.kind === "correction" && event.payload.originalEventId === root.id) continue;
    if (event.kind === "issue" && state.transfers.some((t) => t.id === event.payload.transferId && t.status === "cancelled" && t.receipts.length === 0) && state.events.some((e) => e.kind === "cancel" && e.payload.transferId === event.payload.transferId)) continue;
    const moves = eventMovements(event);
    if (["count", "bulk-count"].includes(event.kind) && moves.some((m) => affected.has(`${m.location}:${m.componentId}`))) blocked = `Stock was counted after this entry (${event.id}). Use a new stocktake to reconcile it.`;
    if (root.kind === "punch" && event.kind !== "component-merge" && moves.some((m) => m.change < 0 && outputs.has(m.componentId))) blocked = `A finished component was used or sent after this entry (${event.id}). Resolve that movement first.`;
  }
  return { root, latest, value, rows: rows2, blocked };
}
__name(correctionContext, "correctionContext");
function savedRecipe(row) {
  if (row.recipeSnapshot?.materials) return row.recipeSnapshot;
  if (!(row.good > 0)) return null;
  const materials = (row.materials ?? []).map((m) => ({ ...m, perPiece: (m.quantity - (m.extra ?? 0)) / row.good }));
  if (materials.some((m) => !Number.isSafeInteger(m.perPiece) || m.perPiece < 1)) return null;
  return { sourceId: row.sourceId, version: 0, materials };
}
__name(savedRecipe, "savedRecipe");
function processingEffect(rows2) {
  const effects = /* @__PURE__ */ new Map(), add = /* @__PURE__ */ __name((id, n) => {
    id = canonicalComponentId(id);
    effects.set(id, (effects.get(id) ?? 0) + n);
  }, "add");
  for (const row of rows2) {
    add(row.sourceId, -row.good - row.rejected);
    add(row.outputId, row.good);
    for (const material of row.materials ?? []) add(material.componentId, -material.quantity);
  }
  return effects;
}
__name(processingEffect, "processingEffect");

// lib/management-operations.ts
var fail = /* @__PURE__ */ __name((message) => {
  throw new InputError(message);
}, "fail");
var whole = /* @__PURE__ */ __name((v, label, min = 0, max = 1e7) => Number.isSafeInteger(v) && v >= min && v <= max ? v : fail(`${label}: enter a whole number from ${min} to ${max.toLocaleString()}.`), "whole");
var text = /* @__PURE__ */ __name((v, label, required = false, max = 500) => typeof v === "string" && v.length <= max && (!required || v.trim()) ? v.trim() : fail(`Enter ${label}${required ? " (required)" : ""}.`), "text");
var managementKinds = ["bulk-count", "recipe", "correction", "minimum", "plan"];
function applyManagementOperation(state, input, now, id) {
  const kind = input.kind, actor = input.actor, reason = text(input.remarks ?? "", "reason"), stocks = [], components = [];
  const find = /* @__PURE__ */ __name((id2) => componentById(state.components, id2) ?? fail("Choose an active component."), "find");
  const set = /* @__PURE__ */ __name((componentId, location, value) => {
    componentId = canonicalComponentId(componentId);
    whole(value, `${find(componentId).name} balance`);
    const existing = stocks.find((s) => s.componentId === componentId && s.location === location);
    if (existing) existing.quantity = value;
    else stocks.push({ componentId, location, quantity: value });
  }, "set");
  let summary = "", payload = { remarks: reason, sourceSystem: "sea-component-register", schemaVersion: 1 };
  if (kind === "bulk-count") {
    const location = input.location;
    if (!["punching", "production"].includes(location)) fail("Choose a location.");
    if (!reason) fail("Enter a stocktake reason.");
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 500) fail("Count between 1 and 500 components.");
    const seen = /* @__PURE__ */ new Set();
    const lines = input.lines.map((line) => {
      const c = find(line.componentId);
      if (seen.has(c.id)) fail("Count each component once.");
      seen.add(c.id);
      const before = quantity(state, c.id, location), after = whole(line.quantity, "Counted pieces");
      if (line.expectedQuantity !== before) fail(`${c.name}: stock changed. Refresh and check the count again.`);
      set(c.id, location, after);
      return { componentId: c.id, name: c.name, before, after, difference: after - before };
    });
    summary = `${lines.length} components counted`;
    payload = { ...payload, location, lines };
  } else if (kind === "recipe") {
    const output = find(input.outputId), source = find(input.sourceId);
    if (input.expectedRecipe !== recipeKey(state, output)) fail("This recipe changed. Reload it before saving.");
    if (!compatibleProcessing(source, output)) fail("Choose an End with the same size and coating.");
    if (!reason) fail("Enter the reason for changing this recipe.");
    if (!Array.isArray(input.materials) || input.materials.length > 12) fail("Use up to 12 accessory lines.");
    const seen = /* @__PURE__ */ new Set();
    const materials = input.materials.map((line) => {
      const c = find(line.componentId);
      if (!allowedRecipePart(c) || c.id === output.id || c.id === source.id) fail("Choose a handle, saddle or other processing accessory.");
      if (seen.has(c.id)) fail("Combine duplicate accessories.");
      seen.add(c.id);
      return { componentId: c.id, label: c.name, partType: c.partType, perPiece: whole(line.perPiece, "Parts per good piece", 1, 100) };
    });
    const recipe = { version: (output.recipe?.version ?? 0) + 1, sourceId: source.id, materials, updatedAt: now, updatedBy: actor };
    const updated = { ...output, sourceId: source.id, recipe };
    components.push(updated);
    summary = `${output.name} \xB7 recipe ${recipe.version}`;
    payload = { ...payload, componentId: output.id, before: { sourceId: output.sourceId, recipe: output.recipe ?? null, key: recipeKey(state, output) }, after: recipe };
  } else if (kind === "minimum") {
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 500) fail("Choose at least one minimum stock level.");
    const seen = /* @__PURE__ */ new Set();
    const lines = input.lines.map((line) => {
      const c = find(line.componentId);
      if (seen.has(c.id)) fail("Set each component once.");
      seen.add(c.id);
      if (JSON.stringify(line.expectedMinimum ?? {}) !== JSON.stringify(c.minimumStock ?? {})) fail(`${c.name}: minimum stock changed. Refresh it.`);
      const minimumStock = { punching: whole(line.punching, "Processing minimum"), production: whole(line.production, "Production minimum") };
      components.push({ ...c, minimumStock });
      return { componentId: c.id, name: c.name, before: c.minimumStock ?? {}, after: minimumStock };
    });
    summary = `${lines.length} minimum stock levels updated`;
    payload = { ...payload, lines };
  } else if (kind === "plan") {
    const title = text(input.title, "plan name", true, 100), planId = input.planId ? text(input.planId, "plan ID", true, 80) : id;
    const previous = latestPlans(state.events).find((e) => e.payload.planId === planId);
    if (input.planId && (!previous || input.expectedPlanEventId !== previous.id)) fail("This plan changed. Open its latest version.");
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 30) fail("Add between 1 and 30 finished components.");
    const seen = /* @__PURE__ */ new Set(), lines = input.lines.map((l) => {
      const c = find(l.outputId);
      if (seen.has(c.id)) fail("Combine duplicate finished components.");
      seen.add(c.id);
      return { outputId: c.id, quantity: whole(l.quantity, "Required pieces", 1) };
    });
    const check = productionRequirement(state, lines);
    if (check.errors.length) fail(check.errors[0]);
    summary = title;
    payload = { ...payload, planId, title, lines, previousEventId: previous?.id ?? null };
  } else if (kind === "correction") {
    if (!reason) fail("Enter a correction reason.");
    const context = correctionContext(state, input.originalEventId);
    if (context.error) fail(context.error);
    const { root, latest, value, rows: rows2, blocked } = context;
    if (blocked) fail(blocked);
    if (!root || !latest || !value || !rows2) throw new InputError("This entry is unavailable.");
    if (input.expectedLatestId !== latest.id) fail("This entry was corrected elsewhere. Reload its latest version.");
    let after;
    if (root.kind === "usage") {
      after = { ...value, used: whole(input.used, "Used pieces"), rejected: whole(input.rejected, "Rejected pieces"), remarks: text(input.rejectionReason ?? "", "rejection reason", input.rejected > 0) };
      set(value.componentId, "production", quantity(state, value.componentId, "production") + value.used + value.rejected - after.used - after.rejected);
    } else {
      if (!Array.isArray(input.processingLines) || input.processingLines.length !== rows2.length) fail("Keep the original component lines.");
      const next = rows2.map((row, index) => {
        const entered = input.processingLines[index];
        if (!entered || entered.outputId !== row.outputId) fail("Keep the original finished component.");
        const good = whole(entered.good, "Good pieces"), rejected = whole(entered.rejected, "Rejected pieces"), remarks = text(entered.remarks ?? "", "rejection reason", rejected > 0), materialReason = text(entered.materialReason ?? "", "extra parts reason");
        const recipe = savedRecipe(row);
        if (!recipe && good !== row.good) fail("This older entry has no complete saved recipe. Its good quantity cannot be changed.");
        const required = recipe?.materials ?? (row.materials ?? []).map((m) => ({ ...m, perPiece: 0 }));
        if (!Array.isArray(entered.materials) || entered.materials.length !== required.length) fail("Keep the original accessories.");
        const materials = required.map((part, i) => {
          const line = entered.materials[i];
          if (!line || line.componentId !== part.componentId) fail("Keep the original accessory.");
          const extra = whole(line.extra, "Extra parts"), requiredQuantity = recipe ? good * part.perPiece : (row.materials?.[i]?.quantity ?? 0) - (row.materials?.[i]?.extra ?? 0);
          if (extra && !materialReason) fail("Explain the extra parts used.");
          return { kind: part.kind, componentId: part.componentId, name: part.name ?? componentById(state.components, part.componentId)?.name ?? part.componentId, quantity: whole(requiredQuantity + extra, "Parts used"), extra };
        });
        return { ...row, good, rejected, remarks, materials, materialReason, ...recipe ? { recipeSnapshot: recipe } : {} };
      });
      const oldEffect = processingEffect(rows2), newEffect = processingEffect(next);
      for (const key of /* @__PURE__ */ new Set([...oldEffect.keys(), ...newEffect.keys()])) {
        const change = (newEffect.get(key) ?? 0) - (oldEffect.get(key) ?? 0);
        if (change) set(key, "punching", quantity(state, key, "punching") + change);
      }
      after = { ...value, processingLines: next, good: next.reduce((n, r) => n + r.good, 0), rejected: next.reduce((n, r) => n + r.rejected, 0) };
    }
    const amounts = /* @__PURE__ */ __name((p) => root.kind === "usage" ? [p.used, p.rejected] : p.processingLines?.map((r) => [r.good, r.rejected, r.materials.map((m) => [m.componentId, m.quantity, m.extra ?? 0])]), "amounts");
    const beforeAmounts = root.kind === "punch" ? { ...value, processingLines: rows2 } : value;
    if (JSON.stringify(amounts(beforeAmounts)) === JSON.stringify(amounts(after))) fail("No quantities have changed.");
    summary = `Corrected ${root.id}`;
    payload = { ...payload, originalEventId: root.id, previousEventId: latest.id, originalKind: root.kind, before: value, after };
  }
  if (input.expectedStocks !== void 0) {
    if (!Array.isArray(input.expectedStocks) || input.expectedStocks.length !== stocks.length) fail("Review the stock changes again.");
    for (const s of stocks) if (!input.expectedStocks.some((e) => e.componentId === s.componentId && e.location === s.location && e.quantity === quantity(state, s.componentId, s.location))) fail("Stock changed after review. Review the entry again.");
  }
  const event = { id, requestId: input.requestId, kind, createdAt: now, actor, summary, payload: { ...payload, stockChanges: stocks.map((s) => ({ ...s, before: quantity(state, s.componentId, s.location) })) } };
  return { stocks, components, event };
}
__name(applyManagementOperation, "applyManagementOperation");

// lib/operations.ts
var fail2 = /* @__PURE__ */ __name((message) => {
  throw new InputError(message);
}, "fail");
var integer = /* @__PURE__ */ __name((v, label, min = 0) => {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < min || v > 1e7) fail2(`${label} must be a whole number from ${min.toLocaleString()} to 10,000,000.`);
  return v;
}, "integer");
var text2 = /* @__PURE__ */ __name((v, label, required = false, max = 500) => {
  if (typeof v !== "string" || v.length > max || required && !v.trim()) fail2(`Enter ${label}${required ? " (required)" : ""}.`);
  return v.trim();
}, "text");
function validateSignature(v) {
  if (!Array.isArray(v) || v.length > 50) fail2("Add a handwritten signature.");
  let length = 0, points = 0;
  for (const stroke of v) {
    if (!Array.isArray(stroke) || stroke.length > 1500) fail2("Invalid signature.");
    for (let i = 0; i < stroke.length; i++) {
      const p = stroke[i];
      if (!Array.isArray(p) || p.length !== 2 || !p.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1)) fail2("Invalid signature.");
      points++;
      if (i) length += Math.hypot(p[0] - stroke[i - 1][0], p[1] - stroke[i - 1][1]);
    }
  }
  if (points < 5 || points > 4e3 || length < 0.12) fail2("Please sign with a real stroke, not a tap.");
  return v;
}
__name(validateSignature, "validateSignature");
function applyOperation(state, input, now, id, preview = false) {
  if (!input || typeof input !== "object") fail2("Invalid request.");
  const requestId = text2(input.requestId, "request ID", true, 80);
  if (!/^[a-zA-Z0-9-]{12,80}$/.test(requestId)) fail2("Invalid request ID.");
  const actor = text2(input.actor, "PIC", true, 60);
  if (!state.pics.includes(actor)) fail2("Select a registered PIC.");
  const kind = text2(input.kind, "action", true, 30);
  const remarks = text2(input.remarks ?? "", "remarks");
  const reference2 = text2(input.reference ?? "", "reference", false, 100);
  if (!canAct(actor, kind, { location: input.location, transfer: state.transfers.find((t) => t.id === input.transferId) })) throw new PermissionError("This action is not available for the selected PIC and stock area.");
  if (managementKinds.includes(kind)) return applyManagementOperation(state, input, now, id);
  const changed = [];
  let transfer, component, components, pics;
  const find = /* @__PURE__ */ __name((id2) => {
    const c = componentById(state.components, id2);
    return c && !c.retired && !c.mergedInto ? c : fail2("Choose a valid component.");
  }, "find");
  const stock = /* @__PURE__ */ __name((id2, loc) => changed.find((s) => s.componentId === id2 && s.location === loc)?.quantity ?? quantity(state, id2, loc), "stock");
  const delta = /* @__PURE__ */ __name((componentId, location, amount) => {
    componentId = canonicalComponentId(componentId);
    const current = stock(componentId, location), next = current + amount;
    if (!Number.isSafeInteger(next) || next < 0 || next > 1e7) fail2(`${componentById(recordComponents(state), componentId)?.name ?? componentId}: only ${current.toLocaleString()} pieces available in ${names[location]}. Ask Eugene to check the component records if this is incorrect.`);
    let row = changed.find((s) => s.componentId === componentId && s.location === location);
    if (row) row.quantity = next;
    else changed.push({ componentId, location, quantity: next });
  }, "delta");
  let summary = "", payload = { remarks, reference: reference2, sourceSystem: "sea-component-register", schemaVersion: 1 };
  if (["incoming", "issue", "return"].includes(kind)) {
    const signature = preview ? [] : validateSignature(input.signature);
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 30) fail2("Add between 1 and 30 component lines.");
    const seen = /* @__PURE__ */ new Set();
    const lines = input.lines.map((l) => {
      const c = find(l.componentId);
      if (seen.has(c.id)) fail2("Combine duplicate components into one line.");
      seen.add(c.id);
      const q = integer(l.quantity, "Transfer quantity", 1);
      if (kind === "return" && (!isPunched(c) || input.condition !== "good-unused")) fail2("Only good, unused punched components can be returned.");
      if (kind !== "incoming") delta(c.id, kind === "issue" ? "punching" : "production", -q);
      return { componentId: c.id, quantity: q, received: 0 };
    });
    const sender = kind === "incoming" ? text2(input.sender ?? actor, "main-factory sending PIC", true, 60) : actor;
    if (!state.pics.includes(sender)) fail2("Select a registered sending PIC.");
    transfer = { id, kind, status: "pending", lines, sender, recordedBy: actor, signature, createdAt: now, updatedAt: now, remarks, reference: reference2, receipts: [] };
    summary = `${names[kind]} \xB7 ${lines.reduce((sum, l) => sum + l.quantity, 0).toLocaleString()} pieces`;
    payload = { ...payload, transferId: id, lines, sender, recordedBy: actor, signature };
  } else if (kind === "receipt") {
    const original = state.transfers.find((t) => t.id === input.transferId) ?? fail2("Transfer not found.");
    if (!["pending", "partial"].includes(original.status)) fail2("This transfer has already been completed or cancelled.");
    if (input.expectedUpdatedAt !== original.updatedAt) fail2("This transfer changed on another device. Close and reopen it before signing again.");
    const signature = preview ? [] : validateSignature(input.signature);
    transfer = structuredClone(original);
    if (!Array.isArray(input.lines) || input.lines.length !== transfer.lines.length) fail2("Check every component line.");
    const allowed = ["Wrong Component", "Wrong Hole Size / Variant", "Damaged Components", "Quantity Difference", "Packing Difference"];
    const lineMode = input.receiptVersion === 2;
    const previousLineIssues = original.unresolvedLineIssues ?? [];
    const nextLineIssues = [...previousLineIssues];
    const seen = /* @__PURE__ */ new Set();
    const received = input.lines.map((l) => {
      const line = transfer.lines.find((x) => x.componentId === l.componentId) ?? fail2("Component is not on this transfer.");
      if (seen.has(l.componentId)) fail2("Duplicate receiving line.");
      seen.add(l.componentId);
      const outstanding = line.quantity - line.received, q = integer(l.quantity, "Accepted pieces");
      if (q > outstanding) fail2("Accepted quantity exceeds the outstanding quantity. Record excess stock on a separate transfer.");
      let detail = {};
      if (lineMode) {
        const check = l.check, issues2 = l.issues ?? [], note = text2(l.note ?? "", "line discrepancy explanation");
        if (!Array.isArray(issues2) || !issues2.every((x) => allowed.includes(x))) fail2("Invalid line discrepancy.");
        if (outstanding === 0 && check === "complete") {
          if (q || issues2.length) fail2("This component was already received.");
        } else if (check === "correct") {
          if (q !== outstanding || issues2.length) fail2("Received Correctly must match the outstanding quantity.");
        } else if (check === "difference") {
          if (!issues2.length || !note) fail2("Select a difference and explain it for this component.");
        } else fail2("Check every outstanding component: Received Correctly or Report Difference.");
        const previous = previousLineIssues.find((x) => x.componentId === line.componentId);
        if (l.resolvePreviousIssues === true && !note) fail2("Explain how this component\u2019s previous issues were resolved.");
        const kept = l.resolvePreviousIssues === true ? [] : previous?.issues ?? [];
        const combined = Array.from(/* @__PURE__ */ new Set([...kept, ...issues2]));
        const index = nextLineIssues.findIndex((x) => x.componentId === line.componentId);
        if (index >= 0) nextLineIssues.splice(index, 1);
        if (combined.length) nextLineIssues.push({ componentId: line.componentId, issues: combined, note: note || previous?.note || "" });
        detail = { check, issues: issues2, note, resolvedPreviousIssues: l.resolvePreviousIssues === true };
      }
      line.received += q;
      if (q) delta(line.componentId, original.kind === "issue" ? "production" : "punching", q);
      return { componentId: line.componentId, quantity: q, ...detail };
    });
    const issues = Array.isArray(input.issues) ? input.issues : [];
    if (!issues.every((x) => allowed.includes(x))) fail2("Invalid discrepancy.");
    const previousIssues = original.unresolvedIssues ?? [];
    if (input.resolveIssues === true) {
      if (!remarks) fail2("Explain how the previously recorded issues were resolved.");
      transfer.unresolvedIssues = issues;
    } else transfer.unresolvedIssues = Array.from(/* @__PURE__ */ new Set([...previousIssues, ...issues]));
    transfer.unresolvedLineIssues = nextLineIssues;
    const complete = transfer.lines.every((l) => l.received === l.quantity) && !transfer.unresolvedIssues?.length && !nextLineIssues.length;
    const lineNotes = received.some((l) => l.note);
    if ((!complete || issues.length) && !remarks && !lineNotes) fail2("Add remarks for a short delivery or discrepancy.");
    if (!received.some((l) => l.quantity > 0) && !issues.length && !received.some((l) => l.issues?.length || l.resolvedPreviousIssues) && input.resolveIssues !== true) fail2("Enter an accepted quantity or record an issue.");
    transfer.receipts.push({ actor, signature, at: now, lines: received, remarks, issues });
    transfer.updatedAt = now;
    transfer.status = complete ? "received" : "partial";
    summary = `${original.id} \xB7 ${complete ? "Received in full" : "Partial / issues outstanding"}`;
    payload = { ...payload, transferId: original.id, lines: received, issues, resolvedPreviousIssues: input.resolveIssues === true, signature };
  } else if (kind === "punch") {
    const errors = validateProcessing(state, input);
    if (Object.keys(errors).length) fail2(Object.values(errors)[0]);
    const rows2 = processingRows(input).map((row) => {
      const output = find(row.outputId), source = configuredPunchingSource(state.components, output.id);
      const good2 = integer(row.good, "Good processed pieces"), rejected2 = integer(row.rejected, "Rejected pieces");
      const remarks2 = text2(row.remarks ?? "", "rejection reason", rejected2 > 0), materialReason = text2(row.materialReason ?? "", "extra parts reason");
      const requirements = processingRequirements(source, output);
      const materials = (row.materials ?? []).filter((r) => r.quantity > 0).map((r) => ({ kind: r.kind, componentId: r.componentId, name: find(r.componentId).name, quantity: integer(r.quantity, "Components used"), extra: r.quantity - good2 * (requirements.find((requirement) => requirement.kind === r.kind)?.perPiece ?? 1) }));
      const recipeParts2 = requirements.map((r) => {
        const selected = (row.materials ?? []).find((m) => m.kind === r.kind), candidates = materialCandidates(state.components, r), componentId = selected?.componentId || (candidates.length === 1 ? candidates[0].id : "");
        return { kind: r.kind, componentId, name: componentId ? find(componentId).name : r.label, perPiece: r.perPiece ?? 1 };
      });
      const recipeSnapshot = recipeParts2.every((r) => r.componentId) ? { version: output.recipe?.version ?? 0, sourceId: source.id, materials: recipeParts2 } : void 0;
      return { recipeSnapshot, process: output.processingMode ?? "punching", sourceId: source.id, outputId: output.id, sourceName: source.name, outputName: output.name, good: good2, rejected: rejected2, remarks: remarks2, materials, materialReason };
    });
    for (const row of rows2) {
      delta(row.sourceId, "punching", -row.good - row.rejected);
      for (const material of row.materials) delta(material.componentId, "punching", -material.quantity);
    }
    for (const row of rows2) if (row.good) {
      delta(row.outputId, "punching", row.good);
      const output = find(row.outputId);
      if (!isPunched(output)) (components ??= []).push({ ...output, punched: true });
    }
    const good = rows2.reduce((sum, row) => sum + row.good, 0), rejected = rows2.reduce((sum, row) => sum + row.rejected, 0);
    summary = rows2.length === 1 ? `${rows2[0].sourceName} \u2192 ${rows2[0].outputName} \xB7 ${good.toLocaleString()} good` : `${rows2.length} finished components \xB7 ${good.toLocaleString()} good`;
    payload = { ...payload, ...input.processingLines === void 0 ? rows2[0] : {}, processingLines: rows2, good, rejected, processingRuleVersion: 11 };
  } else if (kind === "usage") {
    const c = find(input.componentId), used = integer(input.used, "Used pieces"), rejected = integer(input.rejected, "Rejected pieces");
    if (used + rejected === 0) fail2("Enter the quantity used or rejected.");
    if (rejected && !remarks) fail2("Enter the reason for rejected pieces.");
    delta(c.id, "production", -used - rejected);
    summary = `${c.name} \xB7 ${used.toLocaleString()} used${rejected ? `, ${rejected} rejected` : ""}`;
    payload = { ...payload, componentId: c.id, used, rejected };
  } else if (kind === "count") {
    const c = find(input.componentId);
    const location = input.location;
    if (location !== "punching" && location !== "production") fail2("Choose a stock location.");
    const counted = integer(input.quantity, "Counted quantity");
    const before = quantity(state, c.id, location);
    if (input.expectedQuantity !== before) fail2("This balance changed. Close and reopen Stock Count to check the current balance.");
    if (!remarks) fail2("Add an opening balance or adjustment reason.");
    delta(c.id, location, counted - before);
    summary = `${c.name} \xB7 ${names[location]}: ${before.toLocaleString()} \u2192 ${counted.toLocaleString()}`;
    payload = { ...payload, componentId: c.id, location, before, after: counted, change: counted - before };
  } else if (kind === "cancel") {
    const t = state.transfers.find((t2) => t2.id === input.transferId) ?? fail2("Transfer not found.");
    if (t.status !== "pending" || t.lines.some((l) => l.received > 0)) fail2("Only transfers with no accepted stock can be cancelled.");
    if (!remarks) fail2("Enter a cancellation reason.");
    transfer = { ...structuredClone(t), status: "cancelled", updatedAt: now };
    if (t.kind !== "incoming") for (const l of t.lines) delta(l.componentId, t.kind === "issue" ? "punching" : "production", l.quantity);
    summary = `${t.id} \xB7 Cancelled`;
    payload = { ...payload, transferId: t.id };
  } else if (kind === "component") {
    const old = input.id ? find(input.id) : void 0;
    const family = diameterFamily(text2(input.family, "component family", true, 30)), coating = text2(input.coating, "coating", true, 30), hole = integer(input.hole, "Opening size"), pack = integer(input.pack ?? old?.pack ?? 1, "Pieces per pack", 1);
    if (hole > 100) fail2("Opening size must be 0\u2013100 mm.");
    const opening = input.opening === "screw-neck" ? "screw-neck" : input.opening === "flexispout" ? "flexispout" : void 0;
    if (input.opening && opening === void 0) fail2("Choose a valid opening type.");
    if (opening && hole === 0) fail2("Enter the opening size for this opening type.");
    const partType = text2(input.partType ?? old?.partType ?? "", "component type", !old, 40), colour = text2(input.colour ?? old?.colour ?? "", "colour", false, 30), variant = text2(input.variant ?? old?.variant ?? "", "variant", false, 60), specificationCode = text2(input.specificationCode ?? old?.specificationCode ?? "", "specification", false, 30);
    if (opening === "screw-neck" && hole === 42) fail2("ST42 is not available.");
    if (family === "904" && ["Top", "PH"].includes(partType) && (opening !== "screw-neck" || hole !== 48)) fail2("904 tops use ST48.");
    const nameFamily = old?.nameFamily ?? family;
    const name = standardName({ family, nameFamily, partType, coating, colour, variant, hole, opening, specificationCode, tapered: Boolean(input.tapered), assemblyStage: old?.assemblyStage });
    if (!name || name.length > 100) fail2("Keep the generated component name within 100 characters.");
    const stockCode = text2(input.stockCode ?? old?.stockCode ?? "", "product code", false, 100) || old?.stockCode || "", originalDescription = text2(input.originalDescription ?? old?.originalDescription ?? "", "original description", false, 250), packUnit = text2(input.packUnit ?? old?.packUnit ?? "", "pack type", false, 20);
    if (!["", "bag", "carton", "box"].includes(packUnit)) fail2("Choose a valid pack type.");
    if (stockCode && recordComponents(state).some((c) => c.id !== old?.id && (c.stockCode?.trim().toLowerCase() === stockCode.toLowerCase() || c.id.toLowerCase() === stockCode.toLowerCase() || (c.aliases ?? []).some((a) => a.toLowerCase() === stockCode.toLowerCase())))) fail2("That product code is already assigned or reserved.");
    const aliases = input.aliases ?? old?.aliases ?? [];
    if (!Array.isArray(aliases) || aliases.length > 100 || aliases.some((value) => typeof value !== "string" || value.length > 250)) fail2("Use up to 100 search names, each at most 250 characters.");
    if (old && (old.opening !== opening || old.family !== family || old.coating !== coating || old.hole !== hole || old.tapered !== Boolean(input.tapered))) fail2("Create a separate component for a different family, coating, hole or shape.");
    if (old && (old.partType && partType !== old.partType || (old.colour ?? "") !== colour || (old.variant ?? "") !== variant || (old.specificationCode ?? "") !== specificationCode)) fail2("Create a separate component for a different type, colour, variant or specification.");
    component = { ...old, id: old?.id ?? `CMP-${id}`, name, aliases: Array.from(/* @__PURE__ */ new Set([...old?.aliases ?? [], ...aliases, ...old && old.name !== name ? [old.name] : [], ...old?.stockCode && old.stockCode !== stockCode ? [old.stockCode] : []])), namingVersion: NAMING_VERSION, descriptionVersion: 1, catalogueVersion: 1, stockCode, originalDescription, partType, nameFamily, colour, variant, specificationCode, family, coating, hole, tapered: Boolean(input.tapered), punched: Boolean(input.punched) || hole > 0, opening, uncommon: Boolean(input.uncommon) || Boolean(input.tapered), pack, packUnit, reference: old?.reference ?? "Manually added" };
    component = normalizeEndFinish(component);
    component.generatedStockCode = stockCode === old?.stockCode ? old?.generatedStockCode : false;
    component = assignProductCodes([...recordComponents(state).filter((c) => c.id !== component.id), component]).find((c) => c.id === component.id);
    if (component.name.length > 100) fail2("Keep the component name within 100 characters.");
    if (state.components.some((c) => c.id !== old?.id && c.name.toLowerCase() === component.name.toLowerCase())) fail2("That component name already exists.");
    if (isEnd(component) && (component.punched || component.hole || input.sourceId)) fail2("Ends are stock items, not processed outputs. Use Stock Count to update their quantities.");
    if (old?.recipe && input.sourceId !== void 0 && input.sourceId !== old.sourceId) fail2("Change this source in Management \u2192 Recipes.");
    if (input.sourceId === "") delete component.sourceId;
    if (input.sourceId) {
      const source = find(input.sourceId);
      if (!compatibleProcessing(source, component)) fail2("Choose an End with the same size and coating.");
      component.sourceId = source.id;
    }
    summary = `${old ? "Updated" : "Added"} ${component.name}`;
    payload = { ...payload, before: old ?? null, after: component };
  } else if (kind === "process-map") {
    const source = find(input.sourceId);
    if (!isProcessingSource(source)) fail2("Choose an End as the starting component.");
    const candidates = mappingCandidates(state.components, source.id), expected = mappingSnapshot(state.components, source.id);
    if (JSON.stringify(input.expectedMappings) !== JSON.stringify(expected)) fail2("Processing setup changed. Reopen it and check the selected outputs.");
    if (!Array.isArray(input.outputIds) || new Set(input.outputIds).size !== input.outputIds.length || input.outputIds.length > 300) fail2("Choose valid output components.");
    const reassign = Array.isArray(input.reassignIds) ? input.reassignIds : [];
    for (const outputId of input.outputIds) {
      const output = candidates.find((c) => c.id === outputId) ?? fail2("Choose an output from the same family.");
      if (!compatibleOutput(source, output)) fail2("Source and output coatings do not match.");
      if (output.sourceId && output.sourceId !== source.id && !reassign.includes(output.id)) fail2("Confirm before changing an output\u2019s existing starting component.");
      if (state.components.some((c) => c.sourceId === output.id)) fail2("This item is already a starting component. Review its processing links first.");
    }
    components = candidates.flatMap((output) => {
      const selected = input.outputIds.includes(output.id);
      if (selected && output.sourceId !== source.id) return [{ ...output, sourceId: source.id }];
      if (!selected && output.sourceId === source.id) {
        const updated = { ...output };
        delete updated.sourceId;
        return [updated];
      }
      return [];
    });
    if (components.some((c) => c.recipe)) fail2("Change saved recipes in Management \u2192 Recipes.");
    if (!components.length) fail2("No processing links have changed.");
    summary = `${source.name} \xB7 ${input.outputIds.length} confirmed outputs`;
    payload = { ...payload, sourceId: source.id, outputIds: input.outputIds, mappings: components.map((c) => ({ componentId: c.id, name: c.name, before: find(c.id).sourceId ?? null, after: c.sourceId ?? null })) };
  } else if (kind === "pic") {
    const name = text2(input.name, "PIC name", true, 60);
    if (state.pics.some((p) => p.toLowerCase() === name.toLowerCase())) fail2("That PIC is already listed.");
    pics = [...state.pics, name];
    summary = `Added PIC ${name}`;
    payload = { ...payload, name };
  } else fail2("Unknown action.");
  if (input.expectedStocks !== void 0) {
    if (!Array.isArray(input.expectedStocks) || input.expectedStocks.length !== changed.length) fail2("Review the current stock balances again.");
    for (const row of changed) {
      const expected = input.expectedStocks.find((x) => canonicalComponentId(x.componentId) === row.componentId && x.location === row.location);
      if (!expected || expected.quantity !== quantity(state, row.componentId, row.location)) fail2("A component balance changed after review. Review the entry again before saving.");
    }
  }
  const event = { id, requestId, kind, createdAt: now, actor, summary, payload: { ...payload, stockChanges: changed.map((s) => ({ ...s, before: quantity(state, s.componentId, s.location) })) } };
  return { stocks: changed, transfer, component, components, pics, event };
}
__name(applyOperation, "applyOperation");

// db/store.ts
function database() {
  const db = env.DB;
  if (!db) throw new Error("Stock service is unavailable. Please try again shortly.");
  return db;
}
__name(database, "database");
async function init(db) {
  const ready = await db.prepare("SELECT id FROM control WHERE id = 1").first();
  if (!ready) {
    const statements = catalogue.map((c) => db.prepare("INSERT OR IGNORE INTO components (id,payload) VALUES (?,?)").bind(c.id, JSON.stringify(c)));
    statements.push(db.prepare("INSERT OR IGNORE INTO control (id,version,pics) VALUES (1,0,?)").bind(JSON.stringify(initialPics)));
    await db.batch(statements);
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await db.batch([db.prepare("SELECT version,pics FROM control WHERE id=1"), db.prepare("SELECT id,payload FROM components"), db.prepare("SELECT component_id AS componentId,location,quantity FROM stocks")]);
    const existing = result[1].results.map((row) => JSON.parse(row.payload));
    const { updates, additions: additions2 } = catalogueChanges(existing);
    const merges = pendingStockMerges(existing, updates, result[2].results);
    const root = result[0].results[0], existingPics = JSON.parse(root.pics), allPics = Array.from(/* @__PURE__ */ new Set([...existingPics, ...Object.keys(picRoles)]));
    const addedPics = allPics.length !== existingPics.length;
    if (!updates.length && !additions2.length && !addedPics) return;
    const statements = [db.prepare("UPDATE control SET version=CASE WHEN version=? THEN version+1 ELSE NULL END WHERE id=1").bind(result[0].results[0].version), ...updates.map((row) => db.prepare("UPDATE components SET payload=? WHERE id=?").bind(JSON.stringify(row), row.id)), ...additions2.map((row) => db.prepare("INSERT INTO components (id,payload) VALUES (?,?)").bind(row.id, JSON.stringify(row)))];
    for (const merge of merges) {
      for (const stock of merge.stocks) statements.push(db.prepare("INSERT INTO stocks(id,component_id,location,quantity) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity").bind(`${stock.location}:${stock.componentId}`, stock.componentId, stock.location, stock.quantity));
      const at = (/* @__PURE__ */ new Date()).toISOString(), eventId = `MERGE-${merge.from}`, summary = `${merge.source.name} \u2192 ${merge.name}`;
      const payload = { sourceId: merge.from, componentId: merge.to, before: merge.source, canonicalBefore: merge.target, remarks: "Duplicate items confirmed by Eugene \xB7 30/09/2026", stockChanges: merge.stocks.map((s) => ({ ...s, before: merge.stockBefore.find((r) => r.componentId === s.componentId && r.location === s.location)?.quantity ?? 0 })) };
      statements.push(db.prepare("INSERT INTO events(id,request_id,kind,created_at,actor,summary,payload) VALUES(?,?,?,?,?,?,?)").bind(eventId, `catalogue-${eventId}`, "component-merge", at, "System", summary, JSON.stringify(payload)));
    }
    if (addedPics) statements.push(db.prepare("UPDATE control SET pics=? WHERE id=1").bind(JSON.stringify(allPics)));
    try {
      await db.batch(statements);
      return;
    } catch (error) {
      if (!/control\.version/.test(String(error))) throw error;
    }
  }
  throw new Error("Catalogue is being updated. Please retry.");
}
__name(init, "init");
var eventRow = /* @__PURE__ */ __name((r) => ({ id: r.id, requestId: r.request_id, kind: r.kind, createdAt: r.created_at, actor: r.actor, summary: r.summary, payload: JSON.parse(r.payload) }), "eventRow");
async function snapshot(db, limit = 100) {
  const q = ["SELECT * FROM control WHERE id=1", "SELECT payload FROM components ORDER BY id", "SELECT component_id AS componentId, location, quantity FROM stocks", "SELECT payload FROM transfers WHERE status IN ('pending','partial') ORDER BY rowid DESC", `SELECT * FROM events ORDER BY rowid DESC LIMIT ${Math.min(500, Math.max(0, limit))}`, "SELECT COUNT(*) AS total FROM events"];
  const r = await db.batch(q.map((s) => db.prepare(s)));
  const root = r[0].results[0], allComponents = r[1].results.map((x) => JSON.parse(x.payload));
  return { version: root.version, pics: JSON.parse(root.pics), components: activeComponents(allComponents), archivedComponents: allComponents.filter((c) => c.mergedInto || c.retired), stocks: r[2].results, transfers: r[3].results.map((x) => JSON.parse(x.payload)), events: r[4].results.map(eventRow), eventCount: Number(r[5].results[0].total) };
}
__name(snapshot, "snapshot");
async function eventByRequestId(db, requestId) {
  const row = await db.prepare("SELECT * FROM events WHERE request_id=?").bind(requestId).first();
  return row ? eventRow(row) : null;
}
__name(eventByRequestId, "eventByRequestId");
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).filter((k) => k !== "signature").sort().map((k) => [k, canonical(value[k])]));
  return value;
}
__name(canonical, "canonical");
async function mutate(db, input) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical(input))));
  const submissionHash = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
  for (let attempt = 0; attempt < 4; attempt++) {
    const duplicate = typeof input?.requestId === "string" ? await db.prepare("SELECT * FROM events WHERE request_id=?").bind(input.requestId).first() : null;
    if (duplicate) {
      const event = eventRow(duplicate);
      if (event.actor !== input.actor || event.kind !== input.kind) throw new InputError("This request ID belongs to a different entry. Reopen the form.");
      if (event.payload.submissionHash && event.payload.submissionHash !== submissionHash) throw new InputError("This entry was already saved with different details. Check its saved record before entering another.");
      return { event, duplicate: true };
    }
    const state = await (["correction", "plan"].includes(input.kind) ? managementSnapshot(db) : snapshot(db, 0));
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = `CR-${now.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    let change;
    try {
      change = applyOperation(state, input, now, id);
    } catch (error) {
      if (error instanceof InputError) {
        const saved = await eventByRequestId(db, input.requestId);
        if (saved) {
          if (saved.actor !== input.actor || saved.kind !== input.kind || saved.payload.submissionHash && saved.payload.submissionHash !== submissionHash) throw new InputError("This entry was already saved with different details. Check its saved record before entering another.");
          return { event: saved, duplicate: true };
        }
      }
      throw error;
    }
    const statements = [db.prepare("UPDATE control SET version=CASE WHEN version=? THEN version+1 ELSE NULL END WHERE id=1").bind(state.version)];
    for (const s of change.stocks) statements.push(db.prepare("INSERT INTO stocks (id,component_id,location,quantity) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity").bind(`${s.location}:${s.componentId}`, s.componentId, s.location, s.quantity));
    if (change.transfer) statements.push(db.prepare("INSERT INTO transfers(id,status,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,payload=excluded.payload").bind(change.transfer.id, change.transfer.status, JSON.stringify(change.transfer)));
    if (change.component) statements.push(db.prepare("INSERT INTO components(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").bind(change.component.id, JSON.stringify(change.component)));
    for (const c of change.components ?? []) statements.push(db.prepare("UPDATE components SET payload=? WHERE id=?").bind(JSON.stringify(c), c.id));
    if (change.pics) statements.push(db.prepare("UPDATE control SET pics=? WHERE id=1").bind(JSON.stringify(change.pics)));
    const e = change.event;
    e.payload.submissionHash = submissionHash;
    statements.push(db.prepare("INSERT INTO events(id,request_id,kind,created_at,actor,summary,payload) VALUES(?,?,?,?,?,?,?)").bind(e.id, e.requestId, e.kind, e.createdAt, e.actor, e.summary, JSON.stringify(e.payload)));
    try {
      await db.batch(statements);
      return { event: e, duplicate: false };
    } catch (error) {
      if (!/control\.version|events\.request_id/.test(String(error))) throw error;
    }
  }
  throw new Error("Another PIC is updating stock. Please try this action again.");
}
__name(mutate, "mutate");
async function transferById(db, id) {
  const row = await db.prepare("SELECT payload FROM transfers WHERE id=?").bind(id).first();
  return row ? JSON.parse(row.payload) : null;
}
__name(transferById, "transferById");
async function eventPage(db, offset) {
  const rows2 = await db.prepare("SELECT * FROM events ORDER BY rowid DESC LIMIT 100 OFFSET ?").bind(offset).all();
  return rows2.results.map(eventRow);
}
__name(eventPage, "eventPage");
async function managementSnapshot(db) {
  const queries = ["SELECT * FROM control WHERE id=1", "SELECT payload FROM components ORDER BY id", "SELECT component_id AS componentId,location,quantity FROM stocks", "SELECT payload FROM transfers ORDER BY rowid", "SELECT * FROM events ORDER BY rowid"];
  const result = await db.batch(queries.map((q) => db.prepare(q))), root = result[0].results[0], all = result[1].results.map((r) => JSON.parse(r.payload)), events = result[4].results.map(eventRow);
  return { version: root.version, pics: JSON.parse(root.pics), components: activeComponents(all), archivedComponents: all.filter((c) => c.mergedInto || c.retired), stocks: result[2].results, transfers: result[3].results.map((r) => JSON.parse(r.payload)), events, eventCount: events.length };
}
__name(managementSnapshot, "managementSnapshot");
async function exportRecords(db) {
  return { schemaVersion: 1, sourceSystem: "sea-component-register", exportedAt: (/* @__PURE__ */ new Date()).toISOString(), ...await managementSnapshot(db) };
}
__name(exportRecords, "exportRecords");

// app/api/register/route.ts
var json = /* @__PURE__ */ __name((data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } }), "json");
async function GET(request) {
  try {
    const db = database();
    await init(db);
    const u = new URL(request.url);
    if (u.searchParams.has("requestId")) {
      const id = u.searchParams.get("requestId");
      if (!/^[a-zA-Z0-9-]{12,80}$/.test(id)) return json({ error: "Invalid request ID." }, 400);
      return json({ event: await eventByRequestId(db, id) });
    }
    if (u.searchParams.has("transfer")) return json(await transferById(db, u.searchParams.get("transfer")));
    if (u.searchParams.has("offset")) return json(await eventPage(db, Math.max(0, Math.floor(Number(u.searchParams.get("offset")) || 0))));
    if (u.searchParams.has("management")) return json(await managementSnapshot(db));
    if (u.searchParams.has("export")) return json(await exportRecords(db));
    return json(await snapshot(db));
  } catch (e) {
    console.error("Stock read failed", e);
    return json({ error: "Stock records could not be loaded. Please try again." }, 503);
  }
}
__name(GET, "GET");
async function POST(request, allowedOrigin2 = new URL(request.url).origin) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== allowedOrigin2) return json({ error: "Open the component register to submit this entry." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Invalid request format." }, 415);
    const body = await request.text();
    if (body.length > 25e4) return json({ error: "Entry is too large." }, 413);
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      return json({ error: "Invalid entry." }, 400);
    }
    const db = database();
    await init(db);
    if (new URL(request.url).searchParams.has("preview")) return json(applyOperation(await managementSnapshot(db), input, (/* @__PURE__ */ new Date()).toISOString(), "PREVIEW", true));
    return json(await mutate(db, input));
  } catch (e) {
    if (e instanceof InputError) return json({ error: e.message }, e.status);
    console.error("Stock save failed", e);
    return json({ error: "The entry could not be saved. Your form is kept. Please retry." }, 503);
  }
}
__name(POST, "POST");

// worker-pages.ts
var reply = /* @__PURE__ */ __name((error, status) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } }), "reply");
function allowedOrigin(env2) {
  try {
    const url = new URL((env2.ALLOWED_ORIGIN || "").trim());
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}
__name(allowedOrigin, "allowedOrigin");
function withCors(response, origin) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Vary", "Origin");
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
__name(withCors, "withCors");
var worker_pages_default = {
  async fetch(request, env2) {
    const path = new URL(request.url).pathname;
    if (path === "/" && request.method === "GET") return new Response("S.E.A. Metal Component Register API. Open the GitHub Pages website to use the register.", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    const origin = allowedOrigin(env2);
    if (!origin) return reply("Set ALLOWED_ORIGIN to your GitHub Pages origin, for example https://username.github.io.", 503);
    if (request.headers.get("Origin") !== origin) return reply("This website is not allowed to access the register.", 403);
    const cors = /* @__PURE__ */ __name((response) => withCors(response, origin), "cors");
    if (path !== "/api/register") return cors(reply("Not found.", 404));
    if (request.method === "OPTIONS") {
      const method = request.headers.get("Access-Control-Request-Method")?.toUpperCase();
      const headers = (request.headers.get("Access-Control-Request-Headers") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!method || !["GET", "POST"].includes(method) || headers.some((h) => h !== "content-type")) return cors(reply("Preflight request is not allowed.", 403));
      return cors(new Response(null, { status: 204, headers: { "Access-Control-Max-Age": "600" } }));
    }
    try {
      if (request.method === "GET") return cors(await GET(request));
      if (request.method === "POST") return cors(await POST(request, origin));
      return cors(new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: { "Content-Type": "application/json", "Allow": "GET, POST, OPTIONS" } }));
    } catch (error) {
      console.error("Register API failed", error);
      return cors(reply("The stock service is unavailable. Please try again.", 503));
    }
  }
};
export {
  worker_pages_default as default
};
