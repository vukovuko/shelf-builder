import { foldForSearch } from "@/lib/material-pages";

export type HandleKind = "rucka" | "dugme" | "profil";

export interface HandleModel {
  /** Mount letter + model code from the supplier name, e.g. "N MD". */
  key: string;
  name: string;
  kind: HandleKind;
  /** Only when a primary source states it; null otherwise. */
  material: string | null;
  brand: string | null;
  /** handle table ids of every size and finish of this model. */
  ids: number[];
}

/**
 * The 259 Europrofil handles grouped into models. Built from Europrofil's
 * product pages and 2019 handle catalog (europrofil.rs, "Klasične ručice"):
 * the supplier names read "ORN <N|D|U> <hole spacing> ruč.<model> <finish>
 * <maker>", where N = nadgradna, D = dugme, U = ukopavajuća and the maker
 * code is MT = Metax, GTV, EN = Evernew, TM = TEM (System), MIRON = Miron,
 * none = Europrofil's own. A handle added in the admin gets a public page
 * only once its id is listed here.
 */
export const HANDLE_MODELS: HandleModel[] = [
  {
    key: "N MD",
    name: "Ručka MD",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [9, 149],
  },
  {
    key: "N IK",
    name: "Ručka IK",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [10, 151, 152, 153],
  },
  {
    key: "N SM",
    name: "Ručka SM",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [11, 12, 142],
  },
  {
    key: "N LN",
    name: "Ručka LN",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [13],
  },
  {
    key: "N LD",
    name: "Ručka LD",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [14, 20, 21, 127],
  },
  {
    key: "N K415",
    name: "Ručka K415",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [15, 17, 28, 29],
  },
  {
    key: "D D800",
    name: "Dugme D800",
    kind: "dugme",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [16, 32],
  },
  {
    key: "N K990",
    name: "Ručka K990",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [18, 39, 40, 41, 147, 148],
  },
  {
    key: "N K801",
    name: "Ručka K801",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [19, 36, 128, 129, 130, 131],
  },
  {
    key: "N K785",
    name: "Ručka K785",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [22, 23, 24, 25, 26, 33, 119, 120, 121],
  },
  {
    key: "N K630",
    name: "Ručka K630",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [27, 122, 125, 126],
  },
  {
    key: "N K401",
    name: "Ručka K401",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [30, 31, 45, 46, 47, 48],
  },
  {
    key: "N K940",
    name: "Ručka K940",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [34],
  },
  {
    key: "N K400",
    name: "Ručka K400",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [35, 37, 38, 42, 43, 134],
  },
  {
    key: "N TK",
    name: "Ručka TK",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [44, 97, 98, 99, 100, 145, 146],
  },
  {
    key: "N UZ-01",
    name: "Ručka UZ-01",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [49, 50, 51, 52],
  },
  {
    key: "N UZ-Z10",
    name: "Ručka Z10",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [53, 54, 55, 56, 57, 58],
  },
  {
    key: "N UZ-06",
    name: "Ručka UZ-06",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [59, 63],
  },
  {
    key: "N UA-319",
    name: "Ručka UA-319",
    kind: "rucka",
    material: "Aluminijum",
    brand: "GTV",
    ids: [60, 69],
  },
  {
    key: "D GZ-WP1155",
    name: "Dugme 1155",
    kind: "dugme",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [61],
  },
  {
    key: "N UZ-E82",
    name: "Ručka E82",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [62, 66, 67, 210, 211, 212],
  },
  {
    key: "N UZ-07",
    name: "Ručka UZ-07",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [64, 65],
  },
  {
    key: "D DD12",
    name: "Dugme DD12",
    kind: "dugme",
    material: null,
    brand: null,
    ids: [68],
  },
  {
    key: "D GZ-ZH-011",
    name: "Dugme ZH-11",
    kind: "dugme",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [70],
  },
  {
    key: "U 217",
    name: "Ukopavajuća ručka 217",
    kind: "profil",
    material: "Aluminijum, eloksiran",
    brand: "Europrofil",
    ids: [71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 132, 133],
  },
  {
    key: "N MODEL 395",
    name: "Ručka 395",
    kind: "rucka",
    material: null,
    brand: null,
    ids: [83, 84, 248, 249, 250, 251],
  },
  {
    key: "N D-2",
    name: "Ručka D2",
    kind: "rucka",
    material: null,
    brand: "Miron",
    ids: [85, 86, 87, 88, 89, 90, 91, 92, 163],
  },
  {
    key: "N L",
    name: "Ručka L",
    kind: "rucka",
    material: null,
    brand: "Miron",
    ids: [93, 143],
  },
  {
    key: "N D-3",
    name: "Ručka D3",
    kind: "rucka",
    material: null,
    brand: "Miron",
    ids: [94, 95, 96],
  },
  {
    key: "D D275",
    name: "Dugme D275",
    kind: "dugme",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [101],
  },
  {
    key: "D D240",
    name: "Dugme D240",
    kind: "dugme",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [102],
  },
  {
    key: "N K800",
    name: "Ručka K800",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [103, 104],
  },
  {
    key: "N K860",
    name: "Ručka K860",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [105, 106],
  },
  {
    key: "N K305",
    name: "Ručka K305",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [107, 108],
  },
  {
    key: "N M275",
    name: "Ručka K275",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [109, 110],
  },
  {
    key: "N FKS",
    name: "Ručka FKS",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [111, 112],
  },
  {
    key: "N TX",
    name: "Ručka TX",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [113, 114],
  },
  {
    key: "N BK",
    name: "Ručka BK",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [115, 116],
  },
  {
    key: "N K660",
    name: "Ručka K660",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [117],
  },
  {
    key: "N K385",
    name: "Ručka K385",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [118],
  },
  {
    key: "N LUX",
    name: "Ručka Lux",
    kind: "rucka",
    material: null,
    brand: "Miron",
    ids: [123, 124, 144],
  },
  {
    key: "N FL",
    name: "Ručka FL",
    kind: "rucka",
    material: null,
    brand: "Metax",
    ids: [135],
  },
  {
    key: "N CK",
    name: "Ručka CK",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [136],
  },
  {
    key: "N K460",
    name: "Ručka K460",
    kind: "rucka",
    material: null,
    brand: "Metax",
    ids: [137],
  },
  {
    key: "N K375",
    name: "Ručka K375",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [138, 139],
  },
  {
    key: "D D625",
    name: "Dugme D625",
    kind: "dugme",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [140],
  },
  {
    key: "D D380",
    name: "Dugme D380",
    kind: "dugme",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [141],
  },
  {
    key: "N ST",
    name: "Ručka ST",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [150],
  },
  {
    key: "D UDINE",
    name: "Dugme Udine",
    kind: "dugme",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [154, 155, 156, 157, 225],
  },
  {
    key: "N UA-A3",
    name: "Ručka A3",
    kind: "rucka",
    material: "Aluminijum",
    brand: "GTV",
    ids: [158, 159, 160, 161],
  },
  {
    key: "N UZ-CAMAI",
    name: "Ručka Camaio",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "GTV",
    ids: [162, 213, 214, 215, 216, 217, 218, 219, 220, 221],
  },
  {
    key: "N S-500",
    name: "Ručka S500",
    kind: "rucka",
    material: null,
    brand: "Miron",
    ids: [164],
  },
  {
    key: "N 228",
    name: "Ručka profil 228",
    kind: "profil",
    material: "Aluminijum, eloksiran",
    brand: "Europrofil",
    ids: [
      165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179,
      180,
    ],
  },
  {
    key: "N 7834-L",
    name: "Ručka 7834 L",
    kind: "rucka",
    material: "Aluminijum, plastificiran",
    brand: "Europrofil",
    ids: [181, 182, 185, 186, 189, 190, 193, 194, 197, 199],
  },
  {
    key: "N 7836-T",
    name: "Ručka 7836 T",
    kind: "rucka",
    material: "Aluminijum, plastificiran",
    brand: "Europrofil",
    ids: [183, 184, 187, 188, 191, 192, 195, 196, 198],
  },
  {
    key: "N 230",
    name: "Ručka 230",
    kind: "rucka",
    material: "Aluminijum",
    brand: "Europrofil",
    ids: [200, 201, 202, 203, 204, 205],
  },
  {
    key: "N K174",
    name: "Ručka K174",
    kind: "rucka",
    material: "Zamak (legura cinka i aluminijuma)",
    brand: "Metax",
    ids: [206, 207, 208, 209],
  },
  {
    key: "D drvo 11",
    name: "Drveno dugme 11",
    kind: "dugme",
    material: "Drvo",
    brand: null,
    ids: [222, 223],
  },
  {
    key: "N UA-313",
    name: "Ručka UA-313",
    kind: "rucka",
    material: "Aluminijum",
    brand: "GTV",
    ids: [224],
  },
  {
    key: "N PENA T",
    name: "Ručka Pena T",
    kind: "rucka",
    material: null,
    brand: "Metax",
    ids: [226, 227, 230, 231, 234, 235, 238, 239, 242, 243],
  },
  {
    key: "N LADA L",
    name: "Ručka Lada L",
    kind: "rucka",
    material: null,
    brand: "Metax",
    ids: [228, 229, 232, 233, 236, 237, 240, 241, 244, 245],
  },
  {
    key: "N SY4025",
    name: "Ručka SY4025",
    kind: "rucka",
    material: null,
    brand: "System (TEM Mobilya)",
    ids: [246, 247],
  },
  {
    key: "N ZA30065",
    name: "Ručka ZA30065",
    kind: "rucka",
    material: null,
    brand: "Evernew",
    ids: [252, 253],
  },
  {
    key: "N ZA30017",
    name: "Ručka ZA30017",
    kind: "rucka",
    material: null,
    brand: "Evernew",
    ids: [254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265],
  },
  {
    key: "D ZA30216",
    name: "Dugme ZA30216",
    kind: "dugme",
    material: null,
    brand: "Evernew",
    ids: [266, 267],
  },
];

const MODEL_BY_HANDLE_ID = new Map(
  HANDLE_MODELS.flatMap((model) => model.ids.map((id) => [id, model] as const)),
);

export function modelForHandle(handleId: number): HandleModel | undefined {
  return MODEL_BY_HANDLE_ID.get(handleId);
}

export function handleModelSlug(model: HandleModel): string {
  return foldForSearch(model.name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const HANDLE_KIND_LABELS: Record<HandleKind, string> = {
  rucka: "Ručka",
  profil: "Profil ručka",
  dugme: "Dugme",
};

/**
 * Size from the supplier name: profile handles give their length after the
 * model number ("217/447mm"), the rest the spacing between the screw holes
 * ("ORN N 160"); knobs have neither.
 */
export function handleSize(name: string): string | null {
  const length = name.match(/\d{3}\/(\d+)\s*mm/i);
  if (length) return `Dužina ${length[1]} mm`;
  const spacing = name.match(/^ORN\s+[NU]\s+(\d+)/);
  if (spacing) return `Razmak rupa ${spacing[1]} mm`;
  return null;
}

/** Number used to order sizes within a model. */
export function handleSizeOrder(name: string): number {
  return Number(
    name.match(/\d{3}\/(\d+)\s*mm/i)?.[1] ??
      name.match(/^ORN\s+[NDU]\s+(\d+)/)?.[1] ??
      0,
  );
}

const FINISH_LABELS: Record<string, string> = {
  Mat: "Srebro mat",
  Sjaj: "Srebro sjaj",
  Crna: "Crna",
  Inox: "Inox",
  Bela: "Bela",
  Zlato: "Zlato",
  Saten: "Saten",
  SM: "Srebro mat (eloksirano)",
  SB: "Srebro sjaj (eloksirano)",
};

/**
 * The finish as customers read it. About 15 handles are stored with finish
 * "Standard"; for those the supplier name carries it (CM = crna mat, ZM =
 * zlato mat, CR = hrom sjaj, TIT = srebro sjaj per Europrofil's colour field).
 */
export function handleFinishLabel(handleName: string, finish: string): string {
  const n = handleName.toLowerCase();
  if (/crna sj\.|crni hrom/.test(n)) return "Crni hrom";
  if (finish !== "Standard") return FINISH_LABELS[finish] ?? finish;
  if (/\btit\b/.test(n)) return "Srebro sjaj";
  if (/\bcm\b/.test(n)) return "Crna mat";
  if (/\bzm\b/.test(n)) return "Zlato mat";
  if (/nikl/.test(n)) return "Brušeni nikl";
  if (/sat\./.test(n)) return "Saten";
  if (/natur/.test(n)) return "Natur";
  if (/lak/.test(n)) return "Lakirano";
  if (/\bcr\b/.test(n)) return "Hrom sjaj";
  return finish;
}
