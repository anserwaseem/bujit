# Bujit - Stupidly Simple Budgeting

> Track expenses like taking notes. Just type and go.

## 🎯 The Problem

Most budgeting apps are overwhelming:

- Too many fields to fill
- Steep learning curves
- Friction that kills the habit
- Visual clutter everywhere

**Result:** People give up within a week.

## 💡 The Solution

**Bujit** makes expense tracking as simple as taking notes:

```
Coffee CC 150
```

That's it. Type what you spent, how you paid, and the amount. Done in 3 seconds.

## 👥 Who It's For

- **First-time budgeters** who find finance apps intimidating
- **Busy professionals** who need to log expenses on the go
- **Students** tracking limited budgets
- **Anyone who's quit other budgeting apps** because they were too complex

## ✨ Features

### Zero-Friction Entry

- **Natural language input**: Type `Grocery CC 9500` instead of filling forms
- **Smart auto-complete**: Suggestions based on your history as you type
- **Math in amounts**: Type `250+180` and Bujit evaluates it for you
- **Amount presets**: Quick-tap your most common amounts
- **Voice input**: Speak your expenses hands-free
- **Swipe-to-backdate**: Swipe the date pill to quickly log yesterday's expenses
- **Goal tagging**: Link a transaction to a savings, debt, or loan goal

### One-Tap Everything

- **Long-press to repeat**: Hold the submit button to repeat your last transaction
- **Double-tap to duplicate**: Double-tap any transaction to copy it for today
- **Quick-add pills**: Your frequent expenses, one tap away
- **Tap to categorize**: Single tap to toggle Need/Want classification

### Smart Learning

- **Auto-learn necessity**: Bujit remembers how you categorize items
- **Pattern recognition**: Suggests categories based on your 70%+ usage patterns
- **Frequency-based presets**: Amount buttons adapt to your spending habits
- **Anomaly hints**: Flags unusually large entries compared to your history

### Goals

Track long-running pots without a separate “transfer” type:

- **Savings** — income adds, expenses subtract (net balance)
- **Owe** — track paying back a debt
- **Owed** — track money lent out

Tag transactions with a goal as you log them, or attach a goal to a recurring rule so auto-created entries count too.

### Recurring Transactions

Schedule rent, subscriptions, salary, and other repeating entries in **Settings → Recurring**:

- Daily, weekly, monthly, or yearly cadences
- Clear schedule labels (day-of-month for monthly, start date for others)
- Due rules fire when you open the app or save a rule
- Optional goal linking on the template

### Powerful Dashboard

- **Monthly overview**: Track expenses, income, needs vs wants
- **Category breakdown**: See where your money goes
- **Goals card**: Progress toward savings and debt targets
- **Streaks**: No-expense and spending streaks to build the habit
- **Customizable layout**: Drag cards to match how you think about money

### Backup & Export

- **CSV import/export**: Move data in or out anytime (Settings → Data)
- **Google Sheets sync** (optional): Back up transactions to a sheet you control (Settings → Sync)
- **Auto-sync**: Push new transactions to Sheets when online, if enabled

## 🛠 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Lightning-fast builds
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **Recharts** - Data visualization
- **PWA** - Install as a native-like app

## 📱 Progressive Web App

Bujit is a PWA, meaning you can:

- Install it on your home screen
- Use it offline
- Get native app-like experience
- No app store required

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/anserwaseem/bujit

# Navigate to project
cd bujit

# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server listens on port **8080**. Open `http://localhost:8080` on your machine.

### Test on your phone (same Wi‑Fi)

Vite exposes the app on your LAN so you can use it from iOS/Android:

1. Run `npm run dev`
2. Open the **Network** URL Vite prints (e.g. `http://192.168.x.x:8080`) on your phone

Works over HTTP on local IPs — no HTTPS required for local dev.

### Optional: Google Sheets sync

Create a `.env` file in the project root:

```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

Then configure sync in the app under **Settings → Sync**. Without this, everything else still works locally.

### Scripts

| Command            | Description             |
| ------------------ | ----------------------- |
| `npm run dev`      | Start dev server        |
| `npm run build`    | Lint + production build |
| `npm run verify`   | Typecheck               |
| `npm run lint`     | ESLint                  |
| `npm run test:run` | Run tests once          |

## 📝 Input Format

The natural language parser accepts flexible input:

```
[reason] [payment mode] [amount]
```

**Examples:**

- `Coffee CC 150` - Coffee paid by Credit Card, Rs.150
- `Lunch Cash 500` - Lunch paid by Cash, Rs.500
- `Uber D 350` - Uber paid by Debit Card, Rs.350
- `Groceries CC 1200+850` - Amounts with simple math

**Default payment modes:**

| Shorthand | Full Name   |
| --------- | ----------- |
| C         | Cash        |
| CC        | Credit Card |
| D         | Debit       |

You can add custom payment modes in Settings.

## 🎨 Design Philosophy

- **Minimal clicks**: Every action should take 1-2 taps maximum
- **Progressive disclosure**: Advanced features hidden until needed
- **Mobile-first**: Designed for on-the-go use
- **Instant feedback**: Every action shows immediate visual response

## 🔒 Privacy & Data

**Local-first.** Transactions, goals, recurring rules, settings, and dashboard layout live in your browser’s `localStorage`. The app works fully offline.

**Optional cloud backup.** If you turn on Google Sheets sync, only **transactions** are sent to Google — and only when you connect a sheet and sync (manually or via auto-sync). Goal links (`goalId`) are not included in the sheet export.

| Data              | Stored locally | Google Sheets |
| ----------------- | -------------- | ------------- |
| Transactions      | ✅             | ✅ (optional) |
| Goals             | ✅             | ❌            |
| Recurring rules   | ✅             | ❌            |
| Settings & layout | ✅             | ❌            |

Nothing else is sent to a Bujit server — there isn’t one.

## 📊 Need/Want Categorization

Bujit helps you understand your spending habits with simple categorization:

- **Need** 🔵 - Essential expenses (groceries, rent, utilities)
- **Want** 🟡 - Non-essential expenses (entertainment, dining out)
- **Uncategorized** - Tap the dot to categorize anytime

## 📄 License

MIT License - feel free to use and modify.

---

**Bujit** - Because budgets don't have to be boring. 💚
