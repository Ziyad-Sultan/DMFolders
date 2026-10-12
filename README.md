# DMFolders

**Organize your Discord DMs into folders.**

Discord has no way to group direct messages. If you talk to coworkers, friends and group chats in the same list, everything ends up mixed together. **DMFolders** is a [BetterDiscord](https://betterdiscord.app) plugin that adds a row of tabs above your DM list, so you can sort conversations into folders like **Work**, **Friends** and **GCs**, and switch between them with one click.

These are not browser-style tabs. Each tab is a folder, and it filters your DM list to the conversations inside it.

<!-- Add a screenshot or GIF here, for example: ![DMFolders preview](screenshots/preview.png) -->

## Features

- **Folder tabs above your DMs**: `All`, `Unread`, and your own folders (`Work`, `Friends` and `GCs` are created for you).
- **Built-in Unread tab**: automatically lists every DM and group chat with unread messages. It's permanent and can't be deleted.
- **Unread badges** on every tab, which turn red when a chat in that folder has a mention.
- **Right-click a DM or group chat** and use **Add to folder** at the top of the menu.
- **Right-click a folder tab** to:
  - **Add DMs…**: pick from a list showing each person's profile picture and display name (your friend nickname is used if you set one).
  - **Rename**, **Duplicate folder** or **Delete folder**.
- **Settings panel** (the ⚙️ next to the plugin) to create folders and manage which DMs are in each one.
- **Remembers your last tab** when you restart Discord.
- **Many folders? No problem.** The tab row scrolls sideways with a thin scrollbar or the mouse wheel.
- **Only the DM list scrolls.** Friends, Nitro, Shop, Quests and your tabs stay pinned at the top.

## Installation

1. Install [BetterDiscord](https://betterdiscord.app) if you haven't already.
2. Download [`DMFolders.plugin.js`](DMFolders.plugin.js) from this repository.
3. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**, and put the file in that folder.
4. Enable **DMFolders** in the plugin list.

## Usage

| I want to… | Do this |
| --- | --- |
| Put a DM in a folder | Right-click the DM → **Add to folder** → tick a folder |
| Add several DMs at once | Right-click a folder tab → **Add DMs…** and click the chats you want |
| Create a folder | Plugin settings → **New folder**, or right-click the **All** tab → **New folder** |
| Rename, duplicate or delete a folder | Right-click its tab |
| See only unread chats | Click the **Unread** tab |

Deleting a folder never deletes your DMs. A folder only stores which conversations belong to it.

## How it works

DMFolders doesn't change your messages or your account. It adds a tab bar to the DM sidebar and hides the rows that aren't in the selected folder. Your folders are saved locally on your computer using BetterDiscord's plugin storage, and nothing is sent anywhere.

## Known limitations

- DMFolders relies on parts of Discord's interface that aren't public, so a Discord update can occasionally break something. If that happens, please open an issue.
- The Unread tab uses Discord's own unread state, so a chat disappears from it once you open and read it.
- Folders hold DMs and group chats only, not servers.

## Disclaimer

DMFolders is an unofficial plugin and is not affiliated with or endorsed by Discord. Client modifications such as BetterDiscord are not supported by Discord and may go against its Terms of Service, so use this plugin at your own risk.

## Contributing

Bug reports, ideas and pull requests are welcome. If something looks wrong after a Discord update, open an issue and include your BetterDiscord version and a screenshot.

## Author

Made by **Ziyad Sultan**.

## License

[MIT](LICENSE)
