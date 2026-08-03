# Athenaeum — Library Management System

A modern, fully responsive Library Management System built with **plain HTML, CSS, and vanilla JavaScript** — no frameworks, no build step. All data lives in the browser's Local Storage, so your library persists across page refreshes.

![No frameworks](https://img.shields.io/badge/frameworks-none-2F5233) ![Vanilla JS](https://img.shields.io/badge/javascript-vanilla-B08D57)

## Features

- **Dashboard** — animated summary cards (total books, available, borrowed, categories), recently added titles, and favorites.
- **Book management (CRUD)** — add, edit, delete, and view full details for every book, with client-side validation on required fields.
- **Search & filter** — live search by title or author, filter by category and availability, and sort by title, author, or published year.
- **Borrow & return** — one click to borrow or return a book, with automatic status and date tracking.
- **Categories** — add, edit, and delete categories, each showing a live book count, color-coded like book spines on a shelf.
- **Statistics** — pie and bar charts (via Chart.js) for books per category and available vs. borrowed, plus a recently-added feed.
- **Dark / light mode** — toggle in the sidebar, settings page, or with `Alt`+`T`; the choice is remembered.
- **Import / export** — back up your whole library as JSON and restore it later; download a plain-text report; print the current book list.
- **Polished UX** — modals for add/edit, confirmation dialogs before deleting, toast notifications, pagination (10 books per page), empty states, keyboard shortcuts, and a scroll-to-top button.

## Getting started

No installation or build tools required.

1. Download or clone this folder.
2. Open `index.html` directly in a modern browser (Chrome, Edge, Firefox, Safari).
3. Start adding books — everything is saved automatically to Local Storage on this device/browser.

> Font Awesome and Chart.js are loaded from a CDN, so an internet connection is needed the first time a page loads those assets.

## Folder structure

```
library-management/
│── index.html      Markup for every page (dashboard, books, categories, statistics, settings)
│── style.css        Design tokens, layout, components, dark mode, responsive rules, print styles
│── script.js        App state, storage helpers, rendering, CRUD, charts, import/export
│── README.md
└── assets/
    ├── images/
    └── icons/
```

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus the book search box |
| `N` | Open "Add a book" |
| `Alt` + `T` | Toggle dark / light mode |
| `Esc` | Close any open dialog |

## Data model

Each book is stored as an object with: `id`, `title`, `author`, `category`, `isbn`, `publisher`, `year`, `language`, `pages`, `shelf`, `description`, `cover` (base64 data URL, optional), `status` (`Available` / `Borrowed`), `createdAt`, `borrowedDate`, `returnedDate`.

Each category is stored as: `id`, `name`, `color`.

Seven default categories are created the first time the app runs: Programming, Science, Fiction, History, Technology, Biography, Others. You're free to rename, recolor, or delete any of them.

## Notes on cover images

Cover images are stored as base64 inside Local Storage for full offline persistence with no server. Keep covers under 2MB — the app will warn you if a file is too large. Local Storage has a browser-enforced size limit (usually 5–10MB total), so a very large photo library of covers may eventually hit that ceiling; use Export regularly as a backup.

## Browser support

Built with standard, widely supported Web APIs (Local Storage, FileReader, Blob, ES6+ JavaScript). Works in all evergreen browsers. No Internet Explorer support.

## License

Free to use, modify, and extend for personal or educational projects.