/** Run with: npx tsx src/lib/geo.test.ts */
import { haversineKm, nearestDestination } from "./geo";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "ok:  " : "FAIL:"} ${label}`);
  if (!ok) failures++;
}

const parisLondon = haversineKm(48.8566, 2.3522, 51.5074, -0.1278);
check("Paris-London is ~344 km", Math.abs(parisLondon - 344) < 5);
check("distance to self is 0", haversineKm(10, 10, 10, 10) === 0);

const delhi = nearestDestination(28.6139, 77.209);
check("nearest destination to New Delhi is Bali", delhi.destination.city === "Bali");
const sf = nearestDestination(37.7749, -122.4194);
check("nearest destination to San Francisco is Los Angeles", sf.destination.city === "Los Angeles");
const valencia = nearestDestination(39.4699, -0.3763);
check("nearest destination to Valencia is Barcelona", valencia.destination.city === "Barcelona");

console.log();
if (failures) { console.log(`${failures} FAILED`); process.exit(1); } else console.log("All geo tests passed.");
