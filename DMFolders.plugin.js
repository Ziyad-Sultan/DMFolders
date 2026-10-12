/**
 * @name DMArchive
 * @author Ziyad Sultan
 * @description An "Archived" row pinned above your DMs, styled like a normal DM
 * @version 0.1.0
 */

const ITEM = '[data-list-item-id^="private-channels"]';
const ARCHIVE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>';

module.exports = class DMArchive {
    start() {
        this.queued = false;
        this.observer = new MutationObserver(() => this.queueRefresh());
        this.observer.observe(document.body, { childList: true, subtree: true });
        this.refresh();
    }

    queueRefresh() {
        if (this.queued) return;
        this.queued = true;
        requestAnimationFrame(() => {
            this.queued = false;
            this.refresh();
        });
    }

    // real DM rows only (their ids end in a long number)
    getRows() {
        return [...document.querySelectorAll(ITEM)]
            .filter(el => /(\d{15,})$/.test(el.getAttribute("data-list-item-id")))
            .map(el => ({ el, li: el.closest("li") ?? el }));
    }

    makeRow(templateLi) {
        const row = templateLi.cloneNode(true);

        // so Discord and other plugins don't mistake this for a real DM
        [row, ...row.querySelectorAll("[data-list-item-id]")].forEach(el => el.removeAttribute("data-list-item-id"));
        row.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
        row.id = "dma-row";

        // no navigation, no close/pin buttons
        row.querySelectorAll("a").forEach(a => a.removeAttribute("href"));
        row.querySelectorAll('button, [class*="closeButton"]').forEach(el => el.remove());

        // archive icon instead of a profile picture
        const avatar = row.querySelector('[class*="avatar_"]');
        if (avatar) {
            const size = templateLi.querySelector('[class*="avatar_"]')?.getBoundingClientRect().width || 32;
            avatar.innerHTML = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#4e5058;color:#fff;display:flex;align-items:center;justify-content:center;">${ARCHIVE_SVG}</div>`;
        }

        // text
        const name = row.querySelector('[class*="name_"]');
        if (name) name.textContent = "Archived";
        const sub = row.querySelector('[class*="subText_"]');
        if (sub) sub.textContent = "0 chats";

        row.style.cursor = "pointer";
        row.addEventListener("click", ev => {
            ev.preventDefault();
            ev.stopPropagation();
            BdApi.UI.showToast("Archived row clicked", { type: "info" });
        }, true);
        return row;
    }

    refresh() {
        const rows = this.getRows();
        if (!rows.length) return;

        const anchor = rows[0].li;
        // copy the look of a row that isn't highlighted as the open chat
        const template = rows.find(r => !/selected/i.test(r.li.className + " " + r.el.className)) ?? rows[0];

        let row = document.getElementById("dma-row");
        if (!row) row = this.makeRow(template.li);
        if (row.nextElementSibling !== anchor) anchor.parentElement.insertBefore(row, anchor);
    }

    stop() {
        this.observer?.disconnect();
        document.getElementById("dma-row")?.remove();
    }
};
