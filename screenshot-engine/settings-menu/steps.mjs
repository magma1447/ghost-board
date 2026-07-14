// The settings dropdown: open it (gear, top-right) and expand the Audio group
// so the shot shows real settings (sound theme, callouts), not just headers.
export default async function ({ page, click, clickText, settle }) {
    await click(page, '[title="Settings"]');
    await settle(300);
    await clickText(page, 'Audio');
    await settle(400);
}
