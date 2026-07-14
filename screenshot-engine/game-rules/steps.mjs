// The rules dialog: from X01 setup, open Rules.
export default async function ({ page, clickText, click, settle, chooseGame }) {
    await clickText(page, 'New Game');
    await settle(300);
    await chooseGame(page, 'X01');
    await settle(300);
    await click(page, '.game-setup-rules');
    await settle(400);
}
