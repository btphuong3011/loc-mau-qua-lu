"use strict";

(() => {
  const model = window.floodCare;
  const { days, patients, slots, trips, scenarios, sessions } = model;
  const byId = (id) => document.getElementById(id);
  const schedule = byId("schedule");
  const editDialog = byId("edit-dialog");
  const handoffDialog = byId("handoff-dialog");
  const suggestionDialog = byId("suggestion-dialog");
  const editForm = byId("edit-form");
  let scenario = "facility";
  let plans = model.initialPlans();
  let pendingOnly = false;
  let comparing = false;
  let suggestion = null;
  let editing = null;
  let draft = null;
  const statusLabel = { ready: "Đã thu xếp", pending: "Chưa có phương án", review: "Cần xếp lại" };

  function announce(message) {
    byId("updates").textContent = message;
  }

  function badge(status) {
    return `<span class="status-pill ${status}"><i aria-hidden="true"></i>${statusLabel[status]}</span>`;
  }

  function avatar(person) {
    return `<span class="avatar ${person.color}" aria-hidden="true">${person.initial}</span>`;
  }

  function describePlan(plan) {
    return `${slots[plan.slot].name}, ${slots[plan.slot].time} · ${trips[plan.trip].name}, đón lúc ${trips[plan.trip].time}.`;
  }

  function compareChange(before, after, oldPlan, newPlan) {
    if (before !== "ready" && after === "ready") return { label: "Đã nối lại", tone: "gain" };
    if (before === "ready" && after !== "ready") return { label: "Mất phương án", tone: "loss" };
    if (before === "ready" && (oldPlan.slot !== newPlan.slot || oldPlan.trip !== newPlan.trip)) {
      return { label: "Đã đổi phương án", tone: "shift" };
    }
    return null;
  }

  function card(day, person, statuses, baseline, original) {
    const key = `${day.id}-${person.id}`;
    const status = statuses[key];
    const plan = plans[key];
    if (pendingOnly && status === "ready") return '<div class="track-stop folded" aria-hidden="true"><span class="track-marker"></span></div>';
    const change = comparing ? compareChange(baseline[key], status, original[key], plan) : null;
    const detail = status === "review" ? model.planBlock(key, plan, plans, scenario) : "Chọn chỗ lọc và chuyến đi";
    const before = baseline[key] === "ready"
      ? `${slots[original[key].slot].time} · ${slots[original[key].slot].name.replace("Cơ sở ", "")} · ${trips[original[key].trip].time} đón`
      : statusLabel[baseline[key]];
    return `<div class="track-stop ${status} ${change?.tone ?? ""}">
      <span class="track-marker" aria-hidden="true"></span>
      <button class="session ${status}" type="button" data-session="${key}" aria-label="${person.name}, ${day.title}, ${statusLabel[status]}">
        <span class="session-day">${day.title}</span>
        ${status === "ready"
          ? `<span class="session-time">${slots[plan.slot].time}</span><span class="session-detail">${slots[plan.slot].name.replace("Cơ sở ", "")} · ${trips[plan.trip].time} đón</span>`
          : `<span class="session-open">${statusLabel[status]}</span><span class="session-detail">${detail}</span>`}
        ${change ? `<span class="change-pill ${change.tone}">${change.label}</span>` : ""}
      </button>
      ${change ? `<p class="compare-before"><strong>Ban đầu</strong> · ${before}</p>` : ""}
    </div>`;
  }

  function countReady(statuses) {
    return Object.values(statuses).filter((status) => status === "ready").length;
  }

  function render() {
    const statuses = model.reviewPlans(plans, scenario);
    const original = model.initialPlans();
    const baseline = model.reviewPlans(original, scenario);
    const total = Object.keys(statuses).length;
    const count = countReady(statuses);
    byId("incident-title").textContent = scenarios[scenario].title;
    byId("incident-description").textContent = scenarios[scenario].detail;
    for (const button of byId("scenarios").children) {
      button.setAttribute("aria-pressed", String(button.dataset.scenario === scenario));
    }
    byId("filter-all").setAttribute("aria-pressed", String(!pendingOnly));
    byId("filter-pending").setAttribute("aria-pressed", String(pendingOnly));
    byId("compare").setAttribute("aria-pressed", String(comparing));

    const baselineCount = countReady(baseline);
    byId("compare-metrics").hidden = !comparing;
    byId("compare-metrics").innerHTML = `<span>Đầu kịch bản <strong>${baselineCount}/${total}</strong></span>
      <span>Hiện tại <strong>${count}/${total}</strong></span>
      <span class="delta ${count < baselineCount ? "negative" : ""}">${count > baselineCount ? "+" : ""}${count - baselineCount} buổi</span>`;
    const rows = patients.filter((person) =>
      !pendingOnly || days.some((day) => statuses[`${day.id}-${person.id}`] !== "ready"));
    schedule.innerHTML = rows.length
      ? `<div class="track-heading" aria-hidden="true"><span>NGƯỜI BỆNH</span>${days.map((day) => `<span>${day.title}</span>`).join("")}</div>
        ${rows.map((person) => `<section class="track-row ${person.color}" aria-labelledby="track-${person.id}">
          <header class="track-person">${avatar(person)}<div><h3 id="track-${person.id}">${person.name}</h3><small>${person.area}</small></div></header>
          ${days.map((day) => card(day, person, statuses, baseline, original)).join("")}
        </section>`).join("")}`
      : '<p class="track-empty">Cả tuần đã có phương án cho mọi buổi.</p>';

    byId("progress-number").textContent = count;
    byId("progress-total").textContent = `/ ${total}`;
    byId("progress-detail").textContent = count === total ? "Đã đủ lịch dự phòng" : `${total - count} buổi cần xử lý`;
    byId("progress").setAttribute("aria-valuenow", count);
    byId("progress").style.setProperty("--fill", `${(count / total) * 100}%`);
    byId("people").innerHTML = patients.map((person) => {
      const ready = days.map((day) => statuses[`${day.id}-${person.id}`] === "ready");
      const count = ready.filter(Boolean).length;
      return `<li>${avatar(person)}<div><strong>${person.name}</strong><small>${count}/${days.length} buổi đã thu xếp</small></div>
        <span class="person-track" aria-hidden="true">${ready.map((done) => `<i class="${done ? "done" : ""}"></i>`).join("")}</span></li>`;
    }).join("");
  }

  function option(type, id, item, reason, selected) {
    return `<label class="option">
      <input type="radio" name="${type}" value="${id}" ${selected ? "checked" : ""} ${reason ? "disabled" : ""}>
      <span><strong>${item.name}</strong><small>${reason || (type === "slot" ? "Còn chỗ" : "Đến trước giờ hẹn")}</small></span>
      <b>${item.time}</b>
    </label>`;
  }

  function renderTrips() {
    if (!draft.slot) {
      byId("trip-options").innerHTML = '<p class="dialog-note">Chọn chỗ lọc để xem các chuyến đi.</p>';
      return;
    }
    const facility = slots[draft.slot].facility;
    byId("trip-options").innerHTML = Object.entries(trips)
      .filter(([, trip]) => trip.facility === facility)
      .map(([id, trip]) => option("trip", id, trip, model.tripBlock(editing, id, draft.slot, plans, scenario), draft.trip === id))
      .join("");
  }

  function updateConfirmation() {
    const reason = model.planBlock(editing, draft, plans, scenario);
    byId("confirm-plan").disabled = Boolean(reason);
    byId("plan-message").textContent = reason || "Có chỗ lọc và chuyến đi phù hợp.";
    byId("plan-message").classList.toggle("valid", !reason);
  }

  function openSession(key) {
    editing = key;
    const { day, patient } = sessions[key];
    const person = patients.find((item) => item.id === patient);
    byId("edit-day").textContent = `${days.find((item) => item.id === day).title} · ${person.area}`;
    byId("edit-title").textContent = person.name;
    draft = { ...plans[key] };
    byId("slot-options").innerHTML = Object.entries(slots)
      .map(([id, slot]) => option("slot", id, slot, model.slotBlock(key, id, plans), draft.slot === id))
      .join("");
    byId("clear-plan").hidden = !plans[key];
    renderTrips();
    updateConfirmation();
    editDialog.showModal();
  }

  function returnToSession(key) {
    const card = schedule.querySelector(`[data-session="${key}"]`);
    if (card) card.focus({ preventScroll: true });
    else byId("filter-pending").focus({ preventScroll: true });
  }

  function handoffRows() {
    const statuses = model.reviewPlans(plans, scenario);
    return days.flatMap((day) => patients.map((person) => {
      const key = `${day.id}-${person.id}`;
      const plan = plans[key];
      const status = statuses[key];
      const detail = status === "ready"
        ? describePlan(plan)
        : status === "review"
          ? `${model.planBlock(key, plan, plans, scenario)} Đầu mối điều phối cần xác nhận lại.`
          : "Đầu mối điều phối cần xác nhận chỗ lọc và chuyến đi.";
      return { day: day.title, person: person.name, status, detail };
    }));
  }

  function openHandoff() {
    const rows = handoffRows();
    const open = rows.filter(({ status }) => status !== "ready").length;
    byId("handoff-content").innerHTML = `<p class="handoff-lede">${scenarios[scenario].title} · ${open} buổi cần xử lý</p>
      <ul class="handoff-list">${rows.map((row) => `<li><div><strong>${row.day} · ${row.person}</strong>${badge(row.status)}</div><p>${row.detail}</p></li>`).join("")}</ul>`;
    handoffDialog.showModal();
  }

  function sessionName(key) {
    const { day, patient } = sessions[key];
    return `${days.find((item) => item.id === day).title} · ${patients.find((item) => item.id === patient).name}`;
  }

  function openSuggestion() {
    suggestion = model.suggestPlans(plans, scenario);
    const { changes, unplaced } = suggestion;
    const completed = countReady(model.reviewPlans(suggestion.plans, scenario));
    byId("suggestion-scenario").textContent = scenarios[scenario].label;
    byId("suggestion-content").innerHTML = `
      <div class="suggestion-overview">
        <strong>${completed}/${Object.keys(sessions).length}</strong>
        <div><b>${changes.length ? `Có thể xếp thêm ${changes.length} buổi` : "Đã rà các phương án còn lại"}.</b>
        <p>Các buổi đã thu xếp được giữ nguyên.</p></div>
      </div>
      ${changes.length ? `<ul class="handoff-list">${changes.map((key) => `<li><div><strong>${sessionName(key)}</strong>
        <span class="change-pill gain">Có phương án</span></div><p>${describePlan(suggestion.plans[key])}</p></li>`).join("")}</ul>` : ""}
      ${unplaced.length ? `<h3 class="unplaced-title">Vẫn cần xử lý</h3><ul class="handoff-list">${unplaced.map(({ key, reason, released }) =>
        `<li><div><strong>${sessionName(key)}</strong></div><p>${reason}${released && changes.length ? " Áp dụng sẽ bỏ phương án gián đoạn." : ""}</p></li>`).join("")}</ul>` : ""}
      ${!changes.length && !unplaced.length ? "<p>Cả tuần đã có chỗ lọc và chuyến đi phù hợp.</p>" : ""}`;
    byId("apply-suggestion").hidden = changes.length === 0;
    suggestionDialog.showModal();
  }

  function downloadHandoff() {
    const lines = handoffRows().map((row) =>
      `${row.day} · ${row.person}\n${statusLabel[row.status]} — ${row.detail}`);
    const body = ["LỌC MÁU QUA LŨ · PHIẾU BÀN GIAO", "Dữ liệu hư cấu cho mục đích mô phỏng.", scenarios[scenario].title, ...lines].join("\n\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", body], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "loc-mau-qua-lu-phieu-ban-giao.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  byId("scenarios").innerHTML = Object.entries(scenarios).map(([id, item]) =>
    `<button type="button" data-scenario="${id}" aria-pressed="false">${item.label}</button>`).join("");

  byId("scenarios").addEventListener("click", (event) => {
    const button = event.target.closest("[data-scenario]");
    if (!button || button.dataset.scenario === scenario) return;
    scenario = button.dataset.scenario;
    render();
    const reviews = Object.values(model.reviewPlans(plans, scenario)).filter((status) => status === "review").length;
    announce(`${scenarios[scenario].title}. ${reviews} buổi cần xếp lại.`);
  });

  for (const [id, pending] of [["filter-all", false], ["filter-pending", true]]) {
    byId(id).addEventListener("click", () => {
      pendingOnly = pending;
      render();
    });
  }

  byId("reset").addEventListener("click", () => {
    scenario = "facility";
    plans = model.initialPlans();
    pendingOnly = false;
    comparing = false;
    render();
    announce("Đã khôi phục tình huống ban đầu.");
  });

  byId("compare").addEventListener("click", () => {
    comparing = !comparing;
    if (comparing) pendingOnly = false;
    render();
    announce(comparing ? "Đang so sánh với phương án ban đầu trong cùng tình huống." : "Đã tắt so sánh.");
  });

  byId("suggest").addEventListener("click", openSuggestion);
  byId("apply-suggestion").addEventListener("click", () => {
    plans = suggestion.plans;
    const count = suggestion.changes.length;
    pendingOnly = false;
    comparing = true;
    suggestionDialog.close();
    render();
    announce(`Đã xếp thêm ${count} buổi trong mô phỏng.`);
  });

  schedule.addEventListener("click", (event) => {
    const button = event.target.closest("[data-session]");
    if (button) openSession(button.dataset.session);
  });

  editDialog.addEventListener("close", () => {
    returnToSession(editing);
    editing = null;
    draft = null;
  });

  editForm.addEventListener("change", (event) => {
    const { name, value } = event.target;
    if (name === "slot") {
      draft.slot = value;
      if (draft.trip && model.tripBlock(editing, draft.trip, value, plans, scenario)) delete draft.trip;
      renderTrips();
    }
    if (name === "trip") draft.trip = value;
    updateConfirmation();
  });

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (model.planBlock(editing, draft, plans, scenario)) return;
    plans[editing] = { ...draft };
    editDialog.close();
    render();
    announce("Đã xác nhận phương án cho buổi lọc.");
  });

  byId("clear-plan").addEventListener("click", () => {
    delete plans[editing];
    editDialog.close();
    render();
    announce("Đã bỏ phương án của buổi lọc.");
  });

  byId("handoff").addEventListener("click", openHandoff);
  byId("download-handoff").addEventListener("click", downloadHandoff);
  render();
})();
