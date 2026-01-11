# Bass Hub

A comprehensive fishing gear and trip management application built with Electron.

## Features

- **Gear Catalog**: Manage your fishing rods, reels, lures, line, and terminal tackle
- **Trip Planning**: Log and plan fishing trips with location mapping
- **Quick Links**: Save useful fishing resources and websites
- **Smart Add**: Extract gear details automatically from product URLs

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory (use `.env.example` as a template):
   ```bash
   cp .env.example .env
   ```

4. Add your Google Maps API key to the `.env` file:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

### Development

Start the development server:
```bash
npm start
```

### Building

Package the application:
```bash
npm run package
```

Create distributable installers:
```bash
npm run make
```

## Environment Variables

- `GOOGLE_MAPS_API_KEY`: Required for trip location mapping features

## Project Structure

```
bass-hub/
├── src/
│   ├── components/     # React components
│   ├── assets/         # Images and static files
│   ├── db.js          # Database layer
│   ├── main.js        # Electron main process
│   ├── preload.js     # Preload script
│   ├── renderer.jsx   # React entry point
│   └── index.css      # Global styles
├── .env               # Environment variables (not in git)
├── .env.example       # Environment template
└── package.json
```

## Security

- API keys are stored in `.env` file (gitignored)
- Never commit the `.env` file to version control
- Use `.env.example` as a template for required variables

## License

MIT
