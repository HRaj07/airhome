/** Run with: npx tsx src/lib/i18n.test.ts */
import { UI, CONTENT, translate, translateContent, langFromCode } from "./i18n";
let fails = 0;
const ph = /\{[a-z]+\}/g;
for (const [lang, dict] of Object.entries(UI)) {
  for (const [k, v] of Object.entries(dict)) {
    const a = (k.match(ph) || []).sort().join(","), b = (v.match(ph) || []).sort().join(",");
    if (a !== b) { console.log(`FAIL ${lang}: placeholder mismatch for "${k}"`); fails++; }
  }
}
if (translate("hi", "Become a host") !== "होस्ट बनें") { console.log("FAIL hi lookup"); fails++; }
if (translate("es", "for {n} nights", { n: 3 }) !== "por 3 noches") { console.log("FAIL placeholder subst"); fails++; }
if (translate("de", "Some unknown key") !== "Some unknown key") { console.log("FAIL fallback"); fails++; }
if (langFromCode("pt-BR") !== "pt" || langFromCode("cs-CZ") !== "en") { console.log("FAIL langFromCode"); fails++; }
const seedDesc = "Welcome to this beautifully maintained space, thoughtfully designed for both relaxation and productivity. You'll have access to a fully equipped kitchen, fast wifi, and a comfortable living area. The neighborhood is walkable, with cafes, restaurants, and public transit just minutes away. Perfect for couples, families, or solo travelers looking to experience the city like a local.";
for (const lang of Object.keys(CONTENT)) { const [, ok] = translateContent(lang as any, seedDesc); if (!ok) { console.log(`FAIL content ${lang}`); fails++; } }
if (translateContent("fr", "custom host text")[1] !== false) { console.log("FAIL content passthrough"); fails++; }
console.log(fails ? `${fails} FAILED` : `All i18n tests passed (${Object.keys(UI).length} UI languages, ${Object.keys(CONTENT).length} content languages).`);
process.exit(fails ? 1 : 0);
