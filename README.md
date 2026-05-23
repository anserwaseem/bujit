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
- **Amount presets**: Quick-tap your most common amounts
- **Voice input**: Speak your expenses hands-free
- **Swipe-to-backdate**: Swipe the date pill to quickly log yesterday's expenses

### One-Tap Everything

- **Long-press to repeat**: Hold the submit button to repeat your last transaction
- **Double-tap to duplicate**: Double-tap any transaction to copy it for today
- **Quick-add pills**: Your frequent expenses, one tap away
- **Tap to categorize**: Single tap to toggle Need/Want classification

### Smart Learning

- **Auto-learn necessity**: Bujit remembers how you categorize items
- **Pattern recognition**: Suggests categories based on your 70%+ usage patterns
- **Frequency-based presets**: Amount buttons adapt to your spending habits

### Visual Delight

- **"Today: X transactions" counter**: Always know your daily activity
- **Animated empty state**: Helpful tips that rotate to guide new users
- **Smooth animations**: Every interaction feels polished
- **Beautiful dark/light modes**: Easy on the eyes, day or night

### Powerful Dashboard

- **Monthly overview**: Track expenses, income, needs vs wants
- **Category breakdown**: See where your money goes
- **AI-powered insights**: Chat with Gemini about your spending habits

## 🛠 Tech Stack

- **React 18** - UI framework
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

## 📝 Input Format

The natural language parser accepts flexible input:

```
[reason] [payment mode] [amount]
```

**Examples:**

- `Coffee CC 150` - Coffee paid by Credit Card, Rs.150
- `Lunch Cash 500` - Lunch paid by Cash, Rs.500
- `Uber D 350` - Uber paid by Debit Card, Rs.350

**Default payment modes:**
| Shorthand | Full Name |
|-----------|-----------|
| C | Cash |
| CC | Credit Card |
| D | Debit |

You can add custom payment modes in Settings.

## 🎨 Design Philosophy

- **Minimal clicks**: Every action should take 1-2 taps maximum
- **Progressive disclosure**: Advanced features hidden until needed
- **Mobile-first**: Designed for on-the-go use
- **Instant feedback**: Every action shows immediate visual response

## ⌨️ Keyboard Shortcuts (Desktop)

- `Enter` - Submit transaction
- `Escape` - Close dialogs / clear input

## 🔒 Privacy

All data is stored locally in your browser's localStorage. Nothing is sent to any server.

## 📊 Need/Want Categorization

Bujit helps you understand your spending habits with simple categorization:

- **Need** 🔵 - Essential expenses (groceries, rent, utilities)
- **Want** 🟡 - Non-essential expenses (entertainment, dining out)
- **Uncategorized** - Tap the dot to categorize anytime

## 📄 License

MIT License - feel free to use and modify.

---

**Bujit** - Because budgets don't have to be boring. 💚
