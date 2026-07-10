// App icons, sourced from lucide-static (consistent stroke icon set).
//
// SVGs are imported raw (Vite ?raw) and inlined as innerHTML. They use
// stroke="currentColor", so size and color are controlled via CSS on the
// containing button. Add a new icon by importing another lucide-static file.

import bluetooth from 'lucide-static/icons/bluetooth.svg?raw';
import bookOpen from 'lucide-static/icons/book-open.svg?raw';
import gripVertical from 'lucide-static/icons/grip-vertical.svg?raw';
import heart from 'lucide-static/icons/heart.svg?raw';
import settings from 'lucide-static/icons/settings.svg?raw';
import target from 'lucide-static/icons/target.svg?raw';
import user from 'lucide-static/icons/user.svg?raw';

export const icons = { bluetooth, bookOpen, gripVertical, heart, settings, target, user };
