# 📺 IPTV Player pour Google TV

Un lecteur IPTV moderne et élégant, optimisé pour Google TV avec une interface "10-foot UI".

## ✨ Fonctionnalités

- 📂 **Support M3U/M3U8** - Chargez vos playlists depuis un fichier local ou une URL
- 🔌 **API Xtream Codes** - Connectez-vous à votre fournisseur IPTV
- 📺 **Player HLS** - Lecture fluide des flux HLS, MP4, et plus
- 🎮 **Navigation TV** - Interface optimisée pour les télécommandes (D-pad)
- ❤️ **Favoris** - Sauvegardez vos chaînes préférées
- 🔍 **Recherche** - Trouvez rapidement vos chaînes
- 📁 **Catégories** - Organisation par groupes/catégories
- 💾 **Stockage local** - Vos playlists et préférences sont sauvegardées

## 🚀 Installation

```bash
# Cloner le repo
cd iptv

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

L'application sera disponible sur `http://localhost:3000`

## 🎮 Navigation clavier

| Touche | Action |
|--------|--------|
| ↑ ↓ ← → | Naviguer |
| Enter / Espace | Sélectionner / Play-Pause |
| Escape | Retour |
| ⌘K | Rechercher |
| F | Ajouter/Retirer des favoris |

## 📱 Stack technique

- **React 18** avec TypeScript
- **Vite** pour le build rapide
- **Tailwind CSS** pour le styling
- **HLS.js** pour la lecture vidéo
- **LocalStorage** pour la persistance

## 📂 Structure du projet

```
src/
├── components/
│   ├── ChannelList.tsx    # Liste des chaînes (grille/liste)
│   ├── VideoPlayer.tsx    # Lecteur vidéo HLS
│   ├── CategoryFilter.tsx # Filtres par catégorie
│   ├── SearchBar.tsx      # Barre de recherche
│   └── Settings.tsx       # Modal paramètres
├── parsers/
│   ├── m3uParser.ts       # Parser M3U/M3U8
│   └── xtreamApi.ts       # Client API Xtream
├── hooks/
│   ├── useKeyboardNav.ts  # Navigation clavier
│   └── useStorage.ts      # Stockage local
├── types/
│   └── channel.types.ts   # Types TypeScript
└── App.tsx                # Application principale
```

## 🔧 Configuration

### Variables d'environnement (optionnel)

Créez un fichier `.env` si nécessaire :

```env
VITE_DEFAULT_PLAYLIST_URL=https://example.com/playlist.m3u
```

## 📺 Optimisations Google TV

L'interface est conçue selon les principes "10-foot UI" :

- ✅ Grandes polices lisibles à distance
- ✅ Cartes larges avec focus visible
- ✅ Navigation au D-pad intuitive
- ✅ Pas d'effets hover (remplacés par focus)
- ✅ Contraste élevé pour la lisibilité
- ✅ Animations fluides mais non distrayantes

## 🔜 Prochaines étapes

Pour convertir en application Android TV :

1. Utiliser Capacitor ou Cordova
2. Ou créer une PWA et l'empaqueter
3. Ou porter vers React Native TV

## 📄 Licence

MIT - Utilisez librement pour vos projets personnels.

---

Développé avec ❤️ pour les amateurs d'IPTV

