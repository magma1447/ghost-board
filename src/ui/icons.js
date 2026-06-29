// App icons, sourced from lucide-static (consistent stroke icon set).
//
// SVGs are imported raw (Vite ?raw) and inlined as innerHTML. They use
// stroke="currentColor", so size and color are controlled via CSS on the
// containing button. Add a new icon by importing another lucide-static file.

import bluetooth from 'lucide-static/icons/bluetooth.svg?raw';
import settings from 'lucide-static/icons/settings.svg?raw';

export const icons = { bluetooth, settings };
