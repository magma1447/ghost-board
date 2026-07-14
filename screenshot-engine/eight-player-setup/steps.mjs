// An 8-player individual line-up (humans + AI at mixed levels) in X01 setup.
export default async function ({ page, clickText, settle, chooseGame }) {
    await clickText(page, 'New Game');
    await settle(300);
    await chooseGame(page, 'X01');
    await settle(400);
}
