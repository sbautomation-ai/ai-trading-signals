# On-Demand Trading Signals

A modern web application for generating AI-powered trading signals with intelligent risk management calculations.

## Features

- **AI-Powered Signal Generation**: Get instant trading signals for various instruments
- **Risk Management**: Automatic calculation of position sizing based on account size and risk percentage
- **Multiple Instruments**: Support for Forex, Gold (XAUUSD), and Cryptocurrency pairs
- **Real-Time Price Data**: Optional integration with Alpha Vantage API for live prices
- **Comprehensive Position Details**: View recommended lot sizes, profit potential, and risk:reward ratios

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with dark theme
- **Backend**: Netlify Functions
- **API Integration**: Alpha Vantage (optional)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up Alpha Vantage API key:
   - Get a free API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Create a `.env` file in the root directory:
     ```
     ALPHA_VANTAGE_KEY=your_api_key_here
     ```

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building

Build for production:
```bash
npm run build
```

### Deployment

#### Option 1: GitHub Pages (Recommended for Frontend)

This app is configured for automatic deployment to GitHub Pages:

1. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **GitHub Actions**
   - Save the settings

2. **Configure API URL (if using Netlify Functions):**
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `VITE_API_URL`
   - Value: Your Netlify function URL (e.g., `https://your-site.netlify.app/.netlify/functions/generate-signal`)
   - Click **Add secret**

3. **Push to main branch:**
   - The GitHub Actions workflow will automatically build and deploy
   - Your site will be available at: `https://your-username.github.io/ai-trading-signals/`

**Note:** If your repository name is different, update the `base` path in `vite.config.ts`.

#### Option 2: Manual GitHub Pages Deployment

You can also deploy manually using the npm script:

```bash
npm run deploy:gh-pages
```

This will build the app and push it to the `gh-pages` branch.

#### Option 3: Netlify Deployment

For full-stack deployment (including serverless functions):

1. Push your code to a Git repository
2. Connect the repository to Netlify
3. Set the `ALPHA_VANTAGE_KEY` environment variable in Netlify dashboard (optional)
4. Deploy!

The `netlify.toml` file is already configured with the correct settings.

**Note:** GitHub Pages only serves static files, so if you deploy to GitHub Pages, you'll need to keep your Netlify Functions on Netlify and configure the `VITE_API_URL` secret to point to your Netlify function URL.

## Usage

1. Enter a trading symbol (e.g., XAUUSD, EURUSD, BTCUSD)
2. Specify your account size in USD
3. Set your desired risk percentage per trade
4. Click "Generate Signal" to get an AI-powered trading signal

The signal will include:
- Buy/Sell direction
- Entry, Stop Loss, and Take Profit levels (TP1 and TP2)
- Recommended lot size and units
- Position details with profit potential and risk:reward ratios

## Instrument Support

- **Forex**: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD (1 lot = 100,000 units)
- **Gold**: XAUUSD, GOLD (1 lot = 100 oz)
- **Crypto**: BTCUSD, ETHUSD, BTCUSDT, ETHUSDT (1 lot = 1 unit)

## Disclaimer

⚠️ **This tool provides trading signals for informational purposes only and does not constitute financial advice. Trading involves substantial risk of loss. Past performance is not indicative of future results. Always conduct your own research and consult with a qualified financial advisor before making trading decisions.**

## License

MIT

