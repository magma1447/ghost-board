// Team setup: uneven teams (3 v 2), each mixing humans and AI. Seeded lastTeams
// makes the roster open straight into team mode.
export default async function ({ page, clickText, settle, chooseGame }) {
    await clickText(page, 'New Game');
    await settle(300);
    await chooseGame(page, 'X01');
    await settle(400);
}
