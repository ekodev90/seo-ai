import type { AuditRule } from "../types";
import { metaRule } from "./meta";
import { headingsRule } from "./headings";
import { imagesRule } from "./images";
import { contentRule } from "./content";
import { schemaRule } from "./schema";
import { technicalRule } from "./technical";
import { mobileRule } from "./mobile";
import { cwvRule } from "./cwv";

export const ALL_RULES: AuditRule[] = [
  metaRule,
  headingsRule,
  imagesRule,
  contentRule,
  schemaRule,
  technicalRule,
  mobileRule,
  cwvRule,
];

export { metaRule, headingsRule, imagesRule, contentRule, schemaRule, technicalRule, mobileRule, cwvRule };
