// The game picker: from the app (booted via #/app), open New Game to reveal the
// game list.
export default async function ({ page, clickText, settle }) {
    await clickText(page, 'New Game');
    await settle(400);
}
