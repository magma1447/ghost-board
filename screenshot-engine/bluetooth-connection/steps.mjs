// The Bluetooth connection dropdown: click the connection icon (top-right).
export default async function ({ page, click, settle }) {
    await click(page, '.conn-btn');
    await settle(400);
}
