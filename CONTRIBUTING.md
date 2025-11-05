# Contributing to FES Mobile

Thanks for helping build this project! Follow these steps to keep our workflow smooth.

---

## Branching Model
- **main** → stable, protected (never commit directly)  
- **dev** → integration branch, where feature branches merge  
- **feature/*** → short-lived branches for work (e.g. `feature/ble-scan`)  

---

## 🛠️ Workflow
1. Start from latest `dev`:
   ```bash
   git checkout dev
   git pull
   git checkout -b feature/<short-name>
