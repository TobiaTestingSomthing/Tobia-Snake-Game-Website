# 🐍 Neon Snake - Deployment Guide (Render)

Diese Anleitung zeigt dir, wie du dein Spiel in wenigen Minuten auf **Render.com** veröffentlichst.

## 🚀 Schnellanleitung (Blueprint)

Render erkennt die beigefügte `render.yaml` Datei automatisch.

1. Lade deinen Code auf ein **GitHub Repository** hoch.
2. Logge dich bei [Render.com](https://dashboard.render.com/) ein.
3. Klicke auf **"New +"** und wähle **"Blueprint"**.
4. Verbinde dein GitHub-Konto und wähle dein Snake-Repository aus.
5. Bestätige die Konfiguration. Render wird das Spiel automatisch unter einer `.onrender.com` URL bereitstellen.

## 🛠️ Manuelle Einrichtung (Alternative)

Falls du keine Blueprint nutzen möchtest:

1. Klicke auf **"New +"** -> **"Static Site"**.
2. Wähle dein Repository aus.
3. Konfiguriere die folgenden Einstellungen:
   - **Name:** `neon-snake-game`
   - **Build Command:** (leer lassen)
   - **Publish Directory:** `.` (ein Punkt)
4. Klicke auf **"Create Static Site"**.

## 📁 Wichtige Hinweise
- Stelle sicher, dass `index.html`, `snake.js`, `snake.css` und alle Bilder (`.png`) im Hauptverzeichnis liegen.
- Render aktualisiert deine Website automatisch, sobald du neuen Code in deinen GitHub `main` Branch pushst.

Viel Erfolg bei deinem Highscore! 🎮
