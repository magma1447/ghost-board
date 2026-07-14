// A game option's "?" help popover: open X01 setup, expand Game options, then
// reveal the first option's info popover.
export default async function ({ page, clickText, settle, chooseGame }) {
    await clickText(page, 'New Game');
    await settle(300);
    await chooseGame(page, 'X01');
    await settle(300);
    await clickText(page, 'Game options'); // expand the collapsed options section
    await settle(300);
    // The first "?" in the DOM is in the still-collapsed Match Format section, so
    // click the first VISIBLE one (offsetParent is null while a section is hidden).
    await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.game-option-info')].find((b) => b.offsetParent !== null);
        if (btn) {
            btn.click();
        }
    });
    await settle(400);
}
