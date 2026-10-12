/**
 * @name DMFolders
 * @author Ziyad Sultan
 * @description Organize your DMs into folders with unread badges
 * @version 3.0.0
 * @source https://github.com/Ziyad-Sultan/DMFolders/
 */

const ITEM = '[data-list-item-id^="private-channels"]';

const BTN_STYLE = "padding:4px 10px;border-radius:6px;border:none;cursor:pointer;background:#5865f2;color:#ffffff;";
const DANGER_STYLE = "padding:4px 10px;border-radius:6px;border:none;cursor:pointer;background:#da373c;color:#ffffff;";
const TAB_BASE = "flex:0 0 auto;white-space:nowrap;display:flex;align-items:center;gap:6px;padding:6px 12px;border:none;border-bottom:2px solid transparent;border-radius:6px 6px 0 0;cursor:pointer;background:transparent;color:#b5bac1;font-weight:600;font-size:13px;transition:all .15s;";
const TAB_ACTIVE = "color:#ffffff;border-bottom:2px solid #5865f2;background:rgba(88,101,242,.15);";
const BADGE_BASE = "min-width:16px;padding:0 5px;border-radius:8px;font-size:11px;line-height:16px;text-align:center;color:#ffffff;";

module.exports = class DMFolders {
    start() {
        this.folders = BdApi.Data.load("DMFolders", "folders") ?? { Work: [], Friends: [], GCs: [] };

        const saved = BdApi.Data.load("DMFolders", "active");
        this.active = saved && (saved === "Unread" || this.folders[saved]) ? saved : null; // null = "All"
        this.queued = false;
        this.panelEl = null;
        this.renderPanel = null;

        // makes the scrollbar start right under the tabs
        this.pinned = new Set();
        const style = document.createElement("style");
        style.id = "dmf-style";
        style.textContent = "[data-dmf-scroller]::-webkit-scrollbar-track{margin-top:var(--dmf-top,0px);}#dmf-bar{scrollbar-width:thin;scrollbar-color:#4e5058 transparent;}";
        document.head.append(style);

        // right-click on a DM / group chat: "Add to folder" at the very TOP
        this.menuPatch = (tree, props) => {
            const channel = props?.channel;
            if (!channel?.id) return;
            if (channel.type !== 1 && channel.type !== 3) return; // 1 = DM, 3 = group chat
            if (!Array.isArray(tree?.props?.children)) return;

            const names = Object.keys(this.folders);
            if (!names.length) return;

            const items = names.map(name => ({
                type: "toggle",
                id: "dmf-" + name,
                label: name,
                checked: this.folders[name].includes(channel.id),
                action: () => this.toggleDM(name, channel.id)
            }));

            tree.props.children.unshift(
                BdApi.ContextMenu.buildItem({ type: "submenu", label: "Add to folder", items }),
                BdApi.ContextMenu.buildItem({ type: "separator" })
            );
        };
        BdApi.ContextMenu.patch("user-context", this.menuPatch);
        BdApi.ContextMenu.patch("gdm-context", this.menuPatch);

        this.observer = new MutationObserver(() => this.queueRefresh());
        this.observer.observe(document.body, { childList: true, subtree: true });
        this.refresh();
    }

    // ---------- data helpers ----------
    save() {
        BdApi.Data.save("DMFolders", "folders", this.folders);
        document.getElementById("dmf-bar")?.remove(); // rebuild the bar with the new folder list
        this.refresh();
        if (this.panelEl?.isConnected) this.renderPanel?.(); // refresh the settings panel if it's open
    }

    setActive(name) {
        this.active = name;
        BdApi.Data.save("DMFolders", "active", this.active);
        this.refresh();
    }

    toggleDM(folderName, id) {
        const list = this.folders[folderName];
        if (!list) return;
        const i = list.indexOf(id);
        i === -1 ? list.push(id) : list.splice(i, 1);
        this.save();
    }

    createFolder(name) {
        name = (name ?? "").trim();
        if (!name) return;
        if (name === "All" || name === "Unread" || this.folders[name]) {
            BdApi.UI.showToast("That folder name is already taken", { type: "error" });
            return;
        }
        this.folders[name] = [];
        this.save();
    }

    renameFolder(oldName, newName) {
        newName = (newName ?? "").trim();
        if (!newName || newName === oldName) return;
        if (newName === "All" || newName === "Unread" || this.folders[newName]) {
            BdApi.UI.showToast("That folder name is already taken", { type: "error" });
            return;
        }
        const rebuilt = {};
        Object.keys(this.folders).forEach(k => {
            rebuilt[k === oldName ? newName : k] = this.folders[k];
        });
        this.folders = rebuilt;
        if (this.active === oldName) {
            this.active = newName;
            BdApi.Data.save("DMFolders", "active", this.active);
        }
        this.save();
    }

    duplicateFolder(name) {
        let copy = name + " copy";
        let n = 2;
        while (copy === "All" || this.folders[copy]) copy = `${name} copy ${n++}`;

        const rebuilt = {};
        Object.keys(this.folders).forEach(k => {
            rebuilt[k] = this.folders[k];
            if (k === name) rebuilt[copy] = [...this.folders[name]]; // placed right after the original
        });
        this.folders = rebuilt;
        this.save();
    }

    deleteFolder(name) {
        delete this.folders[name];
        if (this.active === name) this.setActive(null);
        this.save();
    }

    // display name + avatar for a DM or group chat
    getInfo(id) {
        const ChannelStore = BdApi.Webpack.getStore("ChannelStore");
        const UserStore = BdApi.Webpack.getStore("UserStore");
        const RelationshipStore = BdApi.Webpack.getStore("RelationshipStore");
        const ch = ChannelStore.getChannel(id);
        if (!ch) return { name: id, avatar: null };

        const nameOf = uid => {
            const u = UserStore.getUser(uid);
            if (!u) return null;
            return RelationshipStore?.getNickname?.(uid) || u.globalName || u.username;
        };
        const avatarOf = uid => {
            try { return UserStore.getUser(uid)?.getAvatarURL?.(undefined, 40, false) ?? null; }
            catch { return null; }
        };

        if (ch.type === 1) { // 1-on-1 DM
            const uid = ch.recipients?.[0];
            return { name: nameOf(uid) || id, avatar: avatarOf(uid) };
        }
        const names = (ch.recipients || []).map(uid => nameOf(uid)).filter(Boolean);
        return {
            name: ch.name || names.join(", ") || id,
            avatar: ch.icon ? `https://cdn.discordapp.com/channel-icons/${ch.id}/${ch.icon}.png?size=40` : null
        };
    }

    unreadInfo(ids) {
        const RS = BdApi.Webpack.getStore("ReadStateStore");
        let unread = 0, mentions = 0;
        ids.forEach(id => {
            if (RS?.hasUnread?.(id)) unread++;
            mentions += RS?.getMentionCount?.(id) ?? 0;
        });
        return { unread, mentions };
    }

    // ---------- popups (Discord's own modals, so typing works) ----------
    askName(title, initial, onSubmit) {
        const React = BdApi.React;
        let value = initial;
        const NameInput = () => {
            const [v, setV] = React.useState(initial);
            return React.createElement("input", {
                value: v,
                autoFocus: true,
                placeholder: "Folder name",
                style: { width: "100%", padding: "8px", boxSizing: "border-box", background: "#1e1f22", color: "#ffffff", border: "none", borderRadius: "4px" },
                onChange: e => { value = e.target.value; setV(e.target.value); }
            });
        };
        BdApi.UI.showConfirmationModal(title, React.createElement(NameInput), {
            confirmText: "Save",
            cancelText: "Cancel",
            onConfirm: () => onSubmit(value)
        });
    }

    promptCreate() {
        this.askName("New folder", "", n => this.createFolder(n));
    }

    promptRename(name) {
        this.askName(`Rename "${name}"`, name, n => this.renameFolder(name, n));
    }

    confirmDelete(name) {
        BdApi.UI.showConfirmationModal("Delete folder", `Delete "${name}"? Your DMs are not deleted.`, {
            confirmText: "Delete",
            danger: true,
            onConfirm: () => this.deleteFolder(name)
        });
    }

    // picker: every DM with its picture + display name, click to add/remove
    openPicker(folderName) {
        const React = BdApi.React;
        const e = React.createElement;
        const self = this;

        const Avatar = ({ info }) => info.avatar
            ? e("img", { src: info.avatar, style: { width: 32, height: 32, borderRadius: "50%", objectFit: "cover" } })
            : e("div", { style: { width: 32, height: 32, borderRadius: "50%", background: "#5865f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 } },
                (info.name[0] ?? "?").toUpperCase());

        const Picker = () => {
            const [, force] = React.useReducer(x => x + 1, 0);
            const ids = BdApi.Webpack.getStore("PrivateChannelSortStore").getPrivateChannelIds();
            return e("div", { style: { maxHeight: "340px", overflowY: "auto" } },
                ids.map(id => {
                    const info = self.getInfo(id);
                    const inside = !!self.folders[folderName]?.includes(id);
                    return e("div", {
                        key: id,
                        onClick: () => { self.toggleDM(folderName, id); force(); },
                        style: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px", cursor: "pointer", borderRadius: "6px", color: "#ffffff", background: inside ? "rgba(88,101,242,.2)" : "transparent" }
                    },
                        e(Avatar, { info }),
                        e("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, info.name),
                        e("span", { style: { color: inside ? "#5865f2" : "#80848e", fontWeight: 700 } }, inside ? "✓" : "+")
                    );
                })
            );
        };

        BdApi.UI.showConfirmationModal(`Add DMs to "${folderName}"`, e(Picker), { confirmText: "Done" });
    }

    // right-click menu on a folder tab
    openTabMenu(event, name) {
        const menu = (name === "All" || name === "Unread")
            ? [{ type: "text", id: "dmf-new", label: "New folder", action: () => this.promptCreate() }]
            : [
                { type: "text", id: "dmf-add", label: "Add DMs…", action: () => this.openPicker(name) },
                { type: "separator" },
                { type: "text", id: "dmf-rename", label: "Rename", action: () => this.promptRename(name) },
                { type: "text", id: "dmf-dup", label: "Duplicate folder", action: () => this.duplicateFolder(name) },
                { type: "separator" },
                { type: "text", id: "dmf-del", label: "Delete folder", danger: true, action: () => this.confirmDelete(name) }
            ];
        BdApi.ContextMenu.open(event, BdApi.ContextMenu.buildMenu(menu));
    }

    // ---------- the tab bar in the DM list ----------
    makeBar() {
        const bar = document.createElement("div");
        bar.id = "dmf-bar";
        bar.style.cssText = "display:flex;flex-wrap:nowrap;gap:4px;padding:8px 8px 0;overflow-x:auto;overflow-y:hidden;border-bottom:1px solid #2b2d31;";
// scroll the tabs sideways with the mouse wheel when they don't all fit
bar.addEventListener("wheel", ev => {
    if (bar.scrollWidth > bar.clientWidth && ev.deltaY) {
        bar.scrollLeft += ev.deltaY;
        ev.preventDefault();
    }
}, { passive: false });

        ["All", "Unread", ...Object.keys(this.folders)].forEach(name => {
            const b = document.createElement("button");
            b.dataset.tab = name;
            b.style.cssText = TAB_BASE;

            const label = document.createElement("span");
            label.textContent = name;
            const badge = document.createElement("span");
            badge.className = "dmf-badge";
            badge.style.cssText = BADGE_BASE + "display:none;";
            b.append(label, badge);

            b.onclick = () => this.setActive(name === "All" ? null : name);
            b.oncontextmenu = ev => {
                ev.preventDefault();
                this.openTabMenu(ev, name);
            };
            bar.append(b);
        });
        return bar;
    }

    updateBar() {
        const activeName = this.active ?? "All";
        const allIds = BdApi.Webpack.getStore("PrivateChannelSortStore")?.getPrivateChannelIds?.() ?? [];

        document.querySelectorAll("#dmf-bar button").forEach(b => {
            const name = b.dataset.tab;
            b.style.cssText = TAB_BASE + (name === activeName ? TAB_ACTIVE : "");

            const ids = (name === "All" || name === "Unread") ? allIds : (this.folders[name] ?? []);
            const { unread, mentions } = this.unreadInfo(ids);
            const badge = b.querySelector(".dmf-badge");
            const text = unread > 0 ? String(unread) : "";
            if (badge.textContent !== text) badge.textContent = text;
            badge.style.cssText = BADGE_BASE + (unread > 0
                ? `display:inline-block;background:${mentions > 0 ? "#da373c" : "#4e5058"};`
                : "display:none;");
        });
    }

    // first opaque background colour found going up the page (so pinned rows aren't see-through)
    solidBg(el) {
        for (let n = el; n; n = n.parentElement) {
            const c = getComputedStyle(n).backgroundColor;
            const m = c.match(/[\d.]+/g);
            if (m && (m.length < 4 || parseFloat(m[3]) > 0.95)) return c;
        }
        return "#000";
    }

    unpin() {
        this.pinned?.forEach(el => {
            ["position", "top", "z-index", "background"].forEach(p => el.style.removeProperty(p));
        });
        this.pinned?.clear();
    }

    // pin everything above the DM rows, so only the DMs scroll under the tabs
    layout() {
        const bar = document.getElementById("dmf-bar");
        const scroller = bar?.closest('[class*="scroller"]');
        if (!scroller) return;

        this.unpin();
        scroller.dataset.dmfScroller = "1";

        // everything above the tabs, level by level, from the scroller down to the bar
        const path = [];
        for (let n = bar; n && n !== scroller; n = n.parentElement) path.unshift(n);
        const targets = [];
        path.forEach(node => {
            for (let sib = node.parentElement.firstElementChild; sib && sib !== node; sib = sib.nextElementSibling) {
                const pos = getComputedStyle(sib).position;
                if (pos !== "absolute" && pos !== "fixed") targets.push(sib);
            }
        });
        targets.push(bar);

        // measure while nothing is pinned, then pin each one where it already sits
        const base = scroller.getBoundingClientRect().top - scroller.scrollTop;
        const bg = this.solidBg(scroller);
        const spots = targets.map(el => {
            const r = el.getBoundingClientRect();
            return { el, top: r.top - base, h: r.height };
        });
        spots.forEach(({ el, top, h }) => {
            if (h === 0) return;
            el.style.position = "sticky";
            el.style.top = top + "px";
            el.style.zIndex = "5";
            el.style.background = bg;
            this.pinned.add(el);
        });

        // the scrollbar starts right under the tabs
        const last = spots[spots.length - 1];
        scroller.style.setProperty("--dmf-top", (last.top + last.h) + "px");
    }

    queueRefresh() {
        if (this.queued) return;
        this.queued = true;
        requestAnimationFrame(() => {
            this.queued = false;
            this.refresh();
        });
    }

    refresh() {
        const rows = [...document.querySelectorAll(ITEM)].map(el => ({
            el,
            // real DMs end in a long number; Friends / Nitro / Shop buttons don't
            id: el.getAttribute("data-list-item-id").match(/(\d{15,})$/)?.[1]
        }));
        const firstDM = rows.find(r => r.id);
        if (!firstDM) return;

        // keep the tab bar directly above the first DM
        const anchor = firstDM.el.closest("li") ?? firstDM.el;
        let bar = document.getElementById("dmf-bar");
        if (!bar) bar = this.makeBar();
        if (bar.nextElementSibling !== anchor) anchor.parentElement.insertBefore(bar, anchor);

        this.updateBar();

        const RS = BdApi.Webpack.getStore("ReadStateStore");

        rows.forEach(({ el, id }) => {
            let show;
            if (!this.active || !id) show = true;
            else if (this.active === "Unread") show = !!RS?.hasUnread?.(id);
            else show = !!this.folders[this.active]?.includes(id);
            const row = el.closest("li") ?? el;
            row.style.display = show ? "" : "none";
        });

        this.layout();
    }

    // ---------- the settings panel (the ⚙️ button) ----------
    makeAvatarEl(info) {
        if (info.avatar) {
            const img = document.createElement("img");
            img.src = info.avatar;
            img.style.cssText = "width:28px;height:28px;border-radius:50%;object-fit:cover;";
            return img;
        }
        const d = document.createElement("div");
        d.textContent = (info.name[0] ?? "?").toUpperCase();
        d.style.cssText = "width:28px;height:28px;border-radius:50%;background:#5865f2;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;";
        return d;
    }

    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.style.padding = "16px";
        this.panelEl = panel;

        const btn = (text, style, onclick) => {
            const b = document.createElement("button");
            b.textContent = text;
            b.style.cssText = style;
            b.onclick = onclick;
            return b;
        };

        const render = () => {
            panel.innerHTML = "";

            const top = document.createElement("div");
            top.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:20px;color:#b5bac1;font-size:13px;";
            top.append(
                btn("New folder", BTN_STYLE, () => this.promptCreate()),
                "Tip: you can also right-click a folder tab in your DM list."
            );
            panel.append(top);

            Object.keys(this.folders).forEach(folderName => {
                const section = document.createElement("div");
                section.style.marginBottom = "24px";

                const header = document.createElement("div");
                header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:8px;";
                const title = document.createElement("h3");
                title.textContent = folderName;
                title.style.cssText = "color:#ffffff;flex:1;margin:0;";
                header.append(
                    title,
                    btn("Add DMs", BTN_STYLE, () => this.openPicker(folderName)),
                    btn("Duplicate", BTN_STYLE, () => this.duplicateFolder(folderName)),
                    btn("Delete", DANGER_STYLE, () => this.confirmDelete(folderName))
                );
                section.append(header);

                if (!this.folders[folderName].length) {
                    const empty = document.createElement("div");
                    empty.textContent = "No DMs in this folder yet";
                    empty.style.cssText = "color:#80848e;padding:4px 0;";
                    section.append(empty);
                }

                this.folders[folderName].forEach(id => {
                    const info = this.getInfo(id);
                    const row = document.createElement("div");
                    row.style.cssText = "display:flex;align-items:center;gap:10px;padding:4px 0;color:#ffffff;";
                    const label = document.createElement("span");
                    label.textContent = info.name;
                    label.style.flex = "1";
                    row.append(
                        this.makeAvatarEl(info),
                        label,
                        btn("Remove", BTN_STYLE, () => this.toggleDM(folderName, id))
                    );
                    section.append(row);
                });

                panel.append(section);
            });
        };

        this.renderPanel = render;
        render();
        return panel;
    }

    stop() {
        this.observer?.disconnect();
        BdApi.ContextMenu.unpatch("user-context", this.menuPatch);
        BdApi.ContextMenu.unpatch("gdm-context", this.menuPatch);
        document.getElementById("dmf-bar")?.remove();
        document.querySelectorAll(ITEM).forEach(el => {
            el.style.display = "";
            const row = el.closest("li");
            if (row) row.style.display = "";
        });
        this.unpin();
        document.getElementById("dmf-style")?.remove();
        document.querySelectorAll("[data-dmf-scroller]").forEach(s => {
            delete s.dataset.dmfScroller;
            s.style.removeProperty("--dmf-top");
        });
        this.panelEl = null;
        this.renderPanel = null;
    }
};
