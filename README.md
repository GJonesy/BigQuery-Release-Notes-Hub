# BigQuery Release Notes Hub 🚀

A modern, responsive web application built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that fetches official Google Cloud BigQuery release notes, parses individual updates, and enables you to edit and share updates directly to X (formerly Twitter).

---

## ✨ Features

* **🔄 Smart Feed Processing**: Fetches and parses the official BigQuery Atom feed. Google groups a day's releases into a single entry; this app automatically splits them into individual, categorizable update cards (e.g. Features, Issues, Deprecations).
* **⚡ Double-Layer Caching**: Caches feed responses locally (`feed_cache.json`) for 10 minutes to maintain instant load times and prevent Google feed rate-limits, with a force-refresh trigger.
* **🔍 Responsive Search & Filters**: Search keywords dynamically across dates, types, or descriptions, or filter notes by clicking category chips or top statistics counts.
* **🐦 Premium Tweet Composer**: 
  * Select any update card to open a custom composer modal.
  * Auto-generates a post structure with the date, badge, and source link.
  * Accounts for X's link-counting policies (URLs standardizing to 23 characters).
  * Features an SVG circular progress meter that changes colors (Cyan ➡️ Yellow ➡️ Red) as you reach the 280-character limit.
  * One-click clipboard copy with active feedback.

---

## 🛠️ Technology Stack

* **Backend**: Python 3, Flask, Requests, XML ElementTree
* **Frontend**: Vanilla HTML5, CSS3 (variables, ambient gradients, keyframe animations), Vanilla ES6 JavaScript

---

## 🚀 Getting Started

### Prerequisites

Ensure you have Python 3.x installed on your computer.

### Installation

1. Clone or download this project to your local machine:
   ```bash
   git clone https://github.com/GJonesy/BigQuery-Release-Notes-Hub.git
   cd BigQuery-Release-Notes-Hub
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install the required dependencies:
   ```bash
   pip install flask requests
   ```

### Running Locally

Start the Flask development server:
```bash
python app.py
```

The application will start running at **[http://localhost:5002](http://localhost:5002)**. Open this address in your web browser.

---

## 📂 Project Structure

```text
├── app.py                  # Flask application entrypoint & RSS parsing engine
├── feed_cache.json         # Local 10-minute cache file (auto-generated)
├── templates/
│   └── index.html          # Core HTML template, inline SVGs, and Modal UI
├── static/
│   ├── css/
│   │   └── style.css       # Custom stylesheets, responsive grid, and dark theme
│   └── js/
│       └── app.js          # Controller handling filter state, API calls, and tweet composer
├── .gitignore              # Tells git which directories/files to ignore
└── README.md               # Project guide and documentation
```

---

## 📝 License

This project is open-source and available under the MIT License.
