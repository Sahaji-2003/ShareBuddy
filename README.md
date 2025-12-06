<p align="center">
  <img src="screenshots/logo.png" alt="ShareBuddy Logo" width="120" />
</p>

<h1 align="center">ShareBuddy</h1>

<p align="center">
  <strong>🚀 Share files instantly with a 4-digit code</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Free-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#admin-access">Admin Access</a>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🔢 4-Digit Code Login** | No accounts needed - just enter a code to access your project |
| **📁 File Sharing** | Upload and download files of any size |
| **📝 Super Paste** | Handle 10M+ lines of text without crashing |
| **♾️ Unlimited File Size** | Automatic chunking for files > 45MB |
| **📊 Progress Tracking** | Animated progress bar with ETA for uploads/downloads |
| **1️⃣ GB Free Storage** | No credit card required |
| **🛡️ Admin Mode** | Hidden admin access to manage all projects |
| **🔄 Live Refresh** | Instantly sync files across devices |

---

## 📸 Screenshots

> 📂 **Place your screenshots in the `screenshots/` folder**

<details>
<summary>Click to view screenshots</summary>

### Code Entry
![Code Entry](screenshots/code-entry.png)

### Home - Repository List
![Home](screenshots/home.png)

### Repository - File List  
![Repository](screenshots/repo-page.png)

### Upload Progress
![Upload Progress](screenshots/upload-progress.png)

### Download Progress
![Download Progress](screenshots/download-progress.png)

</details>

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/ShareBuddy.git
cd ShareBuddy
npm install
```

### 2. Setup Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run this SQL in the SQL Editor:

```sql
-- Create tables
CREATE TABLE projects (
    code TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT REFERENCES projects(code),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
    project_code TEXT REFERENCES projects(code),
    name TEXT NOT NULL,
    type TEXT,
    size BIGINT DEFAULT 0,
    storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_chunked BOOLEAN DEFAULT FALSE,
    chunk_count INTEGER,
    parent_file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    chunk_index INTEGER
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Public access" ON projects FOR ALL USING (true);
CREATE POLICY "Public access" ON repos FOR ALL USING (true);
CREATE POLICY "Public access" ON files FOR ALL USING (true);
```

3. Create a storage bucket named `files` with public access

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI Framework |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool |
| **Tailwind CSS** | Styling |
| **Supabase** | Database & Storage |
| **Lucide React** | Icons |

---

## 🛡️ Admin Access

Access admin mode to view and manage all projects:

| Field | Value |
|-------|-------|
| **Code** | `1977` |
| **Password** | `2003` |

Admin features:
- View all repositories across all projects
- Delete any repository
- Monitor storage usage

---

## 📁 Project Structure

```
ShareBuddy/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts
│   ├── lib/            # Database & utilities
│   └── pages/          # Page components
├── screenshots/        # 📸 Put your screenshots here
└── ...
```

---

## 📄 License

MIT © [Your Name](https://github.com/yourusername)

---

<p align="center">
  Made with ❤️ using React & Supabase
</p>
