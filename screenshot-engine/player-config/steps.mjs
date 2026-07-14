// The player management menu: open Players from the top bar.
export default async function ({ page, clickText, settle }) {
    await clickText(page, 'Players');
    await settle(400);
}
