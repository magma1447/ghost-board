// The win celebration overlay: the seeded X01 leg leaves Ghost on 40 (a clean
// double-out), so a debug throw at D20 lands the winning double and triggers
// the full-screen win animation. storage.json is written by generate-states.mjs.
export default async function ({ page, clickSegment, settle }) {
    await clickSegment(page, 'D', 20);
    await settle(600);
}
