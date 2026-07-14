// X01 setup panel: open New Game, then Choose on the X01 row.
export default async function ({ page, clickText, settle, chooseGame }) {
    await clickText(page, 'New Game');
    await settle(300);
    await chooseGame(page, 'X01');
    await settle(400);
}
